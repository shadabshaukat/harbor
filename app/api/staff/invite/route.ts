import crypto from "node:crypto";
import { z } from "zod";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { emitDebugEvent } from "@/lib/debug/events";

const inviteSchema = z.object({
  invited_email: z.string().email(),
  role: z.enum(["manager", "staff", "contractor"]),
  store_id: z.string().uuid().nullable().optional(),
  expires_days: z.number().int().min(1).max(30).default(7)
});

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users_profile")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !["owner", "manager"].includes(profile.role)) {
    emitDebugEvent({
      level: "warn",
      source: "api",
      message: "Employee invite rejected by role",
      details: { role: profile?.role ?? null }
    });
    return NextResponse.json({ error: "Only owners and managers can invite employees" }, { status: 403 });
  }

  const payload = await request.json();
  const parsed = inviteSchema.safeParse(payload);

  if (!parsed.success) {
    emitDebugEvent({
      level: "warn",
      source: "api",
      message: "Employee invite validation failed",
      details: { error: parsed.error.flatten() }
    });
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  emitDebugEvent({
    level: "info",
    source: "api",
    message: "Employee invite creation requested",
    details: { tenantId: profile.tenant_id, role: parsed.data.role, invitedEmail: parsed.data.invited_email }
  });

  const code = crypto.randomBytes(20).toString("hex");
  const expiresAt = new Date(Date.now() + parsed.data.expires_days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("staff_invites")
    .insert({
      tenant_id: profile.tenant_id,
      store_id: parsed.data.store_id ?? null,
      invited_email: parsed.data.invited_email.toLowerCase(),
      role: parsed.data.role,
      invite_code: code,
      expires_at: expiresAt,
      invited_by: user.id,
      status: "pending"
    })
    .select("id, invited_email, role, invite_code, expires_at, status")
    .single();

  if (error) {
    emitDebugEvent({
      level: "error",
      source: "api",
      message: "Employee invite creation failed",
      details: { tenantId: profile.tenant_id, error: error.message }
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  emitDebugEvent({
    level: "info",
    source: "api",
    message: "Employee invite creation completed",
    details: { inviteId: data.id, tenantId: profile.tenant_id, role: data.role }
  });

  return NextResponse.json(
    {
      invite: {
        ...data,
        invite_url: `${requestUrl.origin}/invite/${data.invite_code}`
      }
    },
    { status: 201 }
  );
}
