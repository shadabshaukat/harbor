import Link from "next/link";

const tabs = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/pos", label: "POS" },
  { href: "/dashboard/menu", label: "Menu" },
  { href: "/dashboard/orders", label: "Orders" },
  { href: "/dashboard/inventory", label: "Inventory" },
  { href: "/dashboard/close-day", label: "Close Day" },
  { href: "/dashboard/team", label: "Team" }
];

export function DashboardNav() {
  return (
    <nav className="tabbar">
      {tabs.map((tab) => (
        <Link key={tab.href} href={tab.href} className="tablink">
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
