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
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  };
}
