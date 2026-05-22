import { createBrowserClient } from "@supabase/ssr";
import { getEnv } from "@/lib/env";

export function createClient() {
  const env = getEnv();
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
