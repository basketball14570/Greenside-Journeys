"use client";

import { useMemo, useState } from "react";
import { runAllStrategies, type StrategyResult } from "@/lib/backtest";

export default function BacktestPage() {
  const results = useMemo(() => runAllStrategies(), []);
  const [activeId, setActiveId] = useState<string>(results[0]?.strategy.id ?? "baseline");
  const active = results.find((r) => r.strategy.id === activeId) ?? results[0];
  const baseline = results.find((r) => r.strategy.id === "baseline")!;

  return (
    <div className="px-5 lg:px-8 py-6 space-y-6 max-w-6xl mx-auto">
      <header>
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
        >
          ● Backtest Lab
        </span>
        <h1
          className="serif-italic mt-1.5"
          style={{ fontSize: 36, letterSpacing: -0.4 }}
        >
          <em>What would have happened.</em>
        </h1>
        <p className="text-text-dim mt-2 max-w-2xl" style={{ fontSize: 14 }}>
          Replays your settled history under six bet-selection rules and
          compares P&amp;L, drawdown, and win rate. Demo runs over a
          twelve-bet sample today — same engine runs the full Supabase
          history once it lands.
        </p>
      </header>

      <ComparisonTable
        results={results}
        baseline={baseline}
        activeId={activeId}
        onSelect={setActiveId}
      />

      <div className="grid lg:grid-cols-2 gap-5">
        <StrategyDetail result={active} />
        <EquityCurve result={active} baseline={baseline} />
      </div>

      <ReadingTheNumbers />
    </div>
  );
}

function ComparisonTable({
  results,
  baseline,
  activeId,
  onSelect,
}: {
  results: StrategyResult[];
  baseline: StrategyResult;
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="rounded-[14px] border border-line overflow-hidden">
      <div className="grid grid-cols-[1.6fr_repeat(5,_minmax(0,1fr))] gap-2 px-4 py-3 text-xs uppercase tracking-wider text-text-dim border-b border-line bg-surface-1">
        <div>Strategy</div>
        <div className="text-right">Bets</div>
        <div className="text-right">Win %</div>
        <div className="text-right">Net</div>
        <div className="text-right">ROI</div>
        <div className="text-right">Max DD</div>
      </div>
      {results.map((r) => {
        const isActive = r.strategy.id === activeId;
        const delta = r.netUnits - baseline.netUnits;
        const better = delta > 0 && r.strategy.id !== "baseline";
        return (
          <button
            key={r.strategy.id}
            onClick={() => onSelect(r.strategy.id)}
            className={`w-full grid grid-cols-[1.6fr_repeat(5,_minmax(0,1fr))] gap-2 px-4 py-3 text-left border-b border-line/50 last:border-b-0 transition-colors ${
              isActive ? "bg-surface-2" : "hover:bg-surface-1"
            }`}
          >
            <div>
              <div className="font-medium" style={{ fontSize: 14 }}>
                {r.strategy.label}
              </div>
              <div className="text-text-dim mt-0.5" style={{ fontSize: 11 }}>
                {r.strategy.description}
              </div>
            </div>
            <div className="text-right num self-center" style={{ fontSize: 13 }}>
              {r.taken}
              <span className="text-text-dim"> /{r.taken + r.skipped}</span>
            </div>
            <div className="text-right num self-center" style={{ fontSize: 13 }}>
              {(r.winRate * 100).toFixed(0)}%
            </div>
            <div
              className="text-right num self-center"
              style={{
                fontSize: 13,
                color: r.netUnits >= 0 ? "#7fd49a" : "#e87c7c",
              }}
            >
              {r.netUnits >= 0 ? "+" : ""}
              {r.netUnits.toFixed(2)}u
              {r.strategy.id !== "baseline" && Math.abs(delta) >= 0.01 && (
                <span
                  className="ml-1 text-text-dim"
                  style={{ fontSize: 11 }}
                >
                  ({better ? "+" : ""}
                  {delta.toFixed(2)})
                </span>
              )}
            </div>
            <div className="text-right num self-center" style={{ fontSize: 13 }}>
              {(r.roi * 100).toFixed(1)}%
            </div>
            <div className="text-right num self-center" style={{ fontSize: 13 }}>
              {r.maxDrawdown.toFixed(2)}u
            </div>
          </button>
        );
      })}
    </div>
  );
}

