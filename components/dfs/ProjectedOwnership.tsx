"use client";

import { useEffect, useState } from "react";

type Projection = {
  player_name: string;
  salary: number;
  projected_own: number;
  basis: "history" | "salary_bucket" | "default";
  history_n: number;
  course_n: number;
  effective_weight: number;
  historical_avg_own: number | null;
};

type ApiResponse = {
  ok: boolean;
  event?: { name: string; course: string; event_id: number; site: string };
  history_stats?: {
    total_rows: number;
    players_with_history: number;
    field_size: number;
  };
  projections?: Projection[];
  error?: string;
};

// Color ramp matched to the rest of the ownership page.
function ownColor(own: number): string {
  if (own >= 20) return "#e87c7c";
  if (own >= 15) return "#f5c558";
  if (own >= 7) return "#f0ebe0";
  return "#7fd49a";
}

export function ProjectedOwnership() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [eventIdInput, setEventIdInput] = useState("");

  async function load(eventId?: string) {
    setLoading(true);
    const qs = eventId ? `?event_id=${eventId}` : "";
    try {
      const res = await fetch(`/api/dfs/projected-ownership${qs}`);
      const json = (await res.json()) as ApiResponse;
      setData(json);
    } catch {
      setData({ ok: false, error: "request failed" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const rows =
    data?.projections?.filter((r) =>
      r.player_name.toLowerCase().includes(q.toLowerCase()),
    ) ?? [];

  return (
    <div className="space-y-3">
      <div className="rounded-[14px] border border-line p-5 bg-surface-1 space-y-3">
        <div className="serif-italic" style={{ fontSize: 24, fontStyle: "normal" }}>
          <em>Projected ownership — this week.</em>
        </div>
        {data?.event && (
          <div className="text-text-dim" style={{ fontSize: 13 }}>
            <span className="text-text">{data.event.name}</span> ·{" "}
            {data.event.course} · {data.event.site.toUpperCase()}
          </div>
        )}
        {data?.history_stats && (
          <div className="text-text-muted num uppercase" style={{ fontSize: 10, letterSpacing: 1 }}>
            {data.history_stats.field_size} in field ·{" "}
            {data.history_stats.players_with_history} with history ·{" "}
            {data.history_stats.total_rows.toLocaleString()} historical rows
          </div>
        )}
        <p className="text-text-dim" style={{ fontSize: 12 }}>
          Similarity-weighted prediction. Each player's projection blends
          their own past ownership (favoring the same course, similar
          salary, recent years) with a salary-bucket prior for thin samples.
        </p>
      </div>

      {!loading && data?.error && (
        <div className="rounded-[14px] border border-line p-5 bg-surface-1 space-y-3">
          <div className="text-text" style={{ fontSize: 14 }}>
            Couldn't compute projections: <em>{data.error}</em>
          </div>
          <div className="text-text-dim" style={{ fontSize: 12 }}>
            DataGolf usually publishes the current-week field on Monday
            evening. If you know the event_id, pass it manually:
          </div>
          <div className="flex gap-2">
            <input
              placeholder="event_id (e.g. 33)"
              value={eventIdInput}
              onChange={(e) => setEventIdInput(e.target.value)}
              className="flex-1 rounded-[8px] border border-line bg-surface-1 px-3 py-2 text-text"
              style={{ fontSize: 13 }}
            />
            <button
              onClick={() => load(eventIdInput)}
              className="num font-semibold uppercase"
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 11,
                letterSpacing: 0.8,
                color: "#f0ebe0",
                background: "#1e4030",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              Try
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-text-dim" style={{ fontSize: 13 }}>
          Loading projections…
        </div>
      )}

      {!loading && rows.length > 0 && (
        <>
          <input
            placeholder="Filter players…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-[8px] border border-line bg-surface-1 px-3 py-2 text-text"
            style={{ fontSize: 13 }}
          />
          <div className="rounded-[14px] border border-line overflow-hidden">
            <div
              className="grid gap-2 px-4 py-2.5 num font-semibold uppercase text-text-muted border-b border-line"
              style={{
                gridTemplateColumns: "2fr 80px 100px 90px 110px",
                fontSize: 10,
                letterSpacing: 1.1,
                background: "rgba(0,0,0,0.18)",
              }}
            >
              <span>Player</span>
              <span className="text-right">Salary</span>
              <span className="text-right">Projected</span>
              <span className="text-right">Hist avg</span>
              <span className="text-right">Sample</span>
            </div>
            {rows.map((r) => (
              <div
                key={r.player_name}
                className="grid gap-2 px-4 py-3 border-b border-line/50 last:border-b-0"
                style={{
                  gridTemplateColumns: "2fr 80px 100px 90px 110px",
                  fontSize: 13,
                }}
              >
                <span className="text-text">{r.player_name}</span>
                <span className="num text-right text-text-dim">
                  ${r.salary.toLocaleString()}
                </span>
                <span
                  className="num text-right font-semibold"
                  style={{ color: ownColor(r.projected_own) }}
                >
                  {r.projected_own.toFixed(1)}%
                </span>
                <span className="num text-right text-text-dim">
                  {r.historical_avg_own != null
                    ? `${r.historical_avg_own.toFixed(1)}%`
                    : "—"}
                </span>
                <span className="num text-right text-text-muted" style={{ fontSize: 11 }}>
                  {r.basis === "history"
                    ? `${r.history_n} ev · ${r.course_n} here`
                    : r.basis === "salary_bucket"
                      ? "prior"
                      : "default"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
