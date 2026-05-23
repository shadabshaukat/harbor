import { DashboardNav } from "@/app/dashboard/_components/nav";
import { requireOnboardedUser } from "@/lib/guards";
import { PosClient } from "@/app/dashboard/pos/pos-client";
import { resolveMenuImageUrls } from "@/lib/storage/menu-images";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const { supabase, profile } = await requireOnboardedUser();

  const { data: firstStore } = await supabase
    .from("stores")
    .select("id,name")
    .eq("tenant_id", profile.tenant_id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!firstStore) {
    return (
      <main className="app-shell">
        <p className="error">No active store found. Complete onboarding.</p>
      </main>
    );
  }

  const [{ data: tables }, { data: menuItems }] = await Promise.all([
    supabase
      .from("dining_tables")
      .select("id,label,seats,zone")
      .eq("store_id", firstStore.id)
      .eq("is_active", true)
      .order("label", { ascending: true }),
    supabase
      .from("menu_items")
      .select("id,name,description,image_url,base_price_cents")
      .eq("tenant_id", profile.tenant_id)
      .eq("is_active", true)
      .order("name", { ascending: true })
  ]);
  const signedMenuItems = await resolveMenuImageUrls(menuItems ?? []);

  return (
    <main className="app-shell">
      <header className="hero compact">
        <div>
          <p className="eyebrow">Harbor POS</p>
          <h1>Order Taking - {firstStore.name}</h1>
        </div>
      </header>
      <DashboardNav />
      <PosClient storeId={firstStore.id} menuItems={signedMenuItems} tables={tables ?? []} />
    </main>
  );
}
