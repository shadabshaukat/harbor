import { z } from "zod";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emitDebugEvent } from "@/lib/debug/events";

const acceptSchema = z.object({
  code: z.string().min(12)
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = acceptSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: invite, error: inviteError } = await admin
    .from("staff_invites")
    .select("id,tenant_id,role,invited_email,status,expires_at")
    .eq("invite_code", parsed.data.code)
    .maybeSingle();

  if (inviteError || !invite) {
    emitDebugEvent({
      level: "warn",
      source: "api",
      message: "Employee invite acceptance failed: invalid invite",
      details: { code: parsed.data.code }
    });
    return NextResponse.json({ error: "Invalid invite" }, { status: 404 });
  }

  if (invite.status !== "pending") {
    return NextResponse.json({ error: "Invite is no longer active" }, { status: 400 });
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    await admin.from("staff_invites").update({ status: "expired" }).eq("id", invite.id);
    return NextResponse.json({ error: "Invite expired" }, { status: 400 });
  }

  const authEmail = (user.email ?? "").toLowerCase();
  if (authEmail !== String(invite.invited_email).toLowerCase()) {
    emitDebugEvent({
      level: "warn",
      source: "api",
      message: "Employee invite acceptance failed: email mismatch",
      details: { authEmail, invitedEmail: invite.invited_email }
    });
    return NextResponse.json({ error: "Signed-in email does not match invite" }, { status: 403 });
  }

  const { data: existingProfile } = await admin
    .from("users_profile")
    .select("id,tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile && existingProfile.tenant_id !== invite.tenant_id) {
    return NextResponse.json(
      { error: "This account already belongs to another workspace" },
      { status: 409 }
    );
  }

  if (!existingProfile) {
    const fullName =
      typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null;

    const { error: profileInsertError } = await admin.from("users_profile").insert({
      id: user.id,
      tenant_id: invite.tenant_id,
      full_name: fullName,
      role: invite.role,
      is_active: true
    });

    if (profileInsertError) {
      return NextResponse.json({ error: profileInsertError.message }, { status: 500 });
    }
  } else {
    const { error: profileUpdateError } = await admin
      .from("users_profile")
      .update({ role: invite.role, is_active: true })
      .eq("id", user.id);

    if (profileUpdateError) {
      return NextResponse.json({ error: profileUpdateError.message }, { status: 500 });
    }
  }

  const { error: inviteUpdateError } = await admin
    .from("staff_invites")
    .update({
      status: "accepted",
      accepted_by: user.id,
      accepted_at: new Date().toISOString()
    })
    .eq("id", invite.id);

  if (inviteUpdateError) {
    emitDebugEvent({
      level: "error",
      source: "api",
      message: "Employee invite acceptance failed while updating invite",
      details: { inviteId: invite.id, error: inviteUpdateError.message }
    });
    return NextResponse.json({ error: inviteUpdateError.message }, { status: 500 });
  }

  emitDebugEvent({
    level: "info",
    source: "api",
    message: "Employee invite accepted",
    details: { inviteId: invite.id, tenantId: invite.tenant_id, role: invite.role }
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
