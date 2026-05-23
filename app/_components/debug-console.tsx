"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type DebugEvent = {
  id?: string;
  timestamp?: string;
  level?: "debug" | "info" | "warn" | "error";
  source?: string;
  message: string;
  details?: Record<string, unknown>;
  type?: string;
};

function postClientDebug(event: Omit<DebugEvent, "id" | "timestamp" | "source">) {
  void fetch("/api/debug/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event)
  }).catch(() => {
    // The debugger must never break the app it is observing.
  });
}

function formatTime(value?: string) {
  if (!value) {
    return new Date().toLocaleTimeString();
  }

  return new Date(value).toLocaleTimeString();
}

export function DebugConsole() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    postClientDebug({
      level: "info",
      message: "Debug console mounted",
      details: { path: window.location.pathname }
    });

    const stream = new EventSource("/api/debug/stream");
    stream.onopen = () => setConnected(true);
    stream.onerror = () => setConnected(false);
    stream.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as DebugEvent;
        if (event.type === "heartbeat") {
          return;
        }

        setEvents((current) => [...current, event].slice(-120));
      } catch {
        setEvents((current) =>
          [
            ...current,
            {
              level: "warn",
              source: "client",
              message: "Could not parse debug stream event"
            } satisfies DebugEvent
          ].slice(-120)
        );
      }
    };

    const onError = (event: ErrorEvent) => {
      postClientDebug({
        level: "error",
        message: event.message || "Browser error",
        details: { filename: event.filename, line: event.lineno, column: event.colno }
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      postClientDebug({
        level: "error",
        message: "Unhandled promise rejection",
        details: { reason: String(event.reason) }
      });
    };

    const nativeFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const started = performance.now();
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method ?? (typeof input !== "string" && !(input instanceof URL) ? input.method : "GET");

      try {
        const response = await nativeFetch(input, init);
        if (url.startsWith("/api/") && !url.startsWith("/api/debug/")) {
          postClientDebug({
            level: response.ok ? "info" : "warn",
            message: "Client API request completed",
            details: {
              method,
              url,
              status: response.status,
              duration_ms: Math.round(performance.now() - started)
            }
          });
        }
        return response;
      } catch (error) {
        postClientDebug({
          level: "error",
          message: "Client API request failed",
          details: { method, url, error: error instanceof Error ? error.message : String(error) }
        });
        throw error;
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      stream.close();
      window.fetch = nativeFetch;
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  useEffect(() => {
    if (pathname && lastPath.current !== pathname) {
      lastPath.current = pathname;
      postClientDebug({
        level: "info",
        message: "Route changed",
        details: { path: pathname }
      });
    }
  }, [pathname]);

  const latestEvents = useMemo(() => [...events].reverse(), [events]);

  return (
    <aside className={`debug-console ${open ? "open" : ""}`} aria-live="polite">
      <button className="debug-toggle" type="button" onClick={() => setOpen((value) => !value)}>
        <span className={connected ? "debug-dot live" : "debug-dot"} />
        Debug
      </button>

      {open ? (
        <section className="debug-panel">
          <header className="debug-header">
            <div>
              <p className="debug-kicker">Harbor live debugger</p>
              <h2>App event stream</h2>
            </div>
            <button type="button" className="debug-clear" onClick={() => setEvents([])}>
              Clear
            </button>
          </header>

          <div className="debug-status">
            <span className={connected ? "debug-dot live" : "debug-dot"} />
            {connected ? "Streaming live" : "Waiting for stream"}
          </div>

          <div className="debug-events">
            {latestEvents.length === 0 ? (
              <p className="debug-empty">No events yet. Use the app and logs will appear here.</p>
            ) : (
              latestEvents.map((event, index) => (
                <article key={event.id ?? `${event.message}-${index}`} className={`debug-event ${event.level ?? "info"}`}>
                  <div className="debug-event-meta">
                    <span>{formatTime(event.timestamp)}</span>
                    <span>{event.source ?? event.type ?? "app"}</span>
                    <span>{event.level ?? "info"}</span>
                  </div>
                  <p>{event.message}</p>
                  {event.details ? <pre>{JSON.stringify(event.details, null, 2)}</pre> : null}
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}
    </aside>
  );
}
