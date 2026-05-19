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
import { getActiveEvent } from "@/lib/data/pga-schedule";
import {
  courseSlugFor,
  getForecast,
  weatherSnapshotFromForecast,
} from "@/lib/weather/forecast";

// Same data, two layouts. CSS switches between them at the lg breakpoint
// so we ship a single component tree without runtime device detection.
export default async function DashboardHome() {
  const event = getActiveEvent();
  const slug = event ? courseSlugFor(event.course) : null;
  const forecast = slug ? await getForecast(slug).catch(() => null) : null;
  const snapshot = weatherSnapshotFromForecast(forecast);
  const courseName = event?.course;

  return (
    <>
      {/* ─── Mobile ─── */}
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
        <MobileWeatherHero courseName={courseName} snapshot={snapshot} />
        <ThisWeeksEdge limit={6} />
      </div>

      {/* ─── Desktop ─── */}
      <div className="hidden lg:flex flex-col gap-6 px-8 py-6">
        <CourseGuideCard />
        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: "minmax(0, 1fr) 380px" }}
        >
          <div className="flex flex-col gap-6 min-w-0">
            <DesktopWeatherHero courseName={courseName} snapshot={snapshot} />
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
