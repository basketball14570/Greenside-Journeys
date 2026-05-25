import Link from "next/link";
import { Stat } from "@/components/edge/primitives";
import { buildSampleLineup, type DfsPlayer } from "@/lib/demo-dfs";
import { buildRealSlate } from "@/lib/dfs/slate";
import { getPlayerHistory } from "@/lib/data/ownership";
import { OptimizerPanel } from "@/components/edge/OptimizerPanel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function value(p: DfsPlayer): number {
  return p.salary > 0 ? (p.projection / p.salary) * 1000 : 0;
}

export default async function DfsPage() {
  const slate = await buildRealSlate();
  const players = slate.players;
  const sample = buildSampleLineup(players);
  const totalSalary = sample.picks.reduce((s, p) => s + p.salary, 0);
  const totalProj = sample.picks.reduce((s, p) => s + p.projection, 0);
  const avgOwn =
    sample.picks.length > 0
      ? sample.picks.reduce((s, p) => s + p.ownership, 0) / sample.picks.length
      : 0;
  const pool = [...players].sort((a, b) => b.projection - a.projection);
  const modelLabel =
    slate.source === "v2-datagolf"
      ? "Ownership: live model + DataGolf form"
      : "Ownership: live model (salary + value)";

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
            <em>{slate.event}</em>
          </h1>
          <p className="text-text-dim mt-2 max-w-xl" style={{ fontSize: 14 }}>
            Live DK salaries · projections from DK season scoring (AvgPPG), with
            projected ownership from the model. Tee-time / wind tilt activates
            once the draw posts.
          </p>
        </div>
        <Link
          href="/dashboard/dfs/cut-sweat"
          className="num rounded-[8px] border border-line px-3 py-2 hover:border-line-strong shrink-0"
          style={{ fontSize: 12.5 }}
        >
          Cut sweat →
        </Link>
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
                Suggested lineup · best value under cap
              </span>
              <div
                className="serif-italic mt-0.5 text-text"
                style={{ fontSize: 20, letterSpacing: -0.2, fontStyle: "normal" }}
              >
                Today&apos;s build
              </div>
            </div>
          </div>

          <div
            className="grid gap-2.5 px-5 py-2.5 num font-semibold uppercase text-text-muted border-b border-line"
            style={{
              gridTemplateColumns: "2fr 80px 70px 70px 60px",
              fontSize: 9.5,
              letterSpacing: 1.1,
            }}
          >
            <span>Player</span>
            <span className="text-right">Salary</span>
            <span className="text-right">Proj</span>
            <span className="text-right">Value</span>
            <span className="text-right">Own%</span>
          </div>
          {sample.picks.map((p, i) => (
            <div
              key={p.id}
              className="grid gap-2.5 px-5 py-3 items-center"
              style={{
                gridTemplateColumns: "2fr 80px 70px 70px 60px",
                borderBottom:
                  i < sample.picks.length - 1
                    ? "1px solid rgba(255,255,255,0.06)"
                    : "none",
              }}
            >
              <span className="text-text font-semibold" style={{ fontSize: 13.5 }}>
                {p.name}
              </span>
              <span className="num text-text text-right" style={{ fontSize: 12.5 }}>
                ${p.salary.toLocaleString()}
              </span>
              <span
                className="num font-semibold text-text text-right"
                style={{ fontSize: 12.5 }}
              >
                {p.projection.toFixed(1)}
              </span>
              <span className="num text-text-dim text-right" style={{ fontSize: 12 }}>
                {value(p).toFixed(2)}
              </span>
              <span className="num text-text-dim text-right" style={{ fontSize: 12 }}>
                {p.ownership.toFixed(1)}%
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
              {sample.picks.length} golfers ·{" "}
              <span className="text-text font-semibold">
                ${totalSalary.toLocaleString()}
              </span>{" "}
              used · ${sample.remainingSalary.toLocaleString()} left
            </span>
            <span
              className="num font-semibold"
              style={{ fontSize: 11, letterSpacing: 0.4, color: "#8ee68e" }}
            >
              PROJ {totalProj.toFixed(1)} · AVG OWN {avgOwn.toFixed(0)}%
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
              value={totalProj.toFixed(0)}
              unit="pts"
              label="Lineup projection"
              accent="#8ee68e"
            />
            <Stat value={`${avgOwn.toFixed(0)}`} unit="%" label="Avg ownership" />
          </div>

          <div className="mt-5 pt-4 border-t border-line">
            <span
              className="num font-semibold uppercase text-text-muted"
              style={{ fontSize: 9.5, letterSpacing: 1.2 }}
            >
              Model
            </span>
            <p className="text-text-dim mt-2" style={{ fontSize: 13, lineHeight: 1.4 }}>
              {players.length} golfers in the pool. {modelLabel}. Projection is
              DK season AvgPPG; run the optimizer below to leverage-tilt off the
              chalk.
            </p>
          </div>
        </div>
      </div>

      {/* Mobile reorders these into Leverage → Ownership → Optimizer. */}
      <div className="flex flex-col gap-6 lg:contents">
        <div className="order-3 lg:order-none">
          <OptimizerPanel players={players} />
        </div>
        <div className="order-1 lg:order-none">
          <LeverageInsights players={players} />
        </div>
        <div className="order-2 lg:order-none">
          <ProjectedOwnershipPreview players={players} />
        </div>
      </div>

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
            Player pool · {players.length} golfers
          </span>
          <span
            className="num text-text-muted"
            style={{ fontSize: 11, letterSpacing: 0.4 }}
          >
            Showing top 20 by projection
          </span>
        </div>
        <div
          className="grid gap-2.5 px-5 py-2.5 num font-semibold uppercase text-text-muted border-b border-line"
          style={{
            gridTemplateColumns: "2fr 80px 70px 70px 60px 90px",
            fontSize: 9.5,
            letterSpacing: 1.1,
          }}
        >
          <span>Player</span>
          <span className="text-right">Salary</span>
          <span className="text-right">Proj</span>
          <span className="text-right">Value</span>
          <span className="text-right">Own%</span>
          <span className="text-right">Floor → Ceil</span>
        </div>
        {pool.slice(0, 20).map((p, i, arr) => {
          const inLineup = sample.picks.find((x) => x.id === p.id);
          return (
            <div
              key={p.id}
              className="grid gap-2.5 px-5 py-3 items-center relative"
              style={{
                gridTemplateColumns: "2fr 80px 70px 70px 60px 90px",
                borderBottom:
                  i < arr.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                background: inLineup ? "rgba(142,230,142,0.05)" : "transparent",
              }}
            >
              {inLineup && (
                <div
                  className="absolute"
                  style={{ left: 0, top: 0, bottom: 0, width: 2, background: "#8ee68e" }}
                />
              )}
              <span
                className="text-text"
                style={{ fontSize: 13.5, fontWeight: inLineup ? 600 : 400 }}
              >
                {inLineup && <span style={{ color: "#8ee68e", marginRight: 6 }}>★</span>}
                {p.name}
              </span>
              <span className="num text-text text-right" style={{ fontSize: 12.5 }}>
                ${p.salary.toLocaleString()}
              </span>
              <span
                className="num font-semibold text-text text-right"
                style={{ fontSize: 12.5 }}
              >
                {p.projection.toFixed(1)}
              </span>
              <span className="num text-text-dim text-right" style={{ fontSize: 12 }}>
                {value(p).toFixed(2)}
              </span>
              <span className="num text-text-dim text-right" style={{ fontSize: 12 }}>
                {p.ownership.toFixed(1)}%
              </span>
              <span className="num text-text-dim text-right" style={{ fontSize: 11.5 }}>
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
// For each player with historical ownership, compare today's projected
// ownership to their season-long average. Big positive delta = chalk relative
// to how they normally play; big negative = the field is sleeping on them.
function LeverageInsights({ players }: { players: DfsPlayer[] }) {
  const rows = players
    .map((p) => {
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
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const leverage = [...rows].sort((a, b) => a.delta - b.delta).slice(0, 5);
  const chalk = [...rows].sort((a, b) => b.delta - a.delta).slice(0, 5);

  if (rows.length === 0) return null;

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <LeverageCard
        title="Chalk warning"
        subtitle="Projected ownership well above their season average"
        rows={chalk}
        tone="bad"
      />
      <LeverageCard
        title="Leverage plays"
        subtitle="Projected ownership well below their season average"
        rows={leverage}
        tone="good"
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
        <div className="text-text-dim mt-1" style={{ fontSize: 12 }}>
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
            <div className="num text-text-muted" style={{ fontSize: 10.5 }}>
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

// ─── Projected ownership preview ───────────────────────────
function ProjectedOwnershipPreview({ players }: { players: DfsPlayer[] }) {
  const top = [...players].sort((a, b) => b.ownership - a.ownership).slice(0, 6);

  return (
    <Link
      href="/dashboard/ownership"
      className="block rounded-[14px] border-2 p-4 lg:p-5 transition hover:bg-surface-2/40"
      style={{
        borderColor: "rgba(127,212,154,0.35)",
        background:
          "radial-gradient(ellipse at 80% 0%, rgba(127,212,154,0.08), transparent 60%), #14110e",
      }}
    >
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.3, color: "#7fd49a" }}
        >
          ● Projected ownership
        </span>
        <span
          className="num text-text-muted"
          style={{ fontSize: 10, letterSpacing: 0.5 }}
        >
          Top 6 · this week
        </span>
      </div>
      <div
        className="serif-italic mt-1.5"
        style={{ fontSize: 22, letterSpacing: -0.3, fontStyle: "normal", color: "#f0ebe0" }}
      >
        <em>Where the field is going.</em>
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {top.map((p) => (
          <li
            key={p.name}
            className="flex items-baseline justify-between gap-2 num"
            style={{ fontSize: 12.5 }}
          >
            <span className="truncate" style={{ color: "#f0ebe0" }}>
              {p.name}
            </span>
            <span className="font-semibold" style={{ color: "#7fd49a" }}>
              {p.ownership.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
      <div
        className="mt-3 num font-semibold uppercase"
        style={{ fontSize: 10.5, letterSpacing: 1.2, color: "#8ee68e" }}
      >
        Read the full ownership board →
      </div>
    </Link>
  );
}
