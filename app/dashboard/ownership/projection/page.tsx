import Link from "next/link";
import { DK_EVENT } from "@/lib/data/dfs-salaries";
import { joinActual } from "@/lib/dfs/project-ownership";
import { computeHeuristicProjection } from "@/lib/dfs/heuristic-projection";
import { OWNERSHIP_DATA } from "@/lib/data/ownership";

export const dynamic = "force-dynamic";

// Find uploaded actual ownership for this event, if it exists yet.
// Matches any OWNERSHIP_DATA key mentioning "byron nelson" so the delta
// view lights up automatically once actuals are uploaded — no code edit.
function findActual() {
  const key = Object.keys(OWNERSHIP_DATA).find((k) =>
    k.toLowerCase().includes("byron nelson"),
  );
  return key ? OWNERSHIP_DATA[key].players : null;
}

// Projected DFS ownership for the upcoming slate, computed from this
// week's DK salaries + season scoring. Compare against the actual
// ownership you upload after the contest locks.
export default async function OwnershipProjectionPage() {
  const { projections: projection, source } = await computeHeuristicProjection();
  const actual = findActual();
  const deltas = actual ? joinActual(projection, actual) : null;
  const top = projection.slice(0, 60);

  return (
    <div className="px-5 lg:px-8 py-6 space-y-6 max-w-5xl mx-auto">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <span
            className="num font-semibold uppercase"
            style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
          >
            ● Projected ownership
          </span>
          <h1
            className="serif-italic mt-1.5"
            style={{ fontSize: 36, letterSpacing: -0.4, fontStyle: "normal" }}
          >
            <em>{DK_EVENT}.</em>
          </h1>
          <p className="text-text-dim mt-2 max-w-2xl" style={{ fontSize: 14 }}>
            Pre-lock projection from DK salary + season scoring (form). Salary
            and value drive ownership; the model blends both and normalises the
            field so it sums realistically. Compare to actuals once the contest
            locks.
          </p>
        </div>
        <Link
          href="/dashboard/ownership"
          className="rounded-[10px] border border-line px-3 py-1.5 hover:bg-surface-2 self-start"
          style={{ fontSize: 12 }}
        >
          Ownership database →
        </Link>
      </header>

      {deltas && deltas.length > 0 && (
        <div className="rounded-[14px] overflow-hidden bg-surface-1 border border-line">
          <div
            className="px-4 py-3 border-b border-line flex items-baseline justify-between"
            style={{ background: "rgba(0,0,0,0.18)" }}
          >
            <span
              className="serif-italic text-text"
              style={{ fontSize: 17, letterSpacing: -0.2, fontStyle: "normal" }}
            >
              Projected vs actual
            </span>
            <span className="num text-text-muted" style={{ fontSize: 11 }}>
              biggest misses first
            </span>
          </div>
          <div
            className="grid gap-2.5 px-4 py-2.5 num font-semibold uppercase text-text-muted border-b border-line"
            style={{
              gridTemplateColumns: "1.7fr 90px 90px 90px",
              fontSize: 9.5,
              letterSpacing: 1.1,
            }}
          >
            <span>Player</span>
            <span className="text-right">Proj</span>
            <span className="text-right">Actual</span>
            <span className="text-right">Δ</span>
          </div>
          {deltas.slice(0, 25).map((d, i) => (
            <div
              key={d.name}
              className="grid gap-2.5 px-4 py-2 items-center"
              style={{
                gridTemplateColumns: "1.7fr 90px 90px 90px",
                borderBottom:
                  i < 24 ? "1px solid rgba(255,255,255,0.05)" : "none",
              }}
            >
              <span className="text-text font-medium truncate" style={{ fontSize: 13 }}>
                {d.name}
              </span>
              <span className="num text-right text-text-dim" style={{ fontSize: 12.5 }}>
                {d.projOwn.toFixed(1)}%
              </span>
              <span className="num text-right text-text" style={{ fontSize: 12.5 }}>
                {d.actualOwn.toFixed(1)}%
              </span>
              <span
                className="num text-right font-semibold"
                style={{
                  fontSize: 12.5,
                  color: d.delta > 0 ? "#e57373" : d.delta < 0 ? "#7fd49a" : "#a8b3ac",
                }}
              >
                {d.delta > 0 ? "+" : ""}
                {d.delta.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-[14px] overflow-hidden bg-surface-1 border border-line">
        <div
          className="grid gap-2.5 px-4 py-2.5 num font-semibold uppercase text-text-muted border-b border-line"
          style={{
            gridTemplateColumns: "44px 1.7fr 80px 70px 70px 90px",
            fontSize: 9.5,
            letterSpacing: 1.1,
            background: "rgba(0,0,0,0.18)",
          }}
        >
          <span>Rank</span>
          <span>Player</span>
          <span className="text-right">Salary</span>
          <span className="text-right">DK ppg</span>
          <span className="text-right">Value</span>
          <span className="text-right">Proj Own</span>
        </div>
        {top.map((p, i) => (
          <div
            key={p.name}
            className="grid gap-2.5 px-4 py-2.5 items-center"
            style={{
              gridTemplateColumns: "44px 1.7fr 80px 70px 70px 90px",
              borderBottom:
                i < top.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
            }}
          >
            <span className="num text-text-muted" style={{ fontSize: 12 }}>
              {i + 1}
            </span>
            <span className="text-text font-medium truncate" style={{ fontSize: 13.5 }}>
              {p.name}
            </span>
            <span className="num text-right text-text-dim" style={{ fontSize: 12.5 }}>
              ${p.salary.toLocaleString()}
            </span>
            <span className="num text-right text-text-dim" style={{ fontSize: 12.5 }}>
              {p.ppg.toFixed(1)}
            </span>
            <span className="num text-right text-text-dim" style={{ fontSize: 12.5 }}>
              {p.value.toFixed(2)}
            </span>
            <OwnBar pct={p.projOwn} />
          </div>
        ))}
      </div>

      <p className="text-text-muted" style={{ fontSize: 11.5, lineHeight: 1.5 }}>
        {projection.length} golfers in the field ·{" "}
        {source === "v2-datagolf"
          ? "model v2 (salary + value + DataGolf top-20 form signal)"
          : "model v1.1 (salary + value — DataGolf signal unavailable this load)"}
        . Projection is directional, not a guarantee.
      </p>
    </div>
  );
}

function OwnBar({ pct }: { pct: number }) {
  const width = Math.min(100, (pct / 45) * 100);
  return (
    <span className="flex items-center justify-end gap-2">
      <span
        className="rounded"
        style={{
          width: `${width}%`,
          maxWidth: 44,
          height: 6,
          background: pct >= 25 ? "#f5c558" : pct >= 12 ? "#7fd49a" : "#3a5c48",
        }}
      />
      <span className="num text-text font-semibold" style={{ fontSize: 12.5, minWidth: 38, textAlign: "right" }}>
        {pct.toFixed(1)}%
      </span>
    </span>
  );
}
