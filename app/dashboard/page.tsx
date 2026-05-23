import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { DashboardNav } from "@/app/dashboard/_components/nav";
import { requireOnboardedUser } from "@/lib/guards";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { supabase, user, profile } = await requireOnboardedUser();

  const [{ count: openOrders }, { count: lowStock }, { data: recentOrders }, { data: tenant }] =
    await Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["open", "sent_to_kitchen", "ready"]),
      supabase
        .from("inventory_items")
        .select("id", { count: "exact", head: true })
        .filter("quantity_on_hand", "lte", "reorder_threshold"),
      supabase
        .from("orders")
        .select("id,status,total_cents,created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase.from("tenants").select("brand_name,plan_tier").eq("id", profile.tenant_id).single()
    ]);

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Harbor Command</p>
          <h1>{tenant?.brand_name ?? "Harbor"} Operations Center</h1>
          <p className="subtle">Role: {profile.role} | Plan: {tenant?.plan_tier ?? "growth"}</p>
        </div>
        <div className="hero-actions">
          <Link href="/dashboard/pos" className="btn">New Order</Link>
          <form action={signOut}><button type="submit" className="btn ghost">Sign out</button></form>
        </div>
      </header>

      <DashboardNav />

      <section className="metrics-grid">
        <article className="metric-card"><p className="metric-label">Active Tickets</p><p className="metric-value">{openOrders ?? 0}</p></article>
        <article className="metric-card"><p className="metric-label">Low Stock SKUs</p><p className="metric-value">{lowStock ?? 0}</p></article>
        <article className="metric-card"><p className="metric-label">Signed In</p><p className="metric-value">{user.email}</p></article>
      </section>

      <section className="panel">
        <h2>Recent Orders</h2>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Order</th><th>Status</th><th>Total</th><th>Created</th></tr></thead>
            <tbody>
              {(recentOrders ?? []).map((order) => (
                <tr key={order.id}>
                  <td>{order.id.slice(0, 8)}...</td>
                  <td><span className="pill">{order.status}</span></td>
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
