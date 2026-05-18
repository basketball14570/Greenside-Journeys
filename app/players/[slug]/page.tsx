import Link from "next/link";
import { notFound } from "next/navigation";
import { Stat, BookChip, type Book } from "@/components/edge/primitives";
import { PLAYERS, type RecentRound, type CourseFit, type PlayerProfile } from "@/lib/demo-players";
import { DesktopAppBar, DesktopEventStrap, MobileTopBar, MobileBottomNav } from "@/components/edge/chrome";
import { getPlayerHistory } from "@/lib/data/ownership";

export function generateStaticParams() {
  return Object.keys(PLAYERS).map((slug) => ({ slug }));
}

export default function PlayerPage({ params }: { params: { slug: string } }) {
  const p = PLAYERS[params.slug];
  if (!p) return notFound();

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      <div className="hidden lg:block">
        <DesktopAppBar active="Tickets" />
        <DesktopEventStrap />
      </div>
      <div className="lg:hidden">
        <div className="pt-3">
          <MobileTopBar />
        </div>
        <MobileBottomNav active="bets" />
      </div>

      <main className="flex-1 px-5 lg:px-8 py-6 max-w-7xl mx-auto w-full space-y-6">
        <Link
          href="/dashboard"
          className="num text-text-dim hover:text-text inline-flex items-center gap-1.5"
          style={{ fontSize: 11.5, letterSpacing: 0.4 }}
        >
          ← Back to dashboard
        </Link>

        <PlayerHeader p={p} />

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <RecentForm rounds={p.recent} />
            <CourseFitCard fit={p.fit} />
          </div>
          <div className="space-y-5">
            <SensitivityCard p={p} />
            <OwnershipHistoryCard playerName={p.name} />
            <YourExposure p={p} />
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Header ─────────────────────────────────────────────────
function PlayerHeader({ p }: { p: PlayerProfile }) {
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
      <div className="relative flex items-start justify-between flex-wrap gap-5">
        <div>
          <span
            className="num font-semibold uppercase"
            style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
          >
            ● Player profile
          </span>
          <h1
            className="serif-italic mt-1.5 text-text flex items-center gap-3 flex-wrap"
            style={{ fontSize: 42, letterSpacing: -0.5, fontStyle: "normal" }}
          >
            <span>{p.countryFlag}</span>
            <em>{p.name}</em>
          </h1>
          <div
            className="num text-text-dim mt-2"
            style={{ fontSize: 12, letterSpacing: 0.4 }}
          >
            World rank #{p.worldRank} · Age {p.age}
          </div>
          <p
            className="text-text-dim mt-4 max-w-xl"
            style={{ fontSize: 14, lineHeight: 1.5 }}
          >
            {p.edge}
          </p>
        </div>
        <div className="flex gap-6 flex-wrap">
          <Stat
            value={p.sgBaseline.toFixed(2)}
            label="SG · baseline"
            accent="#8ee68e"
          />
          <Stat
            value={p.windSensitivity.toFixed(2)}
            label="Wind sens."
            accent={
              p.windSensitivity > 0.35
                ? "#e07868"
                : p.windSensitivity > 0.25
                  ? "#f5c558"
                  : "#8ee68e"
            }
          />
        </div>
      </div>
    </div>
  );
}

