import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Stat,
  StatusDot,
  WaveSplit,
  WindArrow,
  WindSpark,
} from "@/components/edge/primitives";
import { COURSE_PROFILES, type CourseProfile, type HoleStat, type SeasonAvg } from "@/lib/demo-course-profiles";
import { COURSES } from "@/lib/demo-courses";
import {
  DesktopAppBar,
  DesktopEventStrap,
  MobileBottomNav,
  MobileTopBar,
} from "@/components/edge/chrome";

export function generateStaticParams() {
  return Object.keys(COURSE_PROFILES).map((slug) => ({ slug }));
}

export default function CoursePage({ params }: { params: { slug: string } }) {
  const profile = COURSE_PROFILES[params.slug];
  const live = COURSES.find((c) => c.id === params.slug);
  if (!profile) return notFound();

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      <div className="hidden lg:block">
        <DesktopAppBar active="Course Lab" />
        <DesktopEventStrap />
      </div>
      <div className="lg:hidden pt-3">
        <MobileTopBar />
      </div>

      <main className="flex-1 px-5 lg:px-8 py-6 max-w-7xl mx-auto w-full space-y-6">
        <Link
          href="/dashboard/conditions"
          className="num text-text-dim hover:text-text inline-flex items-center gap-1.5"
          style={{ fontSize: 11.5, letterSpacing: 0.4 }}
        >
          ← Course Lab
        </Link>

        <CourseHeader profile={profile} live={live} />

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <HoleByHole holes={profile.holes} />
            <HistoryCard history={profile.history} />
          </div>
          <div className="space-y-5">
            <WaveCard profile={profile} />
            <DesignCard profile={profile} />
          </div>
        </div>
      </main>

      <div className="lg:hidden">
        <MobileBottomNav active="course" />
      </div>
    </div>
  );
}

