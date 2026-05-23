import { DashboardNav } from "@/app/dashboard/_components/nav";
import { requireOnboardedUser } from "@/lib/guards";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const { supabase } = await requireOnboardedUser();

  const { data: orders } = await supabase
    .from("orders")
    .select("id,channel,status,subtotal_cents,tax_cents,total_cents,created_at")
    .order("created_at", { ascending: false })
    .limit(40);

  return (
    <main className="app-shell">
      <header className="hero compact"><div><p className="eyebrow">Harbor Flow</p><h1>Order Lifecycle</h1></div></header>
      <DashboardNav />
      <section className="panel">
        <h2>All Tickets</h2>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Order</th><th>Channel</th><th>Status</th><th>Subtotal</th><th>Tax</th><th>Total</th><th>Created</th></tr></thead>
            <tbody>
              {(orders ?? []).map((order) => (
                <tr key={order.id}>
                  <td>{order.id.slice(0, 8)}...</td>
                  <td>{order.channel}</td>
                  <td><span className="pill">{order.status}</span></td>
                  <td>${(order.subtotal_cents / 100).toFixed(2)}</td>
                  <td>${(order.tax_cents / 100).toFixed(2)}</td>
                  <td>${(order.total_cents / 100).toFixed(2)}</td>
                  <td>{new Date(order.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
