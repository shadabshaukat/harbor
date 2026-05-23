"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEnv } from "@/lib/env";
import { emitDebugEvent } from "@/lib/debug/events";

function normalizeWorkspace(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

async function getUserTenantSlug(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users_profile")
    .select("tenant_id, tenants!inner(slug)")
    .eq("id", userId)
    .maybeSingle();

  if (!data) {
    return null;
  }

  const tenant = data.tenants as unknown as { slug: string } | { slug: string }[] | null;
  if (!tenant) {
    return null;
  }

  return Array.isArray(tenant) ? tenant[0]?.slug ?? null : tenant.slug;
}

export async function signIn(formData: FormData): Promise<void> {
  const tenantSlug = normalizeWorkspace(String(formData.get("tenant_slug") ?? ""));
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const next = String(formData.get("next") ?? "").trim();
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "";

  if (!tenantSlug) {
    redirect("/login?error=Workspace%20name%20is%20required");
  }

  emitDebugEvent({
    level: "info",
    source: "auth",
    message: "Supabase password sign-in requested",
    details: { email, tenantSlug, safeNext }
  });

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    emitDebugEvent({
      level: "error",
      source: "auth",
      message: "Supabase password sign-in failed",
      details: { email, tenantSlug, error: error?.message ?? "Invalid credentials" }
    });
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "Invalid credentials")}`);
  }

  const userTenantSlug = await getUserTenantSlug(data.user.id);

  if (!userTenantSlug) {
    const metadata = data.user.user_metadata as {
      signup_intent?: string;
      invite_code?: string;
      tenant_slug?: string;
      workspace_slug?: string;
    };

    const metadataWorkspace = normalizeWorkspace(metadata.workspace_slug ?? metadata.tenant_slug ?? "");

    if (safeNext.startsWith("/invite/")) {
      if (metadataWorkspace && metadataWorkspace !== tenantSlug) {
        await supabase.auth.signOut();
        redirect("/login?error=This%20invite%20account%20belongs%20to%20a%20different%20workspace");
      }
      redirect(safeNext);
    }

    if (metadata.signup_intent === "staff_invite" && metadata.invite_code) {
      if (metadataWorkspace && metadataWorkspace !== tenantSlug) {
        await supabase.auth.signOut();
        redirect("/login?error=This%20employee%20account%20does%20not%20belong%20to%20that%20workspace");
      }
      redirect(`/invite/${metadata.invite_code}`);
    }

    if (metadata.signup_intent === "business_owner") {
      if (metadataWorkspace && metadataWorkspace !== tenantSlug) {
        await supabase.auth.signOut();
        redirect("/login?error=This%20owner%20account%20belongs%20to%20a%20different%20workspace");
      }
      redirect("/onboarding");
    }

    await supabase.auth.signOut();
    redirect("/login?error=This%20account%20is%20not%20linked%20to%20a%20workspace.%20Ask%20the%20owner%20for%20an%20invite.");
  }

  if (userTenantSlug !== tenantSlug) {
    await supabase.auth.signOut();
    emitDebugEvent({
      level: "warn",
      source: "auth",
      message: "Signed-in user attempted wrong tenant workspace",
      details: { email, requestedTenant: tenantSlug, actualTenant: userTenantSlug }
    });
    redirect("/login?error=This%20account%20does%20not%20belong%20to%20that%20workspace");
  }

  if (safeNext.startsWith("/invite/")) {
    redirect(safeNext);
  }

  redirect(safeNext && !safeNext.startsWith("/invite/") ? safeNext : "/dashboard");
}

export async function signUpBusiness(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const businessType = String(formData.get("business_type") ?? "cafe").trim();
  const brandName = String(formData.get("brand_name") ?? "").trim();
  const workspaceSlug = normalizeWorkspace(String(formData.get("workspace_slug") ?? "").trim());
  const { appUrl } = getEnv();
  const emailRedirectTo = `${appUrl}/auth/callback?next=/onboarding`;

  if (!workspaceSlug || workspaceSlug.length < 3) {
    redirect("/signup?error=Workspace%20name%20must%20be%20at%20least%203%20characters");
  }

  const admin = createAdminClient();
  const { data: existingTenant } = await admin
    .from("tenants")
    .select("id")
    .eq("slug", workspaceSlug)
    .maybeSingle();

  if (existingTenant) {
    redirect(`/signup?error=${encodeURIComponent("That workspace name is already taken. Choose another.")}`);
  }

  emitDebugEvent({
    level: "info",
    source: "auth",
    message: "Supabase owner signup requested",
    details: { email, businessType, brandName, workspaceSlug, emailRedirectTo }
  });

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: {
        full_name: fullName,
        signup_intent: "business_owner",
        business_type: businessType,
        brand_name: brandName,
        workspace_slug: workspaceSlug
      }
    }
  });

  if (error) {
    emitDebugEvent({
      level: "error",
      source: "auth",
      message: "Supabase owner signup failed",
      details: { email, error: error.message }
    });
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (!data.session) {
    emitDebugEvent({
      level: "info",
      source: "auth",
      message: "Supabase owner signup requires email verification",
      details: { email }
    });
    redirect(`/login?tenant_slug=${encodeURIComponent(workspaceSlug)}&message=Check%20your%20email%20to%20verify%20the%20owner%20account%20for%20${encodeURIComponent(workspaceSlug)}.`);
  }

  redirect("/onboarding");
}

export async function signUpStaffFromInvite(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const next = String(formData.get("next") ?? "").trim();
  const inviteCode = String(formData.get("invite_code") ?? "").trim();
  const tenantSlug = normalizeWorkspace(String(formData.get("tenant_slug") ?? ""));
  const { appUrl } = getEnv();
  const emailRedirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(next)}`;

  if (!next.startsWith("/invite/") || !inviteCode) {
    redirect("/signup?error=Employee%20signup%20requires%20a%20valid%20invite");
  }

  emitDebugEvent({
    level: "info",
    source: "auth",
    message: "Supabase employee signup requested",
    details: { email, tenantSlug, inviteCode, emailRedirectTo }
  });

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: {
        full_name: fullName,
        signup_intent: "staff_invite",
        invite_code: inviteCode,
        tenant_slug: tenantSlug
      }
    }
  });

  if (error) {
    emitDebugEvent({
      level: "error",
      source: "auth",
      message: "Supabase employee signup failed",
      details: { email, tenantSlug, inviteCode, error: error.message }
    });
    redirect(`/signup?mode=staff&next=${encodeURIComponent(next)}&invite_code=${encodeURIComponent(inviteCode)}&tenant_slug=${encodeURIComponent(tenantSlug)}&invited_email=${encodeURIComponent(email)}&error=${encodeURIComponent(error.message)}`);
  }

  if (!data.session) {
    emitDebugEvent({
      level: "info",
      source: "auth",
      message: "Supabase employee signup requires email verification",
      details: { email, tenantSlug, inviteCode }
    });
    redirect(`/login?tenant_slug=${encodeURIComponent(tenantSlug)}&next=${encodeURIComponent(next)}&message=Check%20your%20email%20to%20activate%20your%20employee%20account.`);
  }

  redirect(next);
}

