export function isDebugEnabled(): boolean {
  const value = (
    process.env.NEXT_PUBLIC_HARBOR_DEBUG ??
    process.env.HARBOR_DEBUG ??
    "true"
  ).toLowerCase();

  return !["0", "false", "off", "no"].includes(value);
}

export function isDebugRequestAllowed(request: Request): boolean {
  if (!isDebugEnabled()) {
    return false;
  }

  const host = request.headers.get("host") ?? "";
  const isLocalHost =
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("[::1]");

  if (process.env.NODE_ENV !== "production" || isLocalHost) {
    return true;
  }

  return (process.env.HARBOR_DEBUG_ALLOW_REMOTE ?? "").toLowerCase() === "true";
}
