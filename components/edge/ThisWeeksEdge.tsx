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
          gridTemplateColumns: "1fr 50px 50px 50px 50px",
          fontSize: 9,
          letterSpacing: 1.1,
        }}
      >
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
      {rows.map((r, i) => (
        <div
          key={r.player_name + i}
          className="grid gap-2 px-4 py-2.5 items-center"
          style={{
            gridTemplateColumns: "1fr 50px 50px 50px 50px",
            borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
          }}
        >
          <div
            className="text-text truncate"
            style={{ fontSize: 13, fontWeight: i === 0 ? 600 : 400 }}
          >
            {r.player_name}
          </div>
          <span
            className="num text-right font-semibold"
            style={{ fontSize: 12, color: r.win > 0.08 ? "#7fd49a" : "#a8b3ac" }}
          >
            {pct(r.win)}
          </span>
          <span className="num text-right text-text-dim" style={{ fontSize: 12 }}>
            {pct(r.top5)}
          </span>
          <span className="num text-right text-text-dim" style={{ fontSize: 12 }}>
            {pct(r.top10)}
          </span>
          <span className="num text-right text-text-dim" style={{ fontSize: 12 }}>
            {pct(r.makeCut)}
          </span>
        </div>
      ))}
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