function StrategyDetail({ result }: { result: StrategyResult }) {
  return (
    <div className="rounded-[14px] border border-line p-5 bg-surface-1">
      <h2 className="font-medium" style={{ fontSize: 18 }}>
        {result.strategy.label}
      </h2>
      <p className="text-text-dim mt-1" style={{ fontSize: 13 }}>
        {result.strategy.description}
      </p>

      <div className="grid grid-cols-2 gap-3 mt-5">
        <Stat label="Bets taken" value={`${result.taken}`} sub={`${result.skipped} skipped`} />
        <Stat
          label="Win / Loss"
          value={`${result.wins}–${result.losses}`}
          sub={`${(result.winRate * 100).toFixed(0)}% win rate`}
        />
        <Stat
          label="Net P&L"
          value={`${result.netUnits >= 0 ? "+" : ""}${result.netUnits.toFixed(2)}u`}
          sub={`on ${result.totalRisk.toFixed(2)}u risked`}
          tone={result.netUnits >= 0 ? "good" : "bad"}
        />
        <Stat
          label="ROI"
          value={`${(result.roi * 100).toFixed(1)}%`}
          sub={`profit factor ${
            result.profitFactor === Infinity ? "∞" : result.profitFactor.toFixed(2)
          }`}
          tone={result.roi >= 0 ? "good" : "bad"}
        />
        <Stat
          label="Max drawdown"
          value={`${result.maxDrawdown.toFixed(2)}u`}
          sub="worst peak-to-trough"
        />
        <Stat
          label="Avg stake"
          value={
            result.taken
              ? `${(result.totalRisk / result.taken).toFixed(2)}u`
              : "—"
          }
          sub="after sizing rules"
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "bad";
}) {
  const color = tone === "good" ? "#7fd49a" : tone === "bad" ? "#e87c7c" : undefined;
  return (
    <div>
      <div className="text-text-dim uppercase" style={{ fontSize: 10, letterSpacing: 1.2 }}>
        {label}
      </div>
      <div className="num mt-1" style={{ fontSize: 22, color }}>
        {value}
      </div>
      {sub && (
        <div className="text-text-dim mt-0.5" style={{ fontSize: 11 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function EquityCurve({
  result,
  baseline,
}: {
  result: StrategyResult;
  baseline: StrategyResult;
}) {
  // Build a comparison SVG using both curves.
  const W = 560;
  const H = 260;
  const PAD = 28;
  const series = [
    { name: "Baseline", points: baseline.curve, color: "#4a5b50" },
    { name: result.strategy.label, points: result.curve, color: "#7fd49a" },
  ];
  const all = series.flatMap((s) => s.points.map((p) => p.cumulative));
  if (all.length === 0) {
    return (
      <div className="rounded-[14px] border border-line p-5 bg-surface-1 flex items-center justify-center text-text-dim">
        No bets taken under this rule.
      </div>
    );
  }
  const yMin = Math.min(0, ...all);
  const yMax = Math.max(0.5, ...all);
  const xMax = Math.max(
    1,
    ...series.map((s) => s.points.length),
  );

  const xScale = (i: number) =>
    PAD + (i / Math.max(1, xMax - 1)) * (W - PAD * 2);
  const yScale = (v: number) =>
    H - PAD - ((v - yMin) / (yMax - yMin)) * (H - PAD * 2);

  const ySteps = 4;
  const yTicks = Array.from({ length: ySteps + 1 }, (_, i) =>
    yMin + ((yMax - yMin) * i) / ySteps,
  );

  return (
    <div className="rounded-[14px] border border-line p-5 bg-surface-1">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-medium" style={{ fontSize: 18 }}>
          Equity curve
        </h2>
        <div className="flex gap-4" style={{ fontSize: 11 }}>
          {series.map((s) => (
            <div key={s.name} className="flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-0.5"
                style={{ background: s.color }}
              />
              <span className="text-text-dim">{s.name}</span>
            </div>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD}
              x2={W - PAD}
              y1={yScale(t)}
              y2={yScale(t)}
              stroke="rgba(255,255,255,0.06)"
            />
            <text
              x={PAD - 6}
              y={yScale(t) + 3}
              textAnchor="end"
              fill="rgba(255,255,255,0.45)"
              fontSize="10"
            >
              {t >= 0 ? "+" : ""}
              {t.toFixed(1)}
            </text>
          </g>
        ))}
        <line
          x1={PAD}
          x2={W - PAD}
          y1={yScale(0)}
          y2={yScale(0)}
          stroke="rgba(255,255,255,0.15)"
          strokeDasharray="3 3"
        />
        {series.map((s) => {
          const d = s.points
            .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(p.cumulative)}`)
            .join(" ");
          return (
            <g key={s.name}>
              <path d={d} stroke={s.color} strokeWidth={2} fill="none" />
              {s.points.map((p, i) => (
                <circle
                  key={i}
                  cx={xScale(i)}
                  cy={yScale(p.cumulative)}
                  r={2.5}
                  fill={s.color}
                />
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ReadingTheNumbers() {
  return (
    <div
      className="rounded-[14px] p-5 border border-line"
      style={{ background: "rgba(124,192,232,0.05)" }}
    >
      <div className="flex items-baseline gap-2 mb-2">
        <span style={{ fontSize: 14, color: "#7cc0e8" }}>ℹ</span>
        <h3 className="font-medium" style={{ fontSize: 14 }}>
          Reading the numbers
        </h3>
      </div>
      <ul
        className="text-text-dim space-y-1.5 ml-5 list-disc"
        style={{ fontSize: 13 }}
      >
        <li>
          <strong>Bets</strong> shows taken / total — the lower number is the
          rule&apos;s skip count. Skipping isn&apos;t free; you may also miss
          winners.
        </li>
        <li>
          <strong>Max drawdown</strong> is the worst peak-to-trough in units.
          A 10% ROI is far less impressive if max DD is 5u — you need bankroll
          to survive the trough.
        </li>
        <li>
          <strong>Profit factor</strong> is winning-bet $ ÷ losing-bet $.
          Above 1.0 = profitable. Above 1.3 = durable.
        </li>
        <li>
          With only twelve settled bets this is illustrative, not a license to
          deploy capital. The point is the engine; the signal arrives with
          volume.
        </li>
      </ul>
    </div>
  );
}
