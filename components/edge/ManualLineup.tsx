"use client";

import { useMemo, useState } from "react";
import type { DfsPlayer } from "@/lib/demo-dfs";
import { evaluateLineup } from "@/lib/dfs-optimizer";
import { DK_ROSTER_SIZE, DK_SALARY_CAP } from "@/lib/data/dfs-salaries";

// Build-your-own lineup: pick up to DK_ROSTER_SIZE golfers and get the same
// Monte Carlo mean / ceiling / ownership the optimizer reports.
export function ManualLineup({ players }: { players: DfsPlayer[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [q, setQ] = useState("");

  const byId = useMemo(() => {
    const m = new Map<string, DfsPlayer>();
    for (const p of players) m.set(p.id, p);
    return m;
  }, [players]);

  const selected = selectedIds
    .map((id) => byId.get(id))
    .filter((p): p is DfsPlayer => !!p);

  const totalSalary = selected.reduce((s, p) => s + p.salary, 0);
  const remaining = DK_SALARY_CAP - totalSalary;
  const full = selected.length === DK_ROSTER_SIZE;
  const overCap = totalSalary > DK_SALARY_CAP;

  // Re-simulate whenever the picks change. 400 sims on ≤6 players is instant.
  const evalResult = useMemo(
    () => (selected.length > 0 ? evaluateLineup(selected) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedIds],
  );

  function toggle(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= DK_ROSTER_SIZE) return prev;
      return [...prev, id];
    });
  }

  const pool = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return players
      .filter((p) => !needle || p.name.toLowerCase().includes(needle))
      .sort((a, b) => b.projection - a.projection);
  }, [players, q]);

  return (
    <section className="rounded-[14px] border border-line bg-surface-1 overflow-hidden">
      <div
        className="px-5 py-4 border-b border-line"
        style={{ background: "rgba(0,0,0,0.18)" }}
      >
        <span
          className="num font-semibold uppercase text-text-muted"
          style={{ fontSize: 9.5, letterSpacing: 1.2 }}
        >
          Build your own
        </span>
        <div
          className="serif-italic mt-0.5"
          style={{ fontSize: 20, letterSpacing: -0.2, fontStyle: "normal" }}
        >
          Lineup lab
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Metric
            label="Salary"
            value={`$${totalSalary.toLocaleString()}`}
            sub={`${remaining >= 0 ? "$" + remaining.toLocaleString() + " left" : "$" + Math.abs(remaining).toLocaleString() + " over"}`}
            color={overCap ? "#e57373" : "#f0ebe0"}
          />
          <Metric
            label="Mean"
            value={evalResult ? evalResult.meanSim.toFixed(1) : "—"}
            color="#7fd49a"
          />
          <Metric
            label="Ceiling"
            value={evalResult ? evalResult.ceiling.toFixed(1) : "—"}
            color="#f5c558"
          />
          <Metric
            label="Floor"
            value={evalResult ? evalResult.floor.toFixed(1) : "—"}
            color="#a8b3ac"
          />
          <Metric
            label="Avg own"
            value={evalResult ? `${evalResult.avgOwnership.toFixed(1)}%` : "—"}
            color="#7cc0e8"
          />
        </div>

        {/* Selected chips */}
        <div className="flex flex-wrap gap-1.5 min-h-[34px]">
          {selected.length === 0 && (
            <span className="text-text-muted" style={{ fontSize: 12.5 }}>
              Tap players below to build a lineup ({DK_ROSTER_SIZE} max).
            </span>
          )}
          {selected.map((p) => (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className="num flex items-center gap-1.5"
              style={{
                padding: "5px 9px",
                borderRadius: 6,
                fontSize: 12,
                background: "rgba(127,212,154,0.12)",
                border: "1px solid rgba(127,212,154,0.3)",
                color: "#eafff0",
              }}
            >
              {p.name}
              <span style={{ color: "#7fd49a" }}>${(p.salary / 1000).toFixed(1)}k</span>
              <span style={{ color: "#e57373", fontWeight: 700 }}>×</span>
            </button>
          ))}
        </div>

        {overCap && (
          <div
            className="num"
            style={{ fontSize: 12, color: "#e57373" }}
          >
            Over the ${DK_SALARY_CAP.toLocaleString()} cap.
          </div>
        )}
        {!overCap && full && (
          <div className="num" style={{ fontSize: 12, color: "#7fd49a" }}>
            Valid lineup · {DK_ROSTER_SIZE} golfers under cap.
          </div>
        )}

        {/* Player picker */}
        <input
          placeholder="Search players…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-[8px] border border-line bg-bg px-3 py-2 text-text"
          style={{ fontSize: 13 }}
        />
        <div className="rounded-[10px] border border-line overflow-hidden">
          <div className="max-h-[300px] overflow-y-auto">
            {pool.map((p) => {
              const picked = selectedIds.includes(p.id);
              const disabled = !picked && selected.length >= DK_ROSTER_SIZE;
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  disabled={disabled}
                  className="w-full grid items-center gap-2 px-3 py-2 text-left border-b border-line/40 last:border-b-0 hover:bg-surface-2 disabled:opacity-35"
                  style={{ gridTemplateColumns: "1fr 60px 50px 48px 26px", fontSize: 13 }}
                >
                  <span className="text-text truncate">{p.name}</span>
                  <span className="num text-right text-text-dim" style={{ fontSize: 12 }}>
                    ${(p.salary / 1000).toFixed(1)}k
                  </span>
                  <span className="num text-right text-text" style={{ fontSize: 12 }}>
                    {p.projection.toFixed(1)}
                  </span>
                  <span className="num text-right text-text-muted" style={{ fontSize: 11.5 }}>
                    {p.ownership.toFixed(0)}%
                  </span>
                  <span
                    className="num text-right font-semibold"
                    style={{ fontSize: 14, color: picked ? "#7fd49a" : "#5a6660" }}
                  >
                    {picked ? "✓" : "+"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div>
      <div
        className="num font-semibold uppercase text-text-muted"
        style={{ fontSize: 9, letterSpacing: 1 }}
      >
        {label}
      </div>
      <div className="num font-semibold" style={{ fontSize: 18, color }}>
        {value}
      </div>
      {sub && (
        <div className="num text-text-muted" style={{ fontSize: 10.5 }}>
          {sub}
        </div>
      )}
    </div>
  );
}
