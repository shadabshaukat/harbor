import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

async function getDashboardStats() {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users_profile")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  const { count: lowStockCount } = await supabase
    .from("inventory_items")
    .select("id", { count: "exact", head: true })
    .lte("quantity_on_hand", 12);

  const { count: openOrderCount } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");

  return {
    lowStockCount: lowStockCount ?? 0,
    openOrderCount: openOrderCount ?? 0,
    userEmail: user.email ?? "unknown",
    role: profile?.role ?? "unassigned"
  };
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <main className="container">
      <h1>Operations Dashboard</h1>
      <p className="subtle">
        Signed in as {stats.userEmail} | role: {stats.role}
      </p>

      <form action={signOut}>
        <button type="submit" className="btn" style={{ marginBottom: 18 }}>Sign out</button>
      </form>

      <div className="grid cols-3" style={{ marginTop: "1rem" }}>
        <article className="card">
          <h3>Open Tickets</h3>
          <p className="metric">{stats.openOrderCount}</p>
          <p className="subtle">Kitchen + bar workflows in progress</p>
        </article>

        <article className="card">
          <h3>Low Stock SKUs</h3>
          <p className="metric">{stats.lowStockCount}</p>
          <p className="subtle">Across all outlets in tenant scope</p>
        </article>

        <article className="card">
          <h3>Multi-Tenant Pricing</h3>
          <p className="metric">$799/mo</p>
          <p className="subtle">Base subscription per venue group + usage add-ons</p>
        </article>
      </div>
    </main>
  );
}
