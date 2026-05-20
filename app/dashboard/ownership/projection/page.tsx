import Link from "next/link";
import { DK_EVENT, DK_SALARIES } from "@/lib/data/dfs-salaries";
import { projectOwnership } from "@/lib/dfs/project-ownership";

// Projected DFS ownership for the upcoming slate, computed from this
// week's DK salaries + season scoring. Compare against the actual
// ownership you upload after the contest locks.
export default function OwnershipProjectionPage() {
  const projection = projectOwnership(DK_SALARIES);
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
        {projection.length} golfers in the field · model v1 (salary + form
        heuristic). Projection is directional, not a guarantee.
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
