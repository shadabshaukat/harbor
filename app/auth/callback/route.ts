import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { emitDebugEvent } from "@/lib/debug/events";

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
  const next = requestUrl.searchParams.get("next") ?? "/onboarding";

  const supabase = await createClient();

  if (code) {
    emitDebugEvent({
      level: "info",
      source: "auth",
      message: "Supabase auth callback received code",
      details: { next }
    });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      emitDebugEvent({
        level: "error",
        source: "auth",
        message: "Supabase auth code exchange failed",
        details: { next, error: error.message }
      });
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
      );
    }
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  }

  if (tokenHash && type) {
    emitDebugEvent({
      level: "info",
      source: "auth",
      message: "Supabase auth callback received token hash",
      details: { next, type }
    });
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) {
      emitDebugEvent({
        level: "error",
        source: "auth",
        message: "Supabase auth OTP verification failed",
        details: { next, type, error: error.message }
      });
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
      );
    }
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  }

  return NextResponse.redirect(
    new URL("/login?error=Invalid%20or%20expired%20auth%20link", requestUrl.origin)
  );
}
