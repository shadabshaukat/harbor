import { z } from "zod";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const createOrderSchema = z.object({
  store_id: z.string().uuid(),
  total_cents: z.number().int().nonnegative()
});

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = createOrderSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("users_profile")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not linked to tenant" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("orders")
    .insert({
      tenant_id: profile.tenant_id,
      store_id: parsed.data.store_id,
      status: "open",
      total_cents: parsed.data.total_cents
    })
    .select("id, status, total_cents, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ order: data }, { status: 201 });
}
