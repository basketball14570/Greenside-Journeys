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
  courseTzFor,
  getForecast,
  weatherSnapshotFromForecast,
  waveSplitFromForecast,
} from "@/lib/weather/forecast";
import { WaveSplitChip } from "@/components/edge/WaveSplitChip";
import type { CSSProperties } from "react";

// Staggered entrance delay for each dashboard section.
function rise(i: number): CSSProperties {
  return { ["--gs-delay" as string]: `${i * 70}ms` } as CSSProperties;
}

// Same data, two layouts. CSS switches between them at the lg breakpoint
// so we ship a single component tree without runtime device detection.
export default async function DashboardHome() {
  const event = getActiveEvent();
  const slug = event ? courseSlugFor(event.course) : null;
  const forecast = slug ? await getForecast(slug).catch(() => null) : null;
  const tz = slug ? courseTzFor(slug) : null;
  const snapshot = weatherSnapshotFromForecast(forecast, tz);
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
            <div className="gs-rise" style={rise(0)}>
              <LiveDashboardLeaderboard layout="mobile" fallback={[]} limit={8} />
            </div>
            <div className="gs-rise" style={rise(1)}>
              <WaveSplitChip summary={waveSplit} />
            </div>
            <div className="gs-rise" style={rise(2)}>
              <LiveOpenBets layout="mobile" />
            </div>
            <div className="gs-rise" style={rise(3)}>
              <CourseGuideCard />
            </div>
            <div className="gs-rise" style={rise(4)}>
              <MobileWeatherHero courseName={courseName} snapshot={snapshot} waveSplit={waveSplit} />
            </div>
            <div className="gs-rise" style={rise(5)}>
              <ThisWeeksEdge limit={6} />
            </div>
          </>
        ) : (
          <>
            <div className="gs-rise" style={rise(0)}>
              <CourseGuideCard />
            </div>
            <div className="gs-rise" style={rise(1)}>
              <WaveSplitChip summary={waveSplit} />
            </div>
            <div className="gs-rise" style={rise(2)}>
              <LiveDashboardLeaderboard layout="mobile" fallback={[]} limit={8} />
            </div>
            <div className="gs-rise" style={rise(3)}>
              <LiveOpenBets layout="mobile" />
            </div>
            <div className="gs-rise" style={rise(4)}>
              <MobileWeatherHero courseName={courseName} snapshot={snapshot} waveSplit={waveSplit} />
            </div>
            <div className="gs-rise" style={rise(5)}>
              <ThisWeeksEdge limit={6} />
            </div>
          </>
        )}
      </div>

      {/* ─── Desktop ─── */}
      <div className="hidden lg:flex flex-col gap-6 px-8 py-6">
        <div className="gs-rise gs-lift" style={rise(0)}>
          <CourseGuideCard />
        </div>
        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: "minmax(0, 1fr) 380px" }}
        >
          <div className="flex flex-col gap-6 min-w-0">
            <div className="gs-rise gs-lift" style={rise(1)}>
              <DesktopWeatherHero courseName={courseName} snapshot={snapshot} waveSplit={waveSplit} />
            </div>
            <div className="gs-rise gs-lift" style={rise(3)}>
              <LiveOpenBets layout="desktop" />
            </div>
          </div>
          <div className="flex flex-col gap-6 min-w-0">
            <div className="gs-rise gs-lift" style={rise(2)}>
              <ThisWeeksEdge limit={8} />
            </div>
            <div className="gs-rise gs-lift" style={rise(4)}>
              <LiveDashboardLeaderboard layout="desktop" fallback={[]} limit={12} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
