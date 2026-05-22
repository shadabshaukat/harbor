function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getSupabasePublicKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  );
}

function normalizeUrl(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function getAppUrl(): string {
  const target = (process.env.APP_RUNTIME_TARGET || "auto").toLowerCase();

  if (target === "local") {
    return normalizeUrl(process.env.LOCAL_APP_URL || "http://localhost:3000");
  }

  if (target === "vercel") {
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return normalizeUrl(process.env.NEXT_PUBLIC_APP_URL);
    }

    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      return normalizeUrl(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
    }

    if (process.env.VERCEL_URL) {
      return normalizeUrl(`https://${process.env.VERCEL_URL}`);
    }

    throw new Error(
      "APP_RUNTIME_TARGET=vercel requires NEXT_PUBLIC_APP_URL or VERCEL_PROJECT_PRODUCTION_URL or VERCEL_URL"
    );
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return normalizeUrl(process.env.NEXT_PUBLIC_APP_URL);
  }

  if (process.env.VERCEL_URL) {
    return normalizeUrl(`https://${process.env.VERCEL_URL}`);
  }

  return normalizeUrl("http://localhost:3000");
}

export function getEnv() {
  const supabasePublicKey = getSupabasePublicKey();

  if (!supabasePublicKey) {
    throw new Error(
      "Missing required environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)"
    );
  }

  return {
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: supabasePublicKey,
    appUrl: getAppUrl()
  };
}
