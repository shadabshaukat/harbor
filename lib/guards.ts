import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function requireOnboardedUser() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("users_profile")
    .select("tenant_id, role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.tenant_id) {
    const metadata = user.user_metadata as {
      signup_intent?: string;
      invite_code?: string;
    };

    if (metadata.signup_intent === "staff_invite" && metadata.invite_code) {
      redirect(`/invite/${metadata.invite_code}`);
    }

    if (metadata.signup_intent === "business_owner") {
      redirect("/onboarding");
    }

    redirect("/login?error=This%20account%20is%20not%20linked%20to%20a%20workspace.%20Ask%20a%20manager%20for%20an%20invite.");
  }

  return { supabase, user, profile };
}
