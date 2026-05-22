export function resolveTenantSlugFromHost(hostname: string): string {
  const [subdomain] = hostname.split(".");
  if (!subdomain || ["www", "app", "localhost"].includes(subdomain)) {
    return "demo-cafe";
  }
  return subdomain;
}
