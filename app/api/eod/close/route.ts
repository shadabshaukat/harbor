import { z } from "zod";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { emitDebugEvent } from "@/lib/debug/events";

const closeSchema = z.object({
  store_id: z.string().uuid(),
  gross_sales_cents: z.number().int().nonnegative(),
  cash_counted_cents: z.number().int().nonnegative()
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
    emitDebugEvent({
      level: "warn",
      source: "api",
      message: "Close-day validation failed",
      details: { error: parsed.error.flatten() }
    });
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("users_profile")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not linked" }, { status: 403 });
  }

  if (!["owner", "manager"].includes(profile.role)) {
    emitDebugEvent({
      level: "warn",
      source: "api",
      message: "Close-day rejected by role",
      details: { role: profile.role }
    });
    return NextResponse.json({ error: "Insufficient role" }, { status: 403 });
  }

  const netSales = Math.round(parsed.data.gross_sales_cents / 1.1);
  const cashExpected = parsed.data.gross_sales_cents;
  const variance = parsed.data.cash_counted_cents - cashExpected;
  emitDebugEvent({
    level: "info",
    source: "api",
    message: "Close-day submission requested",
    details: {
      storeId: parsed.data.store_id,
      grossSalesCents: parsed.data.gross_sales_cents,
      cashVarianceCents: variance
    }
  });

  const { data, error } = await supabase
    .from("shift_closures")
    .insert({
      tenant_id: profile.tenant_id,
      store_id: parsed.data.store_id,
      closed_by: user.id,
      gross_sales_cents: parsed.data.gross_sales_cents,
      net_sales_cents: netSales,
      cash_expected_cents: cashExpected,
      cash_counted_cents: parsed.data.cash_counted_cents,
      cash_variance_cents: variance
    })
    .select("id, closed_at, gross_sales_cents, net_sales_cents, cash_variance_cents")
    .single();

  if (error) {
    emitDebugEvent({
      level: "error",
      source: "api",
      message: "Close-day submission failed",
      details: { storeId: parsed.data.store_id, error: error.message }
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  emitDebugEvent({
    level: "info",
    source: "api",
    message: "Close-day submission completed",
    details: { closureId: data.id, storeId: parsed.data.store_id }
  });

  return NextResponse.json({ closure: data }, { status: 201 });
}
