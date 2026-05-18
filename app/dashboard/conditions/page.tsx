import Link from "next/link";
import {
  Stat,
  StatusDot,
  WaveSplit,
  WindArrow,
  WindSpark,
} from "@/components/edge/primitives";
import { ALERT_HISTORY, COURSES, type CourseSnapshot } from "@/lib/demo-courses";

const ALERT_COLOR = {
  wave: "#8ee68e",
  wind: "#f5c558",
  hedge: "#e07868",
  precip: "#7cc0e8",
} as const;

const ALERT_LABEL = {
  wave: "◐ Wave Shift",
  wind: "⌇ Wind Alert",
  hedge: "◇ Hedge Avail.",
  precip: "☂ Precip",
} as const;

export default function ConditionsPage() {
  return (
    <div className="px-5 lg:px-8 py-6 space-y-6 max-w-7xl mx-auto">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <span
            className="num font-semibold uppercase"
            style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
          >
            ● Live Conditions
          </span>
          <h1
            className="serif-italic mt-1.5"
            style={{ fontSize: 36, letterSpacing: -0.4, fontStyle: "normal" }}
          >
            <em>Course weather & alerts.</em>
          </h1>
          <p className="text-text-dim mt-2 max-w-xl" style={{ fontSize: 14 }}>
            Live wind, gust, and precip from the tournament venues you&apos;re
            exposed to. Alert history scoped to the bets in your portfolio.
          </p>
        </div>
        <span
          className="num text-text-muted"
          style={{ fontSize: 11, letterSpacing: 0.4 }}
        >
          Updated 7:44 AM · refreshes every 10 min
        </span>
      </header>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {COURSES.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
        <AlertHistoryPanel />
      </div>
    </div>
  );
}

function CourseCard({ course }: { course: CourseSnapshot }) {
  const isLive = course.status === "live";
  return (
    <div
      className="relative rounded-[14px] overflow-hidden border border-line"
      style={{
        background:
          "linear-gradient(135deg, #163024 0%, #112519 60%, #0b1a11 100%)",
      }}
    >
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          top: -80,
          right: -80,
          width: 280,
          height: 280,
          background: isLive
            ? "radial-gradient(circle, rgba(245,197,88,0.13) 0%, transparent 65%)"
            : "radial-gradient(circle, rgba(124,192,232,0.1) 0%, transparent 65%)",
        }}
      />

      <div className="relative p-5 lg:p-6">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <span
              className="num font-semibold uppercase text-text-muted"
              style={{ fontSize: 9.5, letterSpacing: 1.3 }}
            >
              {course.tournament} · {course.round}
            </span>
            <Link
              href={`/courses/${course.id}`}
              className="serif-italic mt-0.5 text-text hover:opacity-80 transition block"
              style={{ fontSize: 22, letterSpacing: -0.3, fontStyle: "normal" }}
            >
              {course.name} →
            </Link>
            <div className="num text-text-dim mt-1" style={{ fontSize: 11.5 }}>
              {course.location}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isLive ? (
              <>
                <StatusDot status="live" />
                <span
                  className="num font-semibold"
                  style={{ fontSize: 10.5, color: "#8ee68e", letterSpacing: 0.8 }}
                >
                  {course.round} LIVE
                </span>
              </>
            ) : (
              <span
                className="num font-semibold uppercase"
                style={{
                  fontSize: 10,
                  letterSpacing: 1,
                  color: "#7cc0e8",
                  padding: "3px 7px",
                  borderRadius: 4,
                  background: "rgba(124,192,232,0.13)",
                  border: "1px solid rgba(124,192,232,0.27)",
                }}
              >
                {course.status === "upcoming" ? "Upcoming" : "Final"}
              </span>
            )}
          </div>
        </div>

        <div
          className="text-text-dim mb-4 max-w-2xl"
          style={{ fontSize: 13.5, lineHeight: 1.45 }}
        >
          {course.conditionsEdge}
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          <div>
            <Stat value={course.wind.toString()} unit="mph" label="Sustained" />
            <div className="flex items-center gap-2 mt-2">
              <WindArrow degrees={course.windDir} size={18} />
              <span
                className="num text-text-dim"
                style={{ fontSize: 11.5, letterSpacing: 0.5 }}
              >
                {course.windDirLabel} · gust {course.gust}
              </span>
            </div>
          </div>

          <div>
            <span
              className="num font-semibold uppercase text-text-muted"
              style={{ fontSize: 9.5, letterSpacing: 1.2 }}
            >
              Hourly · 6 AM → 8 PM
            </span>
            <div className="mt-2">
              <WindSpark data={course.hourly} width={260} height={68} />
            </div>
          </div>

          <div>
            <span
              className="num font-semibold uppercase text-text-muted"
              style={{ fontSize: 9.5, letterSpacing: 1.2 }}
            >
              Wave Split
            </span>
            <div className="mt-2">
              <WaveSplit am={course.amSg} pm={course.pmSg} width={260} />
            </div>
          </div>
        </div>

        <div
          className="mt-5 pt-4 border-t border-line flex flex-wrap gap-x-6 gap-y-2"
          style={{ fontSize: 11.5 }}
        >
          <FactStat label="Temp" value={`${course.temperatureF}°F`} />
          <FactStat label="Humidity" value={`${course.humidity}%`} />
          <FactStat
            label="Precip"
            value={
              course.precipIntensity > 0
                ? `${course.precipIntensity.toFixed(1)} mm/hr`
                : `${course.precipChance}% chance`
            }
            tone={course.precipIntensity > 0 ? "warn" : undefined}
          />
          <span className="flex-1" />
          <FactStat
            label="Your bets"
            value={
              course.yourBets.am + course.yourBets.pm > 0
                ? `${course.yourBets.am} AM · ${course.yourBets.pm} PM`
                : "—"
            }
          />
        </div>
      </div>
    </div>
  );
}

function FactStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn";
}) {
  const color = tone === "warn" ? "#f5c558" : "#f0ebe0";
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className="num text-text-muted uppercase"
        style={{ fontSize: 9.5, letterSpacing: 1.1 }}
      >
        {label}
      </span>
      <span className="num font-semibold" style={{ fontSize: 12, color }}>
        {value}
      </span>
    </div>
  );
}

function AlertHistoryPanel() {
  return (
    <div className="rounded-[14px] overflow-hidden bg-surface-1 border border-line h-fit">
      <div
        className="flex items-center justify-between px-4 py-3.5 border-b border-line"
        style={{ background: "rgba(0,0,0,0.18)" }}
      >
        <span
          className="serif-italic text-text"
          style={{ fontSize: 17, letterSpacing: -0.2, fontStyle: "normal" }}
        >
          Alert history
        </span>
        <span
          className="num text-text-muted"
          style={{ fontSize: 10.5, letterSpacing: 0.6 }}
        >
          {ALERT_HISTORY.length} today
        </span>
      </div>
      {ALERT_HISTORY.map((a, i) => (
        <div
          key={a.id}
          className="flex gap-2.5 px-4 py-3"
          style={{
            borderBottom:
              i < ALERT_HISTORY.length - 1
                ? "1px solid rgba(255,255,255,0.06)"
                : "none",
          }}
        >
          <div
            className="shrink-0 self-stretch rounded-full"
            style={{ width: 3, background: ALERT_COLOR[a.kind] }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between gap-2 mb-0.5">
              <span
                className="num font-semibold uppercase"
                style={{
                  fontSize: 9.5,
                  letterSpacing: 1,
                  color: ALERT_COLOR[a.kind],
                }}
              >
                {ALERT_LABEL[a.kind]}
              </span>
              <span
                className="num text-text-muted"
                style={{ fontSize: 10 }}
              >
                {a.time.split(" · ")[1] ?? a.time}
              </span>
            </div>
            <div
              className="num text-text-muted mb-1"
              style={{ fontSize: 10, letterSpacing: 0.4 }}
            >
              {a.course}
            </div>
            <div
              className="text-text font-medium mb-0.5"
              style={{ fontSize: 13, lineHeight: 1.35 }}
            >
              {a.title}
            </div>
            <div
              className="text-text-dim"
              style={{ fontSize: 12, lineHeight: 1.4 }}
            >
              {a.detail}
            </div>
            {a.affectedBets > 0 && (
              <div
                className="num font-semibold mt-1.5 inline-flex items-center gap-1"
                style={{ fontSize: 10, letterSpacing: 0.4, color: "#8ee68e" }}
              >
                ★ {a.affectedBets} bet{a.affectedBets === 1 ? "" : "s"} affected
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
