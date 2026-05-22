import { z } from "zod";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const closeSchema = z.object({
  store_id: z.string().uuid(),
  gross_sales_cents: z.number().int().nonnegative(),
  cash_variance_cents: z.number().int()
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
  const parsed = closeSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("users_profile")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not linked" }, { status: 403 });
  }

  if (!["owner", "manager"].includes(profile.role)) {
    return NextResponse.json({ error: "Insufficient role" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("shift_closures")
    .insert({
      tenant_id: profile.tenant_id,
      store_id: parsed.data.store_id,
      closed_by: user.id,
      gross_sales_cents: parsed.data.gross_sales_cents,
      cash_variance_cents: parsed.data.cash_variance_cents
    })
    .select("id, closed_at, gross_sales_cents, cash_variance_cents")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ closure: data }, { status: 201 });
}
