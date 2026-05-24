"use client";

import { useEffect, useMemo, useState } from "react";
import { DK_EVENT, DK_SALARIES } from "@/lib/data/dfs-salaries";
import { projectOwnership } from "@/lib/dfs/project-ownership";

type ProjRow = {
  name: string;
  salary: number;
  projOwn: number;
  value: number;
  ppg: number;
  marketProb: number | null;
};

function mean(xs: number[]) {
  return xs.reduce((s, x) => s + x, 0) / (xs.length || 1);
}
function stdev(xs: number[], m: number) {
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length || 1)) || 1;
}

function levColor(l: number): string {
  if (l >= 0.75) return "#7fd49a";
  if (l >= 0.1) return "#cfe8b0";
  if (l > -0.1) return "#a8b3ac";
  if (l > -0.75) return "#f5c558";
  return "#e87c7c";
}

// Leverage = how a player's expected production stacks up against their
// projected ownership. Positive = under-owned for what we expect them to do
// (a GPP pivot); negative = chalk priced above its production (fade candidate).
export function LeverageView() {
  const [rows, setRows] = useState<ProjRow[]>(() =>
    projectOwnership(DK_SALARIES).map((p) => ({
      name: p.name,
      salary: p.salary,
      projOwn: p.projOwn,
      value: p.value,
      ppg: p.ppg,
      marketProb: p.marketProb,
    })),
  );
  const [usingMarket, setUsingMarket] = useState(false);
  const [sort, setSort] = useState<"leverage" | "fade" | "own">("leverage");
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/dfs/heuristic-ownership")
      .then((r) => r.json())
      .then((j: { projections?: ProjRow[] }) => {
        if (Array.isArray(j.projections) && j.projections.length) setRows(j.projections);
      })
      .catch(() => {});
  }, []);

  const scored = useMemo(() => {
    // Production signal: DataGolf top-20 probability when we have it for enough
    // of the field (captures form + course fit), else salary-adjusted value.
    const withMarket = rows.filter((r) => r.marketProb != null).length;
    const useMarket = withMarket >= Math.min(20, rows.length * 0.5);
    const prod = (r: ProjRow) => (useMarket ? r.marketProb ?? 0 : r.value);

    const prods = rows.map(prod);
    const owns = rows.map((r) => r.projOwn);
    const pm = mean(prods);
    const ps = stdev(prods, pm);
    const om = mean(owns);
    const os = stdev(owns, om);

    const out = rows.map((r) => {
      const zP = (prod(r) - pm) / ps;
      const zO = (r.projOwn - om) / os;
      return { ...r, leverage: zP - zO };
    });
    return { useMarket, out };
  }, [rows]);

  // Set the market flag for the header note (effect avoids render-time setState).
  useEffect(() => setUsingMarket(scored.useMarket), [scored.useMarket]);

  const view = useMemo(() => {
    const f = scored.out.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));
    if (sort === "leverage") f.sort((a, b) => b.leverage - a.leverage);
    else if (sort === "fade") f.sort((a, b) => a.leverage - b.leverage);
    else f.sort((a, b) => b.projOwn - a.projOwn);
    return f;
  }, [scored, q, sort]);

  return (
    <div className="space-y-3">
      <div className="rounded-[14px] border border-line p-5 bg-surface-1 space-y-2">
        <div className="serif-italic" style={{ fontSize: 24, fontStyle: "normal" }}>
          <em>Leverage.</em>
        </div>
        <div className="text-text-dim" style={{ fontSize: 13 }}>
          <span className="text-text">{DK_EVENT}</span> · {rows.length} golfers
        </div>
        <p className="text-text-dim" style={{ fontSize: 12 }}>
          Expected production vs projected ownership. <span style={{ color: "#7fd49a" }}>Green</span>{" "}
          = under-owned for what we expect (a tournament pivot);{" "}
          <span style={{ color: "#e87c7c" }}>red</span> = chalk priced above its production (fade).
          Production uses {usingMarket ? "DataGolf top-20 probability (form + course fit)" : "salary-adjusted value (DataGolf signal unavailable)"}.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          placeholder="Filter players…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 min-w-[180px] rounded-[8px] border border-line bg-surface-1 px-3 py-2 text-text"
          style={{ fontSize: 13 }}
        />
        <Chip current={sort} value="leverage" onPick={setSort}>Best leverage</Chip>
        <Chip current={sort} value="fade" onPick={setSort}>Chalk to fade</Chip>
        <Chip current={sort} value="own" onPick={setSort}>Ownership</Chip>
      </div>

      <div className="rounded-[14px] border border-line overflow-hidden">
        <div
          className="grid gap-2 px-4 py-2.5 num font-semibold uppercase text-text-muted border-b border-line"
          style={{ gridTemplateColumns: "2fr 80px 90px 90px 90px", fontSize: 10, letterSpacing: 1.1, background: "rgba(0,0,0,0.18)" }}
        >
          <span>Player</span>
          <span className="text-right">Salary</span>
          <span className="text-right">Proj own</span>
          <span className="text-right">{usingMarket ? "Top 20%" : "Value"}</span>
          <span className="text-right">Leverage</span>
        </div>
        {view.map((r) => (
          <div
            key={r.name}
            className="grid gap-2 px-4 py-3 border-b border-line/50 last:border-b-0"
            style={{ gridTemplateColumns: "2fr 80px 90px 90px 90px", fontSize: 13 }}
          >
            <span className="text-text">{r.name}</span>
            <span className="num text-right text-text-dim">${r.salary.toLocaleString()}</span>
            <span className="num text-right text-text-dim">{r.projOwn.toFixed(1)}%</span>
            <span className="num text-right text-text-dim">
              {usingMarket
                ? r.marketProb != null
                  ? `${(r.marketProb > 1 ? r.marketProb : r.marketProb * 100).toFixed(1)}%`
                  : "—"
                : r.value.toFixed(2)}
            </span>
            <span className="num text-right font-semibold" style={{ color: levColor(r.leverage) }}>
              {r.leverage >= 0 ? "+" : ""}
              {r.leverage.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Chip<T extends string>({
  current,
  value,
  onPick,
  children,
}: {
  current: T;
  value: T;
  onPick: (v: T) => void;
  children: React.ReactNode;
}) {
  const active = current === value;
  return (
    <button
      onClick={() => onPick(value)}
      className="num font-semibold uppercase transition"
      style={{
        padding: "5px 10px",
        borderRadius: 5,
        fontSize: 10.5,
        letterSpacing: 0.6,
        color: active ? "#f0ebe0" : "#a8b3ac",
        background: active ? "#1e4030" : "transparent",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {children}
    </button>
  );
}
