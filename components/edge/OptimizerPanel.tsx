"use client";

import { useMemo, useState } from "react";
import { DFS_PLAYERS } from "@/lib/demo-dfs";
import {
  optimizeLineups,
  type Lineup,
  type OptimizerWeights,
  DEFAULT_WEIGHTS,
} from "@/lib/dfs-optimizer";

// Monte Carlo lineup builder. Lives below the static lineup card on
// /dashboard/dfs. The user dials in weight sliders (expected score vs
// ceiling vs leverage), hits Run, and we generate a candidate pool,
// simulate each one with shared wave-wind correlation, then surface the
// top 20 by composite score.

export function OptimizerPanel() {
  const [weights, setWeights] = useState<OptimizerWeights>(DEFAULT_WEIGHTS);
  const [results, setResults] = useState<Lineup[] | null>(null);
  const [pop, setPop] = useState<{ meanSim: number; meanCeiling: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  function run() {
    setRunning(true);
    // Yield to the browser so the button can flip to "Running…". The
    // sim itself is fast (<300ms for 1500 candidates × 200 sims on a
    // recent laptop) but rendering the spinner needs a frame to land.
    setTimeout(() => {
      const out = optimizeLineups(DFS_PLAYERS, { weights, topK: 20 });
      setResults(out.lineups);
      setPop(out.population);
      setRunning(false);
      setExpanded(0);
    }, 16);
  }

  const summary = useMemo(() => {
    if (!results || !pop) return null;
    const top = results[0];
    return {
      topMean: top.meanSim,
      topCeiling: top.ceiling,
      uplift: ((top.meanSim - pop.meanSim) / pop.meanSim) * 100,
    };
  }, [results, pop]);

  return (
    <section className="rounded-[14px] border border-line bg-surface-1 overflow-hidden">
      <div
        className="px-5 py-4 border-b border-line flex items-baseline justify-between flex-wrap gap-3"
        style={{ background: "rgba(0,0,0,0.18)" }}
      >
        <div>
          <span
            className="num font-semibold uppercase text-text-muted"
            style={{ fontSize: 9.5, letterSpacing: 1.2 }}
          >
            Monte Carlo optimizer
          </span>
          <div
            className="serif-italic mt-0.5"
            style={{ fontSize: 20, letterSpacing: -0.2, fontStyle: "normal" }}
          >
            Wave-correlated lineup search
          </div>
        </div>
        {summary && (
          <span
            className="num text-text-dim"
            style={{ fontSize: 12 }}
          >
            Top mean{" "}
            <span style={{ color: "#7fd49a", fontWeight: 600 }}>
              {summary.topMean.toFixed(1)}
            </span>{" "}
            · ceiling{" "}
            <span style={{ color: "#f5c558", fontWeight: 600 }}>
              {summary.topCeiling.toFixed(1)}
            </span>{" "}
            · {summary.uplift > 0 ? "+" : ""}
            {summary.uplift.toFixed(1)}% vs pool
          </span>
        )}
      </div>

      <div className="p-5 space-y-4">
        <p className="text-text-dim" style={{ fontSize: 13, lineHeight: 1.45 }}>
          Generates 1,500 candidate lineups under the cap, simulates 200
          outcomes per lineup with shared AM/PM wind correlation, scores
          each on a weighted blend of expected points, 90th-percentile
          ceiling, and ownership leverage.
        </p>

        <div className="grid sm:grid-cols-3 gap-4">
          <WeightSlider
            label="Expected"
            hint="Mean simulated points"
            value={weights.expected}
            onChange={(v) => setWeights({ ...weights, expected: v })}
            color="#7fd49a"
          />
          <WeightSlider
            label="Ceiling"
            hint="90th percentile — what wins GPPs"
            value={weights.ceiling}
            onChange={(v) => setWeights({ ...weights, ceiling: v })}
            color="#f5c558"
          />
          <WeightSlider
            label="Leverage"
            hint="Reward under-owned vs field median"
            value={weights.leverage}
            onChange={(v) => setWeights({ ...weights, leverage: v })}
            color="#7cc0e8"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={run}
            disabled={running}
            className="rounded-[8px] px-4 py-2 font-semibold disabled:opacity-40"
            style={{ background: "#8ee68e", color: "#0a1f14", fontSize: 13 }}
          >
            {running ? "Running…" : results ? "Re-run" : "Run optimizer"}
          </button>
          {results && pop && (
            <span className="text-text-dim" style={{ fontSize: 12 }}>
              {results.length} lineups · pool of 1,500 ·{" "}
              <span className="num">
                pop mean {pop.meanSim.toFixed(1)} / ceiling {pop.meanCeiling.toFixed(1)}
              </span>
            </span>
          )}
        </div>
      </div>

      {results && (
        <div className="border-t border-line">
          <div
            className="grid gap-2 px-5 py-2.5 num font-semibold uppercase text-text-muted border-b border-line"
            style={{
              gridTemplateColumns: "40px 1fr 80px 80px 80px 70px 70px",
              fontSize: 9.5,
              letterSpacing: 1.1,
              background: "rgba(0,0,0,0.18)",
            }}
          >
            <span>#</span>
            <span>Lineup</span>
            <span className="text-right">Salary</span>
            <span className="text-right">Mean</span>
            <span className="text-right">Ceiling</span>
            <span className="text-right">Avg own</span>
            <span className="text-right">Score</span>
          </div>
          {results.map((l, i) => (
            <LineupRow
              key={i}
              i={i}
              l={l}
              isOpen={expanded === i}
              onToggle={() => setExpanded(expanded === i ? null : i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function WeightSlider({
  label,
  hint,
  value,
  onChange,
  color,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1.5">
        <span
          className="num font-semibold uppercase text-text-muted"
          style={{ fontSize: 10, letterSpacing: 1.1 }}
        >
          {label}
        </span>
        <span className="num" style={{ fontSize: 13, color }}>
          {value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: color }}
      />
      <div className="text-text-dim mt-1" style={{ fontSize: 11 }}>
        {hint}
      </div>
    </label>
  );
}

function LineupRow({
  i,
  l,
  isOpen,
  onToggle,
}: {
  i: number;
  l: Lineup;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const compact = l.picks
    .map((p) => p.name.split(" ").pop())
    .join(" · ");
  return (
    <>
      <button
        onClick={onToggle}
        className="w-full text-left grid gap-2 px-5 py-3 items-center hover:bg-surface-2"
        style={{
          gridTemplateColumns: "40px 1fr 80px 80px 80px 70px 70px",
          fontSize: 12.5,
          borderBottom: isOpen ? "none" : "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span className="num text-text-dim">{i + 1}</span>
        <span className="text-text truncate">{compact}</span>
        <span className="num text-right text-text-dim">
          ${l.salary.toLocaleString()}
        </span>
        <span className="num text-right" style={{ color: "#7fd49a" }}>
          {l.meanSim.toFixed(1)}
        </span>
        <span className="num text-right" style={{ color: "#f5c558" }}>
          {l.ceiling.toFixed(1)}
        </span>
        <span className="num text-right text-text-dim">
          {l.avgOwnership.toFixed(1)}%
        </span>
        <span
          className="num text-right font-semibold"
          style={{ color: l.score > 0 ? "#7fd49a" : "#e87c7c" }}
        >
          {l.score > 0 ? "+" : ""}
          {l.score.toFixed(2)}
        </span>
      </button>
      {isOpen && (
        <div
          className="px-5 py-3 border-b border-line"
          style={{ background: "rgba(0,0,0,0.18)" }}
        >
          <div className="grid sm:grid-cols-2 gap-3">
            {l.picks.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-[6px] px-3 py-2"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  fontSize: 12.5,
                }}
              >
                <span
                  className="num font-semibold uppercase shrink-0"
                  style={{
                    fontSize: 9.5,
                    letterSpacing: 0.8,
                    color: p.wave === "AM" ? "#8ee68e" : "#f5c558",
                    width: 22,
                  }}
                >
                  {p.wave}
                </span>
                <span className="flex-1 text-text">{p.name}</span>
                <span className="num text-text-dim">
                  ${p.salary.toLocaleString()}
                </span>
                <span
                  className="num text-text-dim"
                  style={{ width: 38, textAlign: "right" }}
                >
                  {p.ownership}%
                </span>
              </div>
            ))}
          </div>
          <div
            className="mt-3 text-text-dim flex flex-wrap gap-x-5 gap-y-1"
            style={{ fontSize: 11.5 }}
          >
            <span>
              Floor{" "}
              <span className="num" style={{ color: "#e87c7c" }}>
                {l.floor.toFixed(1)}
              </span>
            </span>
            <span>
              Mean{" "}
              <span className="num" style={{ color: "#a8b3ac" }}>
                {l.meanSim.toFixed(1)}
              </span>
            </span>
            <span>
              Ceiling{" "}
              <span className="num" style={{ color: "#f5c558" }}>
                {l.ceiling.toFixed(1)}
              </span>
            </span>
            <span>
              Leverage{" "}
              <span
                className="num"
                style={{
                  color: l.leverage > 0 ? "#7fd49a" : "#e87c7c",
                }}
              >
                {l.leverage > 0 ? "+" : ""}
                {l.leverage.toFixed(1)}
              </span>
            </span>
            <span>
              Salary proj sum{" "}
              <span className="num text-text">
                {l.projection.toFixed(1)}
              </span>
            </span>
          </div>
        </div>
      )}
    </>
  );
}
