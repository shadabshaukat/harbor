import { NextResponse } from "next/server";
import { emitDebugEvent, type DebugEventLevel } from "@/lib/debug/events";
import { isDebugRequestAllowed } from "@/lib/debug/config";

const validLevels = new Set(["debug", "info", "warn", "error"]);

export async function POST(request: Request) {
  if (!isDebugRequestAllowed(request)) {
    return NextResponse.json({ ok: false, disabled: true }, { status: 404 });
  }

  const payload = await request.json().catch(() => ({}));
  const level = validLevels.has(payload.level) ? (payload.level as DebugEventLevel) : "info";

  emitDebugEvent({
    level,
    source: "client",
    message: typeof payload.message === "string" ? payload.message.slice(0, 240) : "Client debug event",
    details: typeof payload.details === "object" && payload.details !== null ? payload.details : undefined
  });

  return NextResponse.json({ ok: true });
}
