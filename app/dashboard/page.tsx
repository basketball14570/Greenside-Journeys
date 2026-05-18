import { EventStrap } from "@/components/edge/chrome";
import {
  AlertsFeed,
  AlertsPanel,
  DesktopBetsTable,
  DesktopWeatherHero,
  MobileOpenBets,
  MobileWeatherHero,
} from "@/components/edge/sections";
import { LiveDashboardLeaderboard } from "@/components/edge/LiveDashboardLeaderboard";
import { ThisWeeksEdge } from "@/components/edge/ThisWeeksEdge";
import { CourseGuideCard } from "@/components/edge/CourseGuideCard";
import {
  DEMO_ALERTS,
  DEMO_ALERTS_DESKTOP,
  DEMO_BETS,
  DEMO_LEADERBOARD,
} from "@/lib/demo-data";

// Same data, two layouts. CSS switches between them at the lg breakpoint
// so we ship a single component tree without runtime device detection.
export default function DashboardHome() {
  return (
    <>
      {/* ─── Mobile ─── */}
      {/* Order: course guide hero (the Sunday-evening briefing) →
          live leaderboard (mid-round scan) → user's open bets →
          alerts → weather → edge ideas. Course guide goes on top
          mid-week (Sun-Wed) and slips below the leaderboard once the
          tournament is live. */}
      <div className="lg:hidden">
        <EventStrap />
        <CourseGuideCard />
        <LiveDashboardLeaderboard
          layout="mobile"
          fallback={DEMO_LEADERBOARD.slice(0, 8)}
          limit={8}
        />
        <MobileOpenBets bets={DEMO_BETS.slice(0, 5)} />
        <AlertsFeed alerts={DEMO_ALERTS} />
        <MobileWeatherHero />
        <ThisWeeksEdge limit={6} />
      </div>

      {/* ─── Desktop ─── */}
      <div className="hidden lg:flex flex-col gap-6 px-8 py-6">
        {/* Course guide spans full width across the top so the
            Sunday-evening briefing is the first thing in view. */}
        <CourseGuideCard />
        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: "minmax(0, 1fr) 380px" }}
        >
          <div className="flex flex-col gap-6 min-w-0">
            <DesktopWeatherHero />
            <DesktopBetsTable bets={DEMO_BETS} />
          </div>
          <div className="flex flex-col gap-6 min-w-0">
            <ThisWeeksEdge limit={8} />
            <AlertsPanel alerts={DEMO_ALERTS_DESKTOP} />
            <LiveDashboardLeaderboard
              layout="desktop"
              fallback={DEMO_LEADERBOARD}
              limit={12}
            />
          </div>
        </div>
      </div>
    </>
  );
}
