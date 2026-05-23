import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingClient } from "@/app/onboarding/onboarding-client";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users_profile")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    redirect("/dashboard");
  }

  const metadata = (user.user_metadata ?? {}) as {
    full_name?: string;
    business_type?: string;
    brand_name?: string;
    workspace_slug?: string;
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <img src="/harbor-logo.svg" alt="Harbor" className="brand-logo" />
          <p className="eyebrow">Harbor Guided Onboarding</p>
          <h1>Set up your first venue</h1>
          <p className="subtle">Create your business profile, first location, starter floor plan, menu, and stock room in one guided flow.</p>
        </div>
      </section>
      <OnboardingClient
        initial={{
          full_name: metadata.full_name ?? "",
          business_type: metadata.business_type ?? "cafe",
          brand_name: metadata.brand_name ?? "",
          workspace_slug: metadata.workspace_slug ?? ""
        }}
      />
    </main>
  );
}
