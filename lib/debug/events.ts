import { isDebugEnabled } from "@/lib/debug/config";

export type DebugEventLevel = "debug" | "info" | "warn" | "error";

export type DebugEvent = {
  id: string;
  timestamp: string;
  level: DebugEventLevel;
  source: "server" | "client" | "auth" | "api" | "ui";
  message: string;
  details?: Record<string, unknown>;
};

type DebugListener = (event: DebugEvent) => void;

type DebugStore = {
  events: DebugEvent[];
  listeners: Set<DebugListener>;
};

const MAX_EVENTS = 200;

function getStore(): DebugStore {
  const globalDebug = globalThis as typeof globalThis & { __harborDebugStore?: DebugStore };

  if (!globalDebug.__harborDebugStore) {
    globalDebug.__harborDebugStore = {
      events: [],
      listeners: new Set()
    };
  }

  return globalDebug.__harborDebugStore;
}

function sanitizeDetails(details?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!details) {
    return undefined;
  }

  const blocked = ["password", "token", "access_token", "refresh_token", "service_role", "secret", "apikey"];
  return Object.fromEntries(
    Object.entries(details).map(([key, value]) => {
      if (blocked.some((blockedKey) => key.toLowerCase().includes(blockedKey))) {
        return [key, "[redacted]"];
      }

      return [key, value];
    })
  );
}

export function emitDebugEvent(event: Omit<DebugEvent, "id" | "timestamp">): DebugEvent | null {
  if (!isDebugEnabled()) {
    return null;
  }

  const store = getStore();
  const debugEvent: DebugEvent = {
    ...event,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    details: sanitizeDetails(event.details)
  };

  store.events.push(debugEvent);
  if (store.events.length > MAX_EVENTS) {
    store.events.splice(0, store.events.length - MAX_EVENTS);
  }

  for (const listener of store.listeners) {
    listener(debugEvent);
  }

  return debugEvent;
}

export function getRecentDebugEvents(): DebugEvent[] {
  return [...getStore().events];
}

export function subscribeDebugEvents(listener: DebugListener): () => void {
  const store = getStore();
  store.listeners.add(listener);

  return () => {
    store.listeners.delete(listener);
  };
}
