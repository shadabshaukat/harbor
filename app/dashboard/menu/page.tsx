import { DashboardNav } from "@/app/dashboard/_components/nav";
import { MenuImageUploader } from "@/app/dashboard/menu/menu-image-uploader";
import { requireOnboardedUser } from "@/lib/guards";
import { resolveMenuImageUrls } from "@/lib/storage/menu-images";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const { supabase, profile } = await requireOnboardedUser();

  const { data: items } = await supabase
    .from("menu_items")
    .select("id,name,description,image_url,base_price_cents,is_active,menu_categories(name)")
    .eq("tenant_id", profile.tenant_id)
    .order("name", { ascending: true });
  const menuItems = await resolveMenuImageUrls(items ?? []);

  return (
    <main className="app-shell">
      <header className="hero compact">
        <div>
          <p className="eyebrow">Harbor Menu Studio</p>
          <h1>Menu images and item presentation</h1>
          <p className="subtle">Upload item photography and keep the ordering screen looking current.</p>
        </div>
      </header>

      <DashboardNav />

      <section className="menu-admin-grid">
        {menuItems.map((item) => {
          const category = item.menu_categories as { name: string } | { name: string }[] | null;
          const categoryName = Array.isArray(category) ? category[0]?.name : category?.name;

          return (
            <article key={item.id} className="menu-admin-item">
              <img
                src={item.image_url ?? "/menu/flat-white.svg"}
                alt={item.name}
                className="menu-admin-image"
              />
              <div className="menu-admin-body">
                <div>
                  <p className="eyebrow">{categoryName ?? "Menu item"}</p>
                  <h2>{item.name}</h2>
                  <p className="subtle">{item.description ?? "No description yet."}</p>
                </div>
                <div className="menu-admin-footer">
                  <strong>${(item.base_price_cents / 100).toFixed(2)}</strong>
                  <span className={item.is_active ? "pill ok" : "pill danger"}>
                    {item.is_active ? "Active" : "Hidden"}
                  </span>
                </div>
                <MenuImageUploader itemId={item.id} itemName={item.name} />
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