// ─── Recent form ────────────────────────────────────────────
function RecentForm({ rounds }: { rounds: RecentRound[] }) {
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
          Recent form
        </span>
        <span
          className="num text-text-muted"
          style={{ fontSize: 11, letterSpacing: 0.4 }}
        >
          Last 5 starts
        </span>
      </div>
      <div
        className="grid gap-2.5 px-5 py-2.5 num font-semibold uppercase text-text-muted border-b border-line"
        style={{
          gridTemplateColumns: "1.8fr 60px 60px 56px 56px 56px 56px 50px",
          fontSize: 9,
          letterSpacing: 1.1,
        }}
      >
        <span>Event</span>
        <span className="text-right">Finish</span>
        <span className="text-right">SG Tot</span>
        <span className="text-right">OTT</span>
        <span className="text-right">APP</span>
        <span className="text-right">ARG</span>
        <span className="text-right">PUTT</span>
        <span className="text-right">Wind</span>
      </div>
      {rounds.map((r, i) => (
        <div
          key={i}
          className="grid gap-2.5 px-5 py-3 items-center"
          style={{
            gridTemplateColumns: "1.8fr 60px 60px 56px 56px 56px 56px 50px",
            borderBottom:
              i < rounds.length - 1
                ? "1px solid rgba(255,255,255,0.06)"
                : "none",
          }}
        >
          <div className="min-w-0">
            <div
              className="text-text font-medium truncate"
              style={{ fontSize: 13 }}
            >
              {r.event}
            </div>
            <div className="num text-text-muted" style={{ fontSize: 10.5 }}>
              {new Date(r.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </div>
          </div>
          <span
            className="num font-semibold text-right"
            style={{
              fontSize: 12,
              color:
                r.finish === "W"
                  ? "#8ee68e"
                  : r.finish === "MC"
                    ? "#e07868"
                    : "#f0ebe0",
            }}
          >
            {r.finish}
          </span>
          <SGCell value={r.sgTotal} bold />
          <SGCell value={r.sgOtt} />
          <SGCell value={r.sgApp} />
          <SGCell value={r.sgArg} />
          <SGCell value={r.sgPutt} />
          <span
            className="num text-text-dim text-right"
            style={{ fontSize: 11 }}
          >
            {r.windMph}
          </span>
        </div>
      ))}
    </div>
  );
}

function SGCell({ value, bold }: { value: number; bold?: boolean }) {
  const color = value > 0 ? "#8ee68e" : value < 0 ? "#e07868" : "#a8b3ac";
  return (
    <span
      className="num text-right"
      style={{ fontSize: 12, color, fontWeight: bold ? 700 : 400 }}
    >
      {value > 0 ? "+" : ""}
      {value.toFixed(1)}
    </span>
  );
}

// ─── Course fit ─────────────────────────────────────────────
function CourseFitCard({ fit }: { fit: CourseFit[] }) {
  const max = Math.max(...fit.map((f) => Math.abs(f.sgPerRound)));
  return (
    <div className="rounded-[14px] bg-surface-1 border border-line p-5">
      <div className="flex items-baseline justify-between mb-3">
        <span
          className="serif-italic text-text"
          style={{ fontSize: 17, letterSpacing: -0.2, fontStyle: "normal" }}
        >
          Course fit
        </span>
        <span
          className="num text-text-muted"
          style={{ fontSize: 11, letterSpacing: 0.4 }}
        >
          Strokes gained per round by archetype
        </span>
      </div>
      <div className="space-y-3">
        {fit.map((f) => {
          const color =
            f.sgPerRound > 1.5 ? "#8ee68e" : f.sgPerRound < 1 ? "#e07868" : "#f5c558";
          return (
            <div key={f.archetype} className="flex items-center gap-3">
              <span className="text-text" style={{ fontSize: 13, width: 160 }}>
                {f.archetype}
              </span>
              <div
                className="flex-1 rounded-full overflow-hidden"
                style={{ height: 6, background: "rgba(255,255,255,0.05)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(f.sgPerRound / max) * 100}%`,
                    background: color,
                  }}
                />
              </div>
              <span
                className="num font-semibold text-right"
                style={{ fontSize: 12, color, width: 60 }}
              >
                +{f.sgPerRound.toFixed(2)}
              </span>
              <span
                className="num text-text-muted text-right"
                style={{ fontSize: 11, width: 64 }}
              >
                {f.rounds} rds
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sensitivity card ───────────────────────────────────────
function SensitivityCard({ p }: { p: PlayerProfile }) {
  const tone =
    p.windSensitivity > 0.35
      ? "#e07868"
      : p.windSensitivity > 0.25
        ? "#f5c558"
        : "#8ee68e";
  return (
    <div className="rounded-[14px] bg-surface-1 border border-line p-5">
      <span
        className="num font-semibold uppercase text-text-muted"
        style={{ fontSize: 9.5, letterSpacing: 1.2 }}
      >
        Wind sensitivity
      </span>
      <div className="flex items-baseline gap-2 mt-1.5">
        <span
          className="serif-italic"
          style={{
            fontSize: 56,
            lineHeight: 0.9,
            color: tone,
            fontStyle: "italic",
          }}
        >
          {p.windSensitivity.toFixed(2)}
        </span>
        <span
          className="num text-text-dim"
          style={{ fontSize: 11, letterSpacing: 0.5 }}
        >
          str/rd per +10mph
        </span>
      </div>
      <div
        className="num font-semibold uppercase mt-2.5 inline-block"
        style={{
          fontSize: 10,
          letterSpacing: 0.8,
          color: tone,
          padding: "3px 7px",
          borderRadius: 4,
          background: `${tone}1f`,
          border: `1px solid ${tone}55`,
        }}
      >
        {p.windSensitivityRank}
      </div>
      <p
        className="text-text-dim mt-3"
        style={{ fontSize: 12.5, lineHeight: 1.45 }}
      >
        Fitted on the last 3 seasons of DataGolf round data, regressed against
        on-course wind during their tee times.
      </p>
    </div>
  );
}

// ─── Your exposure ──────────────────────────────────────────
function YourExposure({ p }: { p: PlayerProfile }) {
  const net = p.exposure.lifetimeNetU;
  return (
    <div className="rounded-[14px] bg-surface-1 border border-line p-5">
      <span
        className="num font-semibold uppercase text-text-muted"
        style={{ fontSize: 9.5, letterSpacing: 1.2 }}
      >
        Your exposure
      </span>
      <div className="grid grid-cols-3 gap-3 mt-3">
        <div>
          <div
            className="num text-text-muted"
            style={{ fontSize: 9.5, letterSpacing: 0.8 }}
          >
            BETS
          </div>
          <div
            className="serif-italic"
            style={{ fontSize: 24, lineHeight: 1, color: "#f0ebe0", fontStyle: "italic" }}
          >
            {p.exposure.lifetimeBets}
          </div>
        </div>
        <div>
          <div
            className="num text-text-muted"
            style={{ fontSize: 9.5, letterSpacing: 0.8 }}
          >
            WIN RATE
          </div>
          <div
            className="serif-italic"
            style={{ fontSize: 24, lineHeight: 1, color: "#f0ebe0", fontStyle: "italic" }}
          >
            {(p.exposure.winRate * 100).toFixed(0)}%
          </div>
        </div>
        <div>
          <div
            className="num text-text-muted"
            style={{ fontSize: 9.5, letterSpacing: 0.8 }}
          >
            NET
          </div>
          <div
            className="serif-italic"
            style={{
              fontSize: 24,
              lineHeight: 1,
              color: net > 0 ? "#8ee68e" : net < 0 ? "#e07868" : "#f0ebe0",
              fontStyle: "italic",
            }}
          >
            {net > 0 ? "+" : ""}
            {net.toFixed(1)}u
          </div>
        </div>
      </div>

      {p.exposure.openBets.length > 0 && (
        <>
          <div
            className="num font-semibold uppercase text-text-muted mt-5 mb-2"
            style={{ fontSize: 9.5, letterSpacing: 1.2 }}
          >
            Open bets · this player
          </div>
          {p.exposure.openBets.map((b, i) => {
            const evColor =
              b.ev > 5 ? "#8ee68e" : b.ev < -5 ? "#e07868" : "#a8b3ac";
            return (
              <div
                key={i}
                className="rounded-[10px] border border-line p-3 mb-2"
                style={{ background: "rgba(0,0,0,0.18)" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <BookChip book={b.book as Book} />
                  <span className="flex-1" />
                  <span
                    className="num font-bold"
                    style={{ fontSize: 11.5, color: evColor }}
                  >
                    {b.ev > 0 ? "+" : ""}
                    {b.ev}% EV
                  </span>
                </div>
                <div className="text-text" style={{ fontSize: 13 }}>
                  {b.market}
                </div>
                <div
                  className="num text-text-muted mt-0.5"
                  style={{ fontSize: 11 }}
                >
                  {b.line} · {b.stake}u
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ─── Ownership history ─────────────────────────────────────
function OwnershipHistoryCard({ playerName }: { playerName: string }) {
  const h = getPlayerHistory(playerName);
  if (!h) return null;

  const max = Math.max(...h.history.map((e) => e.own), 5);

  return (
    <div className="rounded-[14px] border border-line p-5 bg-surface-1">
      <div className="flex items-baseline justify-between mb-3">
        <span
          className="serif-italic text-text"
          style={{ fontSize: 17, letterSpacing: -0.2, fontStyle: "normal" }}
        >
          DFS ownership history
        </span>
        <Link
          href="/dashboard/ownership"
          className="text-text-dim hover:text-text num"
          style={{ fontSize: 11, letterSpacing: 0.4 }}
        >
          Browse →
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <Stat label="Apps" value={`${h.appearances}`} />
        <Stat
          label="Avg own"
          value={`${h.avgOwn.toFixed(1)}%`}
          accent={h.avgOwn >= 15 ? "#e07868" : h.avgOwn <= 5 ? "#8ee68e" : "#f0ebe0"}
        />
        <Stat label="Peak" value={`${h.maxOwn.toFixed(1)}%`} />
      </div>

      <div className="space-y-1.5">
        {h.history.slice(0, 6).map((e) => {
          const w = Math.max(2, (e.own / max) * 100);
          const color =
            e.own >= 20 ? "#e87c7c" : e.own >= 15 ? "#f5c558" : e.own >= 7 ? "#a8b3ac" : "#7fd49a";
          return (
            <div key={e.tournament} className="flex items-center gap-2.5">
              <span
                className="num text-text-dim shrink-0"
                style={{ fontSize: 11, width: 120 }}
              >
                {shortenTourn(e.tournament)}
              </span>
              <div className="flex-1 h-[18px] relative bg-bg/60 rounded-[3px] overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    width: `${w}%`,
                    background: color,
                    opacity: 0.65,
                  }}
                />
              </div>
              <span
                className="num text-right shrink-0"
                style={{ fontSize: 11, width: 48, color }}
              >
                {e.own.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function shortenTourn(name: string): string {
  return name
    .replace(/\s*Championship\s*/i, " Ch.")
    .replace(/\s*Invitational\s*/i, " Inv.")
    .replace(/\s+2026\s*$/, "")
    .replace(/\s+Open\s*$/, " Op.")
    .slice(0, 18);
}
