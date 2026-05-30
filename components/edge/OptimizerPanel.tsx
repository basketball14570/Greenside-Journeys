"use client";

import { useMemo, useState } from "react";
import type { DfsPlayer } from "@/lib/demo-dfs";
import {
  optimizeLineups,
  COURSE_ARCHETYPES,
  type Lineup,
  type OptimizerWeights,
  type CourseArchetype,
  DEFAULT_WEIGHTS,
} from "@/lib/dfs-optimizer";
import {
  parseDkSalaryCsv,
  buildDkLineupsCsv,
  downloadCsv,
  type DkIdMap,
} from "@/lib/dfs/dk-export";

const DK_ID_MAP_KEY = "greenside:dk-id-map";

// Pull the cached DK salary CSV from the user's last upload so they don't
// have to re-upload every session.
function loadCachedIdMap(): DkIdMap | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DK_ID_MAP_KEY);
    if (!raw) return null;
    return parseDkSalaryCsv(raw);
  } catch {
    return null;
  }
}

// Monte Carlo lineup builder. Lives below the static lineup card on
// /dashboard/dfs. The user dials in weight sliders (expected score vs
// ceiling vs leverage), hits Run, and we generate a candidate pool,
// simulate each one with shared wave-wind correlation, then surface the
// top 20 by composite score.

export function OptimizerPanel({ players }: { players: DfsPlayer[] }) {
  const [weights, setWeights] = useState<OptimizerWeights>(DEFAULT_WEIGHTS);
  const [archetype, setArchetype] = useState<CourseArchetype | "">("Parkland · long");
  const [results, setResults] = useState<Lineup[] | null>(null);
  const [pop, setPop] = useState<{ meanSim: number; meanCeiling: number } | null>(null);
  const [running, setRunning] = useState(false);

  // DK export: keep the last-uploaded DK salary CSV in localStorage so the
  // user uploads once per week instead of per session.
  const [idMap, setIdMap] = useState<DkIdMap | null>(() => loadCachedIdMap());
  const [exportOpen, setExportOpen] = useState(false);
  const [exportCount, setExportCount] = useState(20);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  function onDkCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      try {
        window.localStorage.setItem(DK_ID_MAP_KEY, text);
      } catch {}
      const next = parseDkSalaryCsv(text);
      setIdMap(next);
      setExportMsg(`Loaded ${next.size} players from ${file.name}`);
    });
  }

  function doExport() {
    if (!results || !idMap) return;
    const take = Math.max(1, Math.min(exportCount, results.length));
    const { csv, exported, missing } = buildDkLineupsCsv(results.slice(0, take), idMap);
    downloadCsv(`greenside-dk-lineups-${take}.csv`, csv);
    setExportMsg(
      missing.length === 0
        ? `Exported ${exported} lineups. Import on DraftKings → Edit My Entries.`
        : `Exported ${exported} of ${take} — ${missing.length} unmatched: ${missing.slice(0, 4).join(", ")}${missing.length > 4 ? "…" : ""}`,
    );
  }
  const [expanded, setExpanded] = useState<number | null>(null);

  function run() {
    setRunning(true);
    // Yield to the browser so the button can flip to "Running…". The
    // sim itself is fast (<300ms for 1500 candidates × 200 sims on a
    // recent laptop) but rendering the spinner needs a frame to land.
    setTimeout(() => {
      const out = optimizeLineups(players, {
        weights,
        topK: 20,
        archetype: archetype === "" ? null : (archetype as CourseArchetype),
      });
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
          <label className="flex items-center gap-2">
            <span
              className="num font-semibold uppercase text-text-muted"
              style={{ fontSize: 10, letterSpacing: 1.1 }}
            >
              Course fit
            </span>
            <select
              value={archetype}
              onChange={(e) => setArchetype(e.target.value as CourseArchetype | "")}
              className="rounded-[6px] border border-line bg-bg px-2 py-1 text-text"
              style={{ fontSize: 12 }}
            >
              <option value="">None (raw projections)</option>
              {COURSE_ARCHETYPES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
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
          {results && (
            <button
              onClick={() => setExportOpen((v) => !v)}
              className="rounded-[8px] border border-line-strong px-3 py-2 hover:border-[#7fd49a]"
              style={{ fontSize: 12.5 }}
              title="Download lineups as a DraftKings import CSV"
            >
              ⬇ DK CSV
            </button>
          )}
        </div>
        {exportOpen && results && (
          <div
            className="mt-3 rounded-[10px] border p-3 space-y-2"
            style={{
              borderColor: "rgba(127,212,154,0.28)",
              background: "rgba(127,212,154,0.06)",
            }}
          >
            <div className="num font-semibold uppercase text-text-muted" style={{ fontSize: 9.5, letterSpacing: 1.1 }}>
              Export to DraftKings
            </div>
            <p className="text-text-dim" style={{ fontSize: 11.5, lineHeight: 1.5 }}>
              DK&apos;s Import Lineups wizard needs the salary CSV (it has the
              player IDs). Upload it once per week, then export as many top
              lineups as you want.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label
                className="num cursor-pointer rounded-[6px] border border-line-strong px-3 py-1.5 hover:border-[#7fd49a]"
                style={{ fontSize: 11.5 }}
              >
                <input type="file" accept=".csv,text/csv" onChange={onDkCsv} className="hidden" />
                {idMap ? `↻ Replace DK salary CSV (${idMap.size} players cached)` : "📄 Upload DK salary CSV"}
              </label>
              <label className="flex items-center gap-1.5 num text-text-dim" style={{ fontSize: 11.5 }}>
                Top
                <input
                  type="number"
                  min={1}
                  max={results.length}
                  value={exportCount}
                  onChange={(e) => setExportCount(Math.max(1, Number(e.target.value) || 1))}
                  className="num rounded border border-line bg-bg px-2 py-1 text-text w-16"
                  style={{ fontSize: 12 }}
                />
                lineups
              </label>
              <button
                onClick={doExport}
                disabled={!idMap}
                className="rounded-[6px] px-3 py-1.5 font-semibold disabled:opacity-40"
                style={{ background: "#7fd49a", color: "#06140c", fontSize: 11.5 }}
              >
                Download CSV
              </button>
            </div>
            {exportMsg && (
              <div className="num text-text-dim" style={{ fontSize: 11 }}>
                {exportMsg}
              </div>
            )}
          </div>
        )}
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
