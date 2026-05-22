import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as
    | "signup"
    | "recovery"
    | "email_change"
    | "email"
    | null;
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  const supabase = await createClient();

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  }

  if (tokenHash && type) {
    await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  }

  return NextResponse.redirect(
    new URL("/login?error=Invalid%20or%20expired%20auth%20link", requestUrl.origin)
  );
}