// ─── Header ─────────────────────────────────────────────────
function CourseHeader({
  profile,
  live,
}: {
  profile: CourseProfile;
  live: (typeof COURSES)[number] | undefined;
}) {
  return (
    <div
      className="relative rounded-[18px] overflow-hidden border border-line p-6 lg:p-8"
      style={{
        background:
          "linear-gradient(135deg, #1d3a26 0%, #112519 50%, #0b1a11 100%)",
      }}
    >
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          top: -80,
          right: -80,
          width: 320,
          height: 320,
          background:
            "radial-gradient(circle, rgba(245,197,88,0.13) 0%, transparent 65%)",
        }}
      />
      <div className="relative grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <span
            className="num font-semibold uppercase"
            style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
          >
            ● Course profile
          </span>
          <h1
            className="serif-italic mt-1.5 text-text"
            style={{ fontSize: 40, letterSpacing: -0.5, fontStyle: "normal" }}
          >
            <em>{live?.name ?? profile.slug}</em>
          </h1>
          <div
            className="num text-text-dim mt-2"
            style={{ fontSize: 12, letterSpacing: 0.4 }}
          >
            {live?.location} · {profile.archetype} · Par {profile.par} ·{" "}
            {profile.yards.toLocaleString()} yards
          </div>
          <p
            className="text-text-dim mt-4 max-w-2xl"
            style={{ fontSize: 14, lineHeight: 1.5 }}
          >
            {profile.blurb}
          </p>
        </div>

        {live && (
          <div className="lg:border-l lg:border-line lg:pl-6">
            <div className="flex items-center gap-2 mb-3">
              {live.status === "live" ? (
                <>
                  <StatusDot status="live" />
                  <span
                    className="num font-semibold"
                    style={{ fontSize: 10.5, color: "#8ee68e", letterSpacing: 0.8 }}
                  >
                    {live.round} LIVE
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
                  {live.status === "upcoming" ? "Upcoming" : "Final"}
                </span>
              )}
            </div>
            <Stat value={live.wind.toString()} unit="mph" label="Sustained" />
            <div className="flex items-center gap-2 mt-2">
              <WindArrow degrees={live.windDir} size={18} />
              <span
                className="num text-text-dim"
                style={{ fontSize: 11.5, letterSpacing: 0.5 }}
              >
                {live.windDirLabel} · gust {live.gust}
              </span>
            </div>
            <div className="mt-4">
              <WindSpark data={live.hourly} width={260} height={56} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Hole-by-hole ───────────────────────────────────────────
const WIND_TONE: Record<HoleStat["windExposure"], string> = {
  HEAD: "#e07868",
  TAIL: "#8ee68e",
  "CROSS-L": "#f5c558",
  "CROSS-R": "#f5c558",
  MIXED: "#a8b3ac",
};

function HoleByHole({ holes }: { holes: HoleStat[] }) {
  const front = holes.slice(0, 9);
  const back = holes.slice(9);
  return (
    <div className="rounded-[14px] overflow-hidden bg-surface-1 border border-line">
      <div
        className="flex items-baseline justify-between px-5 py-4 border-b border-line"
        style={{ background: "rgba(0,0,0,0.18)" }}
      >
        <span
          className="serif-italic text-text"
          style={{ fontSize: 17, letterSpacing: -0.2, fontStyle: "normal" }}
        >
          Hole-by-hole
        </span>
        <span
          className="num text-text-muted"
          style={{ fontSize: 11, letterSpacing: 0.4 }}
        >
          Scoring avg vs par · wind exposure
        </span>
      </div>
      <Nine label="Front nine" holes={front} />
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />
      <Nine label="Back nine" holes={back} />
    </div>
  );
}

function Nine({ label, holes }: { label: string; holes: HoleStat[] }) {
  return (
    <div>
      <div
        className="px-5 py-2 num font-semibold uppercase text-text-muted"
        style={{ fontSize: 9.5, letterSpacing: 1.2 }}
      >
        {label}
      </div>
      <div
        className="grid gap-2 px-5 pb-3"
        style={{ gridTemplateColumns: "repeat(9, 1fr)" }}
      >
        {holes.map((h) => {
          const sgColor =
            h.scoringAvg > 0.15
              ? "#e07868"
              : h.scoringAvg < -0.1
                ? "#8ee68e"
                : "#a8b3ac";
          return (
            <div
              key={h.hole}
              className="text-center rounded-md px-1 py-2"
              style={{
                background: "rgba(0,0,0,0.18)",
                border: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <div
                className="num font-bold text-text"
                style={{ fontSize: 13 }}
              >
                {h.hole}
              </div>
              <div
                className="num text-text-muted"
                style={{ fontSize: 9, letterSpacing: 0.4 }}
              >
                Par {h.par} · {h.yards}y
              </div>
              <div
                className="num font-bold mt-1"
                style={{ fontSize: 12.5, color: sgColor }}
              >
                {h.scoringAvg > 0 ? "+" : ""}
                {h.scoringAvg.toFixed(2)}
              </div>
              <div
                className="num font-semibold mt-1"
                style={{
                  fontSize: 8.5,
                  letterSpacing: 0.4,
                  color: WIND_TONE[h.windExposure],
                }}
              >
                {h.windExposure}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── History ────────────────────────────────────────────────
function HistoryCard({ history }: { history: SeasonAvg[] }) {
  return (
    <div className="rounded-[14px] bg-surface-1 border border-line p-5">
      <div className="flex items-baseline justify-between mb-3">
        <span
          className="serif-italic text-text"
          style={{ fontSize: 17, letterSpacing: -0.2, fontStyle: "normal" }}
        >
          Five-year history
        </span>
        <span
          className="num text-text-muted"
          style={{ fontSize: 11, letterSpacing: 0.4 }}
        >
          Field avg score · cut line · avg wind
        </span>
      </div>
      <div
        className="grid gap-2 num font-semibold uppercase text-text-muted border-b border-line pb-2 mb-2"
        style={{
          gridTemplateColumns: "60px 1fr 1fr 1fr",
          fontSize: 9.5,
          letterSpacing: 1.1,
        }}
      >
        <span>Year</span>
        <span className="text-right">Field avg</span>
        <span className="text-right">Cut line</span>
        <span className="text-right">Avg wind</span>
      </div>
      {history.map((h) => (
        <div
          key={h.year}
          className="grid gap-2 py-2.5"
          style={{ gridTemplateColumns: "60px 1fr 1fr 1fr" }}
        >
          <span className="num text-text" style={{ fontSize: 13 }}>
            {h.year}
          </span>
          <span
            className="num font-semibold text-right text-text"
            style={{ fontSize: 13 }}
          >
            {h.fieldAvgScore.toFixed(1)}
          </span>
          <span className="num text-right text-text" style={{ fontSize: 13 }}>
            {h.cutLine > 0 ? "+" : ""}
            {h.cutLine}
          </span>
          <span
            className="num text-right text-text-dim"
            style={{ fontSize: 13 }}
          >
            {h.windAvgMph} mph
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Wave card ──────────────────────────────────────────────
function WaveCard({ profile }: { profile: CourseProfile }) {
  const diff = profile.waveSplit.pmAvg - profile.waveSplit.amAvg;
  return (
    <div className="rounded-[14px] bg-surface-1 border border-line p-5">
      <span
        className="num font-semibold uppercase text-text-muted"
        style={{ fontSize: 9.5, letterSpacing: 1.2 }}
      >
        Historical wave split
      </span>
      <div className="mt-3">
        <WaveSplit
          am={+(profile.waveSplit.amAvg - profile.par).toFixed(2)}
          pm={+(profile.waveSplit.pmAvg - profile.par).toFixed(2)}
          width={260}
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-center">
        <div>
          <div
            className="num text-text-muted"
            style={{ fontSize: 9.5, letterSpacing: 0.8 }}
          >
            AM AVG
          </div>
          <div
            className="serif-italic"
            style={{ fontSize: 24, lineHeight: 1, fontStyle: "italic", color: "#8ee68e" }}
          >
            {profile.waveSplit.amAvg.toFixed(1)}
          </div>
        </div>
        <div>
          <div
            className="num text-text-muted"
            style={{ fontSize: 9.5, letterSpacing: 0.8 }}
          >
            PM AVG
          </div>
          <div
            className="serif-italic"
            style={{
              fontSize: 24,
              lineHeight: 1,
              fontStyle: "italic",
              color: diff > 0.4 ? "#e07868" : "#f5c558",
            }}
          >
            {profile.waveSplit.pmAvg.toFixed(1)}
          </div>
        </div>
      </div>
      <p
        className="text-text-dim mt-4"
        style={{ fontSize: 12.5, lineHeight: 1.45 }}
      >
        AM wave plays{" "}
        <span className="text-text font-semibold">
          {Math.abs(diff).toFixed(1)} strokes {diff > 0 ? "easier" : "harder"}
        </span>{" "}
        than PM across the last {profile.waveSplit.sampleRounds.toLocaleString()}{" "}
        rounds. Direction usually flips with the sea breeze.
      </p>
    </div>
  );
}

// ─── Design card ────────────────────────────────────────────
function DesignCard({ profile }: { profile: CourseProfile }) {
  return (
    <div className="rounded-[14px] bg-surface-1 border border-line p-5">
      <span
        className="num font-semibold uppercase text-text-muted"
        style={{ fontSize: 9.5, letterSpacing: 1.2 }}
      >
        Design
      </span>
      <dl
        className="mt-3 space-y-2 text-text-dim"
        style={{ fontSize: 13 }}
      >
        <Row label="Designer" value={profile.designer} />
        <Row label="Established" value={profile.established.toString()} />
        <Row label="Yards" value={profile.yards.toLocaleString()} />
        <Row label="Par" value={profile.par.toString()} />
        <Row label="Archetype" value={profile.archetype} />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt
        className="num text-text-muted uppercase"
        style={{ fontSize: 9.5, letterSpacing: 1.1 }}
      >
        {label}
      </dt>
      <dd className="text-text text-right">{value}</dd>
    </div>
  );
}
