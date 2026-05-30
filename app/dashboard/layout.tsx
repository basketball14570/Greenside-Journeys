"use client";

import { usePathname } from "next/navigation";
import {
  DesktopAppBar,
  MobileBottomNav,
  MobileTopBar,
} from "@/components/edge/chrome";
import { LiveEventStrap } from "@/components/edge/LiveEventStrap";
import { LiveTicker } from "@/components/edge/LiveTicker";
import { DashboardFooter } from "@/components/edge/DashboardFooter";
import { CommandPalette } from "@/components/edge/CommandPalette";
import { PwaInstallPrompt } from "@/components/edge/PwaInstallPrompt";
import { ToastProvider } from "@/components/edge/Toast";

// Responsive chrome: mobile (<lg) gets the brand bar + sticky tab nav
// at the top; desktop gets the AppBar + LiveEventStrap. The active tab
// is derived from the URL so the highlight follows the user.
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const mobileActive = activeMobileTabFor(pathname);
  const desktopActive = activeDesktopTabFor(pathname);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-bg text-text flex flex-col">
        {/* Desktop chrome */}
        <div className="hidden lg:block">
          <DesktopAppBar active={desktopActive} />
          <LiveTicker />
          <LiveEventStrap />
        </div>

        {/* Mobile chrome — brand bar + tab nav, both at the top. The
            tab bar is sticky so it stays visible while scrolling. */}
        <div className="lg:hidden">
          <div className="pt-3">
            <MobileTopBar />
          </div>
          <LiveTicker />
          <MobileBottomNav active={mobileActive} />
        </div>

        <main className="flex-1 min-w-0">{children}</main>

        <DashboardFooter />

        <CommandPalette />
        <PwaInstallPrompt />
      </div>
    </ToastProvider>
  );
}

// Map a pathname to the mobile tab id. Mobile shows 6 tabs (home/live/dfs/
// weather/leaderboard/guide), so everything outside those routes falls back
// to the closest match (e.g. /dashboard/parlay → live).
function activeMobileTabFor(pathname: string | null): string {
  if (!pathname) return "home";
  if (pathname === "/dashboard") return "home";
  if (pathname.startsWith("/dashboard/live")) return "live";
  if (pathname.startsWith("/dashboard/parlay")) return "live";
  if (pathname.startsWith("/dashboard/bets")) return "live";
  if (pathname.startsWith("/dashboard/slip")) return "live";
  if (pathname.startsWith("/dashboard/upload")) return "live";
  if (pathname.startsWith("/dashboard/dfs")) return "dfs";
  if (pathname.startsWith("/dashboard/ownership")) return "dfs";
  if (pathname.startsWith("/dashboard/weather")) return "weather";
  if (pathname.startsWith("/dashboard/conditions")) return "weather";
  if (pathname.startsWith("/dashboard/leaderboard")) return "leaderboard";
  if (pathname.startsWith("/dashboard/guide")) return "guide";
  if (pathname.startsWith("/courses/")) return "guide";
  return "home";
}

// Desktop nav labels are what DesktopAppBar matches against. The
// dropdown items also surface highlights, but mapping to a primary tab
// is good enough for the active-state visual.
function activeDesktopTabFor(pathname: string | null): string {
  if (!pathname) return "Today";
  if (pathname === "/dashboard") return "Today";
  if (pathname.startsWith("/dashboard/bets")) return "Tickets";
  if (pathname.startsWith("/dashboard/upload")) return "Tickets";
  if (pathname.startsWith("/dashboard/slip")) return "Tickets";
  if (pathname.startsWith("/dashboard/command")) return "Command Center";
  if (pathname.startsWith("/dashboard/live")) return "Live";
  if (pathname.startsWith("/dashboard/parlay")) return "Live";
  if (pathname.startsWith("/dashboard/weather")) return "Weather";
  if (pathname.startsWith("/dashboard/odds")) return "Odds";
  if (pathname.startsWith("/dashboard/leaderboard")) return "Leaderboard";
  if (pathname.startsWith("/dashboard/ask")) return "Ask";
  if (pathname.startsWith("/dashboard/dfs")) return "DFS";
  if (pathname.startsWith("/dashboard/guide")) return "Course Guide";
  if (pathname.startsWith("/dashboard/conditions")) return "Course Lab";
  if (pathname.startsWith("/dashboard/schedule")) return "Schedule";
  if (pathname.startsWith("/dashboard/preview")) return "Previews";
  if (pathname.startsWith("/dashboard/ownership")) return "Ownership";
  if (pathname.startsWith("/dashboard/backtest")) return "Backtest";
  if (pathname.startsWith("/dashboard/model")) return "Model";
  if (pathname.startsWith("/dashboard/newsletter")) return "Newsletter";
  if (pathname.startsWith("/dashboard/account")) return "Bankroll";
  if (pathname.startsWith("/dashboard/admin")) return "Admin";
  return "Today";
}
