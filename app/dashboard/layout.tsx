import {
  DesktopAppBar,
  DesktopEventStrap,
  MobileBottomNav,
  MobileTopBar,
} from "@/components/edge/chrome";

// Responsive chrome: mobile (<lg) gets the top bar + bottom nav from the
// mobile design; desktop gets the AppBar + EventStrap. The active tab and
// the event strap are static for now — wired to route + tournament data later.
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      {/* Desktop chrome */}
      <div className="hidden lg:block">
        <DesktopAppBar />
        <DesktopEventStrap />
      </div>

      {/* Mobile chrome */}
      <div className="lg:hidden pt-3">
        <MobileTopBar />
      </div>

      <main className="flex-1 min-w-0">{children}</main>

      {/* Mobile bottom nav */}
      <div className="lg:hidden">
        <MobileBottomNav active="home" />
      </div>
    </div>
  );
}
