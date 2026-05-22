import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HarborLedger | Hospitality System of Record + POS",
  description:
    "Multi-tenant SaaS for cafes, restaurants, bars, pubs, and hotels: POS, inventory, menus, payments, and end-of-day close."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
