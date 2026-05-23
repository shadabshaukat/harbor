import { DashboardNav } from "@/app/dashboard/_components/nav";
import { requireOnboardedUser } from "@/lib/guards";
import { CloseDayClient } from "@/app/dashboard/close-day/close-day-client";

export const dynamic = "force-dynamic";

export default async function CloseDayPage() {
  const { supabase, profile } = await requireOnboardedUser();

  const { data: store } = await supabase
    .from("stores")
    .select("id,name")
    .eq("tenant_id", profile.tenant_id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!store) {
    return <main className="app-shell"><p className="error">No store configured.</p></main>;
  }

  return (
    <main className="app-shell">
      <header className="hero compact"><div><p className="eyebrow">Harbor Finance</p><h1>Close End of Day - {store.name}</h1></div></header>
      <DashboardNav />
      <CloseDayClient storeId={store.id} />
    </main>
  );
}
