import { Stat } from "@/components/edge/primitives";
import { DFS_PLAYERS, buildSampleLineup } from "@/lib/demo-dfs";
import { getPlayerHistory } from "@/lib/data/ownership";

const SAMPLE = buildSampleLineup(DFS_PLAYERS);
const TOTAL_SALARY = SAMPLE.picks.reduce((s, p) => s + p.salary, 0);
const TOTAL_PROJ = SAMPLE.picks.reduce((s, p) => s + p.projection, 0);
const AVG_OWN =
  SAMPLE.picks.reduce((s, p) => s + p.ownership, 0) / SAMPLE.picks.length;

export default function DfsPage() {
  return (
    <div className="px-5 lg:px-8 py-6 space-y-6 max-w-7xl mx-auto">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <span
            className="num font-semibold uppercase"
            style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
          >
            ● DraftKings DFS
          </span>
          <h1
            className="serif-italic mt-1.5"
            style={{ fontSize: 36, letterSpacing: -0.4, fontStyle: "normal" }}
          >
            <em>Wave-aware lineup builder.</em>
          </h1>
          <p className="text-text-dim mt-2 max-w-xl" style={{ fontSize: 14 }}>
            Quail Hollow main slate · $50,000 cap · 6 golfers. Projections are
            adjusted for live wind, course fit, and tee-time wave.
          </p>
        </div>
      </header>

      {/* Sample lineup summary */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-[14px] overflow-hidden bg-surface-1 border border-line">
          <div
            className="flex items-baseline justify-between px-5 py-4 border-b border-line"
            style={{ background: "rgba(0,0,0,0.18)" }}
          >
            <div>
              <span
                className="num font-semibold uppercase text-text-muted"
                style={{ fontSize: 9.5, letterSpacing: 1.2 }}
              >
                Suggested lineup · wave-tilted
              </span>
              <div
                className="serif-italic mt-0.5 text-text"
                style={{ fontSize: 20, letterSpacing: -0.2, fontStyle: "normal" }}
              >
                Today&apos;s build
              </div>
            </div>
            <button
              className="font-bold"
              style={{
                background: "#8ee68e",
                color: "#06140c",
                padding: "8px 14px",
                borderRadius: 6,
                fontSize: 12,
              }}
            >
              Export to DK →
            </button>
          </div>

          <div
            className="grid gap-2.5 px-5 py-2.5 num font-semibold uppercase text-text-muted border-b border-line"
            style={{
              gridTemplateColumns: "1.8fr 50px 70px 70px 60px 70px",
              fontSize: 9.5,
              letterSpacing: 1.1,
            }}
          >
            <span>Player</span>
            <span className="text-right">Wave</span>
            <span className="text-right">Salary</span>
            <span className="text-right">Proj</span>
            <span className="text-right">Own%</span>
            <span className="text-right">Wind Δ</span>
          </div>
          {SAMPLE.picks.map((p, i) => (
            <div
              key={p.id}
              className="grid gap-2.5 px-5 py-3 items-center"
              style={{
                gridTemplateColumns: "1.8fr 50px 70px 70px 60px 70px",
                borderBottom:
                  i < SAMPLE.picks.length - 1
                    ? "1px solid rgba(255,255,255,0.06)"
                    : "none",
              }}
            >
              <span className="text-text font-semibold" style={{ fontSize: 13.5 }}>
                {p.name}
              </span>
              <span
                className="num font-semibold text-right"
                style={{
                  fontSize: 10,
                  letterSpacing: 0.8,
                  color: p.wave === "AM" ? "#8ee68e" : "#f5c558",
                }}
              >
                {p.wave}
              </span>
              <span
                className="num text-text text-right"
                style={{ fontSize: 12.5 }}
              >
                ${p.salary.toLocaleString()}
              </span>
              <span
                className="num font-semibold text-text text-right"
                style={{ fontSize: 12.5 }}
              >
                {p.projection.toFixed(1)}
              </span>
              <span
                className="num text-text-dim text-right"
                style={{ fontSize: 12 }}
              >
                {p.ownership}%
              </span>
              <span
                className="num font-semibold text-right"
                style={{
                  fontSize: 12,
                  color:
                    p.windAdj > 0.3
                      ? "#8ee68e"
                      : p.windAdj < -0.3
                        ? "#e07868"
                        : "#a8b3ac",
                }}
              >
                {p.windAdj > 0 ? "+" : ""}
                {p.windAdj.toFixed(1)}
              </span>
            </div>
          ))}
          <div
            className="flex justify-between px-5 py-3 border-t border-line"
            style={{ background: "rgba(0,0,0,0.18)" }}
          >
            <span
              className="num text-text-dim"
              style={{ fontSize: 11, letterSpacing: 0.4 }}
            >
              {SAMPLE.picks.length} golfers ·{" "}
              <span className="text-text font-semibold">
                ${TOTAL_SALARY.toLocaleString()}
              </span>{" "}
              used · ${SAMPLE.remainingSalary.toLocaleString()} left
            </span>
            <span
              className="num font-semibold"
              style={{ fontSize: 11, letterSpacing: 0.4, color: "#8ee68e" }}
            >
              PROJ {TOTAL_PROJ.toFixed(1)} · AVG OWN{" "}
              {AVG_OWN.toFixed(0)}%
            </span>
          </div>
        </div>

        <div className="rounded-[14px] bg-surface-1 border border-line p-5">
          <span
            className="num font-semibold uppercase text-text-muted"
            style={{ fontSize: 9.5, letterSpacing: 1.2 }}
          >
            Slate-wide
          </span>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <Stat
              value={TOTAL_PROJ.toFixed(0)}
              unit="pts"
              label="Lineup projection"
              accent="#8ee68e"
            />
            <Stat
              value={`${AVG_OWN.toFixed(0)}`}
              unit="%"
              label="Avg ownership"
            />
          </div>

          <div className="mt-5 pt-4 border-t border-line">
            <span
              className="num font-semibold uppercase text-text-muted"
              style={{ fontSize: 9.5, letterSpacing: 1.2 }}
            >
              Wave tilt
            </span>
            <p className="text-text-dim mt-2" style={{ fontSize: 13, lineHeight: 1.4 }}>
              AM-wave players currently project{" "}
              <span className="text-text font-semibold">+0.4 strokes</span>{" "}
              vs PM. The optimizer is currently overweighting AM relative to
              chalk.
            </p>
          </div>

          <div className="mt-4">
            <button
              className="w-full font-bold"
              style={{
                background: "#1e4030",
                color: "#f0ebe0",
                padding: "10px 0",
                borderRadius: 6,
                fontSize: 12.5,
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              Generate 20 lineups
            </button>
          </div>
        </div>
      </div>

      <LeverageInsights />

      {/* Full salary table */}
      <div className="rounded-[14px] overflow-hidden bg-surface-1 border border-line">
        <div
          className="px-5 py-4 border-b border-line flex items-baseline justify-between"
          style={{ background: "rgba(0,0,0,0.18)" }}
        >
          <span
            className="serif-italic text-text"
            style={{ fontSize: 17, letterSpacing: -0.2, fontStyle: "normal" }}
          >
            Player pool · 144 entrants
          </span>
          <span
            className="num text-text-muted"
            style={{ fontSize: 11, letterSpacing: 0.4 }}
          >
            Showing top 12 by projection
          </span>
        </div>
        <div
          className="grid gap-2.5 px-5 py-2.5 num font-semibold uppercase text-text-muted border-b border-line"
          style={{
            gridTemplateColumns: "1.6fr 50px 70px 70px 60px 70px 80px",
            fontSize: 9.5,
            letterSpacing: 1.1,
          }}
        >
          <span>Player</span>
          <span className="text-right">Wave</span>
          <span className="text-right">Salary</span>
          <span className="text-right">Proj</span>
          <span className="text-right">Own%</span>
          <span className="text-right">Wind Δ</span>
          <span className="text-right">Floor → Ceil</span>
        </div>
        {DFS_PLAYERS.map((p, i) => {
          const inLineup = SAMPLE.picks.find((x) => x.id === p.id);
          return (
            <div
              key={p.id}
              className="grid gap-2.5 px-5 py-3 items-center relative"
              style={{
                gridTemplateColumns: "1.6fr 50px 70px 70px 60px 70px 80px",
                borderBottom:
                  i < DFS_PLAYERS.length - 1
                    ? "1px solid rgba(255,255,255,0.06)"
                    : "none",
                background: inLineup ? "rgba(142,230,142,0.05)" : "transparent",
              }}
            >
              {inLineup && (
                <div
                  className="absolute"
                  style={{
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    background: "#8ee68e",
                  }}
                />
              )}
              <span
                className="text-text"
                style={{
                  fontSize: 13.5,
                  fontWeight: inLineup ? 600 : 400,
                }}
              >
                {inLineup && <span style={{ color: "#8ee68e", marginRight: 6 }}>★</span>}
                {p.name}
              </span>
              <span
                className="num font-semibold text-right"
                style={{
                  fontSize: 10,
                  letterSpacing: 0.8,
                  color: p.wave === "AM" ? "#8ee68e" : "#f5c558",
                }}
              >
                {p.wave}
              </span>
              <span
                className="num text-text text-right"
                style={{ fontSize: 12.5 }}
              >
                ${p.salary.toLocaleString()}
              </span>
              <span
                className="num font-semibold text-text text-right"
                style={{ fontSize: 12.5 }}
              >
                {p.projection.toFixed(1)}
              </span>
              <span
                className="num text-text-dim text-right"
                style={{ fontSize: 12 }}
              >
                {p.ownership}%
              </span>
              <span
                className="num font-semibold text-right"
                style={{
                  fontSize: 12,
                  color:
                    p.windAdj > 0.3
                      ? "#8ee68e"
                      : p.windAdj < -0.3
                        ? "#e07868"
                        : "#a8b3ac",
                }}
              >
                {p.windAdj > 0 ? "+" : ""}
                {p.windAdj.toFixed(1)}
              </span>
              <span
                className="num text-text-dim text-right"
                style={{ fontSize: 11.5 }}
              >
                {p.floor} → {p.ceiling}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Leverage insights ─────────────────────────────────────
// For each DFS player with historical ownership, compare today's projected
// ownership to their season-long average. Big positive delta = "they're
// chalk this week relative to how they normally play"; big negative delta
// = "the field is sleeping on them." Both are useful signals.
function LeverageInsights() {
  const rows = DFS_PLAYERS.map((p) => {
    const h = getPlayerHistory(p.name);
    if (!h || h.appearances < 2) return null;
    const delta = p.ownership - h.avgOwn;
    return {
      name: p.name,
      projected: p.ownership,
      historical: h.avgOwn,
      delta,
      apps: h.appearances,
      salary: p.salary,
    };
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  const leverage = [...rows].sort((a, b) => a.delta - b.delta).slice(0, 5);
  const chalk = [...rows].sort((a, b) => b.delta - a.delta).slice(0, 5);

  if (rows.length === 0) return null;

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <LeverageCard
        title="Leverage plays"
        subtitle="Projected ownership well below their season average"
        rows={leverage}
        tone="good"
      />
      <LeverageCard
        title="Chalk warning"
        subtitle="Projected ownership well above their season average"
        rows={chalk}
        tone="bad"
      />
    </div>
  );
}

function LeverageCard({
  title,
  subtitle,
  rows,
  tone,
}: {
  title: string;
  subtitle: string;
  rows: { name: string; projected: number; historical: number; delta: number; apps: number; salary: number }[];
  tone: "good" | "bad";
}) {
  const accent = tone === "good" ? "#7fd49a" : "#e87c7c";
  return (
    <div className="rounded-[14px] bg-surface-1 border border-line overflow-hidden">
      <div
        className="px-5 py-4 border-b border-line"
        style={{ background: "rgba(0,0,0,0.18)" }}
      >
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 9.5, letterSpacing: 1.2, color: accent }}
        >
          ● {title}
        </span>
        <div
          className="text-text-dim mt-1"
          style={{ fontSize: 12 }}
        >
          {subtitle}
        </div>
      </div>
      <div
        className="grid gap-2 px-5 py-2.5 num font-semibold uppercase text-text-muted border-b border-line"
        style={{
          gridTemplateColumns: "1.6fr 65px 65px 65px",
          fontSize: 9.5,
          letterSpacing: 1.1,
        }}
      >
        <span>Player</span>
        <span className="text-right">Proj</span>
        <span className="text-right">Avg</span>
        <span className="text-right">Δ</span>
      </div>
      {rows.map((r, i) => (
        <div
          key={r.name}
          className="grid gap-2 px-5 py-3 items-center"
          style={{
            gridTemplateColumns: "1.6fr 65px 65px 65px",
            borderBottom:
              i < rows.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
            fontSize: 13,
          }}
        >
          <div className="min-w-0">
            <div className="text-text font-medium truncate">{r.name}</div>
            <div
              className="num text-text-muted"
              style={{ fontSize: 10.5 }}
            >
              ${r.salary.toLocaleString()} · {r.apps} apps
            </div>
          </div>
          <span className="num text-right text-text" style={{ fontSize: 12.5 }}>
            {r.projected.toFixed(1)}%
          </span>
          <span className="num text-right text-text-dim" style={{ fontSize: 12.5 }}>
            {r.historical.toFixed(1)}%
          </span>
          <span
            className="num text-right font-semibold"
            style={{ fontSize: 12.5, color: accent }}
          >
            {r.delta > 0 ? "+" : ""}
            {r.delta.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}
