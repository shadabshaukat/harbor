import Link from "next/link";

const operatingRhythm = [
  "Register business",
  "Verify owner email",
  "Invite employees",
  "Assign roles",
  "Open the floor",
  "Take orders"
];

const productTiles = [
  {
    title: "1. Business Registration",
    body: "The owner registers the venue with an admin email and a unique workspace name."
  },
  {
    title: "2. Invite Employees",
    body: "Owners invite employees by email, assign manager, staff, or contractor access, and keep everyone in the same workspace."
  },
  {
    title: "3. Login and Work",
    body: "Owners and employees log in with workspace name plus email, then access the tools their role allows."
  }
];

export default function HomePage() {
  return (
    <main className="site-shell">
      <header className="site-nav">
        <Link href="/" className="site-brand">
          <img src="/harbor-logo.svg" alt="Harbor" />
        </Link>
        <nav className="site-links" aria-label="Primary navigation">
          <Link href="/signup">Business Registration</Link>
          <Link href="/login">Workspace Login</Link>
        </nav>
      </header>

      <section className="site-hero">
        <div className="site-hero-copy">
          <p className="eyebrow">Cafe operations, without the scramble</p>
          <h1>Harbor</h1>
          <p className="site-lede">
            A modern operating system for cafes, bars, pubs, restaurants, and hotel venues.
            Register a workspace, invite employees, assign roles, take orders, manage menus,
            watch stock, and close the day with confidence.
          </p>
          <div className="hero-actions">
            <Link href="/signup" className="btn">Register Business</Link>
            <Link href="/login" className="btn ghost">Login to Workspace</Link>
          </div>
        </div>

        <div className="product-console" aria-label="Harbor product preview">
          <div className="console-topbar">
            <span>Harbor POS</span>
            <strong>Service live</strong>
          </div>
          <div className="console-body">
            <div className="table-map">
              {["T1", "T2", "T3", "Bar", "Takeaway", "Patio"].map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            <div className="order-stack">
              <div>
                <span>Table 12</span>
                <strong>$48.20</strong>
              </div>
              <div>
                <span>Team active</span>
                <strong>7 tickets</strong>
              </div>
              <div>
                <span>Low stock</span>
                <strong>Milk, beans</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rhythm-strip" aria-label="Daily workflow">
        {operatingRhythm.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </section>

      <section className="feature-band">
        {productTiles.map((tile) => (
          <article key={tile.title} className="feature-tile">
            <h2>{tile.title}</h2>
            <p>{tile.body}</p>
          </article>
        ))}
      </section>

      <section className="launch-band">
        <div>
          <p className="eyebrow">Built for busy shifts</p>
          <h2>Register your venue, invite the team, and start serving.</h2>
        </div>
        <Link href="/signup" className="btn">Business Registration</Link>
      </section>
    </main>
  );
}