export async function resendSignupVerification(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = String(formData.get("next") ?? "").trim();
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/onboarding";
  const mode = String(formData.get("mode") ?? "").trim();
  const tenantSlug = normalizeWorkspace(String(formData.get("tenant_slug") ?? ""));
  const { appUrl } = getEnv();
  const emailRedirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`;

  const loginParams = new URLSearchParams();
  if (mode) {
    loginParams.set("mode", mode);
  }
  if (safeNext) {
    loginParams.set("next", safeNext);
  }
  if (tenantSlug) {
    loginParams.set("tenant_slug", tenantSlug);
  }

  if (!email) {
    loginParams.set("error", "Enter an email address to resend verification.");
    redirect(`/login?${loginParams.toString()}`);
  }

  const supabase = await createClient();
  emitDebugEvent({
    level: "info",
    source: "auth",
    message: "Supabase verification resend requested",
    details: { email, safeNext, mode, tenantSlug, emailRedirectTo }
  });

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo
    }
  });

  if (error) {
    emitDebugEvent({
      level: "error",
      source: "auth",
      message: "Supabase verification resend failed",
      details: { email, error: error.message }
    });
    loginParams.set("error", error.message);
    redirect(`/login?${loginParams.toString()}`);
  }

  emitDebugEvent({
    level: "info",
    source: "auth",
    message: "Supabase verification resend completed",
    details: { email }
  });

  loginParams.set("message", `Verification email resent to ${email}.`);
  redirect(`/login?${loginParams.toString()}`);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
