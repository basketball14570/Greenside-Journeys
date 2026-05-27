import { EventStrap } from "@/components/edge/chrome";
import {
  DesktopWeatherHero,
  MobileWeatherHero,
} from "@/components/edge/sections";
import { LiveDashboardLeaderboard } from "@/components/edge/LiveDashboardLeaderboard";
import { LiveOpenBets } from "@/components/edge/LiveOpenBets";
import { ThisWeeksEdge } from "@/components/edge/ThisWeeksEdge";
import { CourseGuideCard } from "@/components/edge/CourseGuideCard";
import { getActiveEvent, statusOf } from "@/lib/data/pga-schedule";
import {
  courseSlugFor,
  getForecast,
  weatherSnapshotFromForecast,
  waveSplitFromForecast,
} from "@/lib/weather/forecast";
import { WaveSplitChip } from "@/components/edge/WaveSplitChip";

// Same data, two layouts. CSS switches between them at the lg breakpoint
// so we ship a single component tree without runtime device detection.
export default async function DashboardHome() {
  const event = getActiveEvent();
  const slug = event ? courseSlugFor(event.course) : null;
  const forecast = slug ? await getForecast(slug).catch(() => null) : null;
  const snapshot = weatherSnapshotFromForecast(forecast);
  const courseName = event?.course;
  // Thursday→Sunday the tournament is actually being played — promote
  // the live leaderboard to the top of the mobile Today screen. Mon-Wed
  // (the build-up days) keep the current order with course/weather first.
  const isTournamentLive = event ? statusOf(event) === "live" : false;
  const waveSplit =
    slug && event
      ? waveSplitFromForecast(forecast, slug, event.startDate)
      : null;

  return (
    <>
      {/* ─── Mobile ─── */}
      <div className="lg:hidden">
        <EventStrap />
        {isTournamentLive ? (
          <>
            <LiveDashboardLeaderboard layout="mobile" fallback={[]} limit={8} />
            <WaveSplitChip summary={waveSplit} />
            <LiveOpenBets layout="mobile" />
            <CourseGuideCard />
            <MobileWeatherHero courseName={courseName} snapshot={snapshot} waveSplit={waveSplit} />
            <ThisWeeksEdge limit={6} />
          </>
        ) : (
          <>
            <CourseGuideCard />
            <WaveSplitChip summary={waveSplit} />
            <LiveDashboardLeaderboard layout="mobile" fallback={[]} limit={8} />
            <LiveOpenBets layout="mobile" />
            <MobileWeatherHero courseName={courseName} snapshot={snapshot} waveSplit={waveSplit} />
            <ThisWeeksEdge limit={6} />
          </>
        )}
      </div>

      {/* ─── Desktop ─── */}
      <div className="hidden lg:flex flex-col gap-6 px-8 py-6">
        <CourseGuideCard />
        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: "minmax(0, 1fr) 380px" }}
        >
          <div className="flex flex-col gap-6 min-w-0">
            <DesktopWeatherHero courseName={courseName} snapshot={snapshot} waveSplit={waveSplit} />
            <LiveOpenBets layout="desktop" />
          </div>
          <div className="flex flex-col gap-6 min-w-0">
            <ThisWeeksEdge limit={8} />
            <LiveDashboardLeaderboard layout="desktop" fallback={[]} limit={12} />
          </div>
        </div>
      </div>
    </>
  );
}
