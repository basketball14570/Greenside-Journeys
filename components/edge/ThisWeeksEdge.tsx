"use client";

import { useEffect, useState } from "react";

// "This week's edge" — DataGolf pre-tournament projections on the
// dashboard home. Top players by win% with their top5/top10/top20/
// make-cut percentages. Source badge shows whether we're on real
// DataGolf data or a demo fallback.

type Projection = {
  player_name: string;
  win: number;
  top5: number;
  top10: number;
  top20: number;
  makeCut: number;
};

type Response = {
  source: "datagolf" | "demo";
  message?: string;
  projections: Projection[];
};

export function ThisWeeksEdge({ limit = 8 }: { limit?: number }) {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/projections/this-week", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: Response) => {
        if (!cancelled) setData(j);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = (data?.projections ?? []).slice(0, limit);
  const isLive = data?.source === "datagolf";

  return (
    <div className="rounded-[14px] overflow-hidden bg-surface-1 border border-line">
      <div
        className="flex items-baseline justify-between px-4 py-3.5 border-b border-line"
        style={{ background: "rgba(0,0,0,0.18)" }}
      >
        <div>
          <span
            className="serif-italic text-text"
            style={{ fontSize: 17, letterSpacing: -0.2, fontStyle: "normal" }}
          >
            This week&apos;s edge
          </span>
          <div
            className="num text-text-muted mt-0.5"
            style={{ fontSize: 10.5, letterSpacing: 0.6 }}
          >
            Pre-tournament finish probabilities
          </div>
        </div>
        <span
          className="num uppercase"
          style={{
            fontSize: 9.5,
            letterSpacing: 0.9,
            color: isLive ? "#7fd49a" : "#f5c558",
            background: isLive ? "rgba(127,212,154,0.13)" : "rgba(245,197,88,0.13)",
            padding: "2px 7px",
            borderRadius: 4,
            border: isLive
              ? "1px solid rgba(127,212,154,0.3)"
              : "1px solid rgba(245,197,88,0.3)",
          }}
        >
          {isLive ? "DataGolf" : "Demo"}
        </span>
      </div>

      <div
        className="grid gap-2 px-4 py-2 num font-semibold uppercase text-text-muted border-b border-line"
        style={{
          gridTemplateColumns: "16px 1fr 54px 50px 50px 50px",
          fontSize: 9,
          letterSpacing: 1.1,
        }}
      >
        <span />
        <span>Player</span>
        <span className="text-right">Win</span>
        <span className="text-right">Top 5</span>
        <span className="text-right">Top 10</span>
        <span className="text-right">Cut</span>
      </div>
      {loading && rows.length === 0 && (
        <div className="px-4 py-6 text-text-dim text-center" style={{ fontSize: 12 }}>
          Loading…
        </div>
      )}
      {(() => {
        const maxWin = Math.max(...rows.map((r) => r.win), 0.0001);
        return rows.map((r, i) => (
          <div
            key={r.player_name + i}
            className="relative grid gap-2 px-4 py-2.5 items-center"
            style={{
              gridTemplateColumns: "16px 1fr 54px 50px 50px 50px",
              borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
              background: i === 0 ? "rgba(127,212,154,0.05)" : "transparent",
            }}
          >
            {i === 0 && (
              <div
                className="absolute"
                style={{ left: 0, top: 0, bottom: 0, width: 2, background: "#7fd49a" }}
              />
            )}
            <span
              className="num text-right"
              style={{ fontSize: 10.5, color: i < 3 ? "#7fd49a" : "#6c7a72", fontWeight: i < 3 ? 700 : 400 }}
            >
              {i + 1}
            </span>
            <div
              className="text-text truncate"
              style={{ fontSize: 13, fontWeight: i === 0 ? 700 : i < 3 ? 600 : 400 }}
            >
              {r.player_name}
            </div>
            <div className="relative flex items-center justify-end" style={{ height: 18 }}>
              <div
                className="absolute rounded-sm"
                style={{
                  left: 0,
                  top: "50%",
                  transform: "translateY(-50%)",
                  height: 14,
                  width: `${Math.max(8, (r.win / maxWin) * 100)}%`,
                  background: "linear-gradient(90deg, rgba(127,212,154,0.10), rgba(127,212,154,0.30))",
                }}
              />
              <span
                className="num relative font-bold"
                style={{ fontSize: 12.5, color: "#7fd49a" }}
              >
                {pct(r.win)}
              </span>
            </div>
            <span
              className="num text-right font-semibold"
              style={{ fontSize: 12, color: heat(r.top5, 0.3) }}
            >
              {pct(r.top5)}
            </span>
            <span
              className="num text-right font-semibold"
              style={{ fontSize: 12, color: heat(r.top10, 0.45) }}
            >
              {pct(r.top10)}
            </span>
            <span
              className="num text-right font-semibold"
              style={{ fontSize: 12, color: heat(r.makeCut, 0.9) }}
            >
              {pct(r.makeCut)}
            </span>
          </div>
        ));
      })()}
      {data?.message && !isLive && (
        <div
          className="px-4 py-2 text-text-muted border-t border-line"
          style={{ fontSize: 10.5, letterSpacing: 0.4, background: "rgba(245,197,88,0.04)" }}
        >
          {data.message}
        </div>
      )}
    </div>
  );
}

function pct(v: number): string {
  if (v >= 0.1) return `${(v * 100).toFixed(0)}%`;
  return `${(v * 100).toFixed(1)}%`;
}

// Heat-scale a probability toward the brand green as it approaches `full`.
// Low values stay muted gray; strong values read bright green so the eye
// tracks magnitude down the column without a legend.
function heat(v: number, full: number): string {
  const t = Math.max(0, Math.min(1, v / full));
  if (t < 0.15) return "#6c7a72";
  const alpha = 0.5 + t * 0.5;
  return `rgba(127, 212, 154, ${alpha.toFixed(2)})`;
}
