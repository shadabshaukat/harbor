import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container">
      <span className="badge">HarborLedger for Hospitality</span>
      <h1>System of Record + POS SaaS for hospitality operators</h1>
      <p className="subtle">
        A multi-tenant platform for cafes, restaurants, bars, pubs, and hotels.
        Built with Next.js on Vercel and Supabase for Auth, Postgres, Realtime,
        Storage, and RLS-first APIs.
      </p>

      <div className="grid cols-3" style={{ marginTop: "1.5rem" }}>
        <article className="card">
          <h3>Core Ops</h3>
          <p>Menus, modifiers, table/takeaway, payments, cash drawer, close-of-day.</p>
        </article>
        <article className="card">
          <h3>Inventory + COGS</h3>
          <p>Recipe depletion, stock counts, auto-reorder signals, supplier catalogs.</p>
        </article>
        <article className="card">
          <h3>Enterprise Controls</h3>
          <p>RLS per tenant, audit logs, EU data residency strategy, DR runbooks.</p>
        </article>
      </div>

      <p style={{ marginTop: "1.5rem" }}>
        <Link href="/dashboard" className="btn">Open Demo Dashboard</Link>
      </p>
    </main>
  );
}
