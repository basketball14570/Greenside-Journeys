import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PWARegister } from "@/components/edge/PWARegister";

export const metadata: Metadata = {
  title: "Greenside — Golf Bet Intelligence",
  description:
    "Live course conditions, every bet across every book, and wave-aware DFS lineups for serious golf bettors.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Greenside",
  },
  icons: {
    icon: "/brand/greenside-journeys-icon.svg",
    apple: "/brand/greenside-journeys-icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a1f14",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-bg">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bg text-text">
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
