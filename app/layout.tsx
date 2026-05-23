import "./globals.css";
import type { Metadata, Viewport } from "next";
import { DebugConsole } from "@/app/_components/debug-console";
import { isDebugEnabled } from "@/lib/debug/config";

export const metadata: Metadata = {
  title: "Harbor | Hospitality POS",
  description:
    "Harbor helps cafes, bars, pubs, and restaurants run orders, team access, inventory, and close-of-day workflows from one platform.",
  applicationName: "Harbor",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Harbor"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a684f"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const showDebug = isDebugEnabled();

  return (
    <html lang="en">
      <body>
        {children}
        {showDebug ? <DebugConsole /> : null}
      </body>
    </html>
  );
}
