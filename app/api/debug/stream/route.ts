import { getRecentDebugEvents, subscribeDebugEvents, type DebugEvent } from "@/lib/debug/events";
import { isDebugRequestAllowed } from "@/lib/debug/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function encodeEvent(event: DebugEvent | { type: string; message: string }) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function GET(request: Request) {
  if (!isDebugRequestAllowed(request)) {
    return new Response("Debug mode disabled", { status: 404 });
  }

  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: DebugEvent | { type: string; message: string }) => {
        controller.enqueue(encoder.encode(encodeEvent(event)));
      };

      send({ type: "connected", message: "Harbor debugger connected" });
      getRecentDebugEvents().forEach(send);

      const unsubscribe = subscribeDebugEvents(send);
      const heartbeat = setInterval(() => {
        send({ type: "heartbeat", message: new Date().toISOString() });
      }, 15000);

      cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
    },
    cancel() {
      cleanup?.();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
