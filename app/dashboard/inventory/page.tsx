import { DashboardNav } from "@/app/dashboard/_components/nav";
import { requireOnboardedUser } from "@/lib/guards";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const { supabase } = await requireOnboardedUser();

  const { data: items } = await supabase
    .from("inventory_items")
    .select("id,sku,name,unit,quantity_on_hand,reorder_threshold,average_cost_cents,updated_at")
    .order("updated_at", { ascending: false })
    .limit(60);

  return (
    <main className="app-shell">
      <header className="hero compact"><div><p className="eyebrow">Harbor Stock</p><h1>Inventory Intelligence</h1></div></header>
      <DashboardNav />
      <section className="panel">
        <h2>Stock Ledger</h2>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>SKU</th><th>Name</th><th>QOH</th><th>Unit</th><th>Reorder</th><th>Avg Cost</th><th>Status</th></tr></thead>
            <tbody>
              {(items ?? []).map((item) => {
                const low = Number(item.quantity_on_hand) <= Number(item.reorder_threshold);
                return (
                  <tr key={item.id}>
                    <td>{item.sku}</td><td>{item.name}</td><td>{item.quantity_on_hand}</td><td>{item.unit}</td><td>{item.reorder_threshold}</td>
                    <td>${(item.average_cost_cents / 100).toFixed(2)}</td>
                    <td><span className={low ? "pill danger" : "pill ok"}>{low ? "Low" : "Healthy"}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
