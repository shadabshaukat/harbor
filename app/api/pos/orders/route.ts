import { z } from "zod";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { emitDebugEvent } from "@/lib/debug/events";

const createOrderSchema = z.object({
  store_id: z.string().uuid(),
  table_id: z.string().uuid().nullable().optional(),
  channel: z.enum(["dine_in", "takeaway", "delivery"]).default("dine_in"),
  note: z.string().max(250).optional(),
  items: z.array(z.object({ menu_item_id: z.string().uuid(), qty: z.number().int().positive() })).min(1)
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
    emitDebugEvent({
      level: "warn",
      source: "api",
      message: "POS order validation failed",
      details: { error: parsed.error.flatten() }
    });
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  emitDebugEvent({
    level: "info",
    source: "api",
    message: "POS order creation requested",
    details: {
      storeId: parsed.data.store_id,
      tableId: parsed.data.table_id ?? null,
      channel: parsed.data.channel,
      itemCount: parsed.data.items.length
    }
  });

  const { data: orderId, error } = await supabase.rpc("create_pos_order", {
    p_store_id: parsed.data.store_id,
    p_table_id: parsed.data.table_id ?? null,
    p_channel: parsed.data.channel,
    p_note: parsed.data.note ?? null,
    p_items: parsed.data.items
  });

  if (error) {
    emitDebugEvent({
      level: "error",
      source: "api",
      message: "POS order creation failed",
      details: { storeId: parsed.data.store_id, error: error.message }
    });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  emitDebugEvent({
    level: "info",
    source: "api",
    message: "POS order creation completed",
    details: { orderId, storeId: parsed.data.store_id }
  });

  return NextResponse.json({ order_id: orderId }, { status: 201 });
}
