"use client";

import { useEffect, useState } from "react";
import { ScorePill } from "@/components/edge/ScorePill";

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

type HeuristicResponse = {
  event?: string;
  source?: "v2-datagolf" | "v1.1";
  projections?: {
    name: string;
    salary: number;
    projOwn: number;
    value: number;
    marketProb: number | null;
  }[];
};

type Mode = "similarity" | "heuristic" | null;

// Color ramp matched to the rest of the ownership page.
function ownColor(own: number): string {
  if (own >= 20) return "#e87c7c";
  if (own >= 15) return "#f5c558";
  if (own >= 7) return "#f0ebe0";
  return "#7fd49a";
}

export function ProjectedOwnership() {
  const [rows, setRows] = useState<Projection[]>([]);
  const [mode, setMode] = useState<Mode>(null);
  const [eventName, setEventName] = useState<string | null>(null);
  const [histStats, setHistStats] = useState<ApiResponse["history_stats"] | null>(null);
  const [heuristicSource, setHeuristicSource] = useState<"v2-datagolf" | "v1.1" | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [eventIdInput, setEventIdInput] = useState("");

  async function load(eventId?: string) {
    setLoading(true);
    // 1. Preferred: the similarity-weighted model (needs DataGolf's field).
    try {
      const qs = eventId ? `?event_id=${eventId}` : "";
      const res = await fetch(`/api/dfs/projected-ownership${qs}`);
      const json = (await res.json()) as ApiResponse;
      if (json.ok && json.projections?.length) {
        setRows(json.projections);
        setMode("similarity");
        setEventName(json.event?.name ?? null);
        setHistStats(json.history_stats ?? null);
        setLoading(false);
        return;
      }
    } catch {
      // fall through to the heuristic model
    }

    // 2. Fallback: heuristic projection off this week's uploaded DK salaries.
    try {
      const res = await fetch(`/api/dfs/heuristic-ownership`);
      const json = (await res.json()) as HeuristicResponse;
      if (json.projections?.length) {
        setRows(
          json.projections.map((p) => ({
            player_name: p.name,
            salary: p.salary,
            projected_own: p.projOwn,
            basis: "default" as const,
            history_n: 0,
            course_n: 0,
            effective_weight: 0,
            historical_avg_own: null,
          })),
        );
        setMode("heuristic");
        setEventName(json.event ?? null);
        setHeuristicSource(json.source ?? null);
        setHistStats(null);
        setLoading(false);
        return;
      }
    } catch {
      // fall through to empty state
    }

    setRows([]);
    setMode(null);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = rows.filter((r) =>
    r.player_name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-3">
      <div className="rounded-[14px] border border-line p-5 bg-surface-1 space-y-3">
        <div className="serif-italic" style={{ fontSize: 24, fontStyle: "normal" }}>
          <em>Projected ownership — this week.</em>
        </div>
        {eventName && (
          <div className="text-text-dim" style={{ fontSize: 13 }}>
            <span className="text-text">{eventName}</span>
          </div>
        )}
        {mode === "similarity" && histStats && (
          <div className="text-text-muted num uppercase" style={{ fontSize: 10, letterSpacing: 1 }}>
            {histStats.field_size} in field · {histStats.players_with_history} with history ·{" "}
            {histStats.total_rows.toLocaleString()} historical rows
          </div>
        )}
        <p className="text-text-dim" style={{ fontSize: 12 }}>
          {mode === "heuristic" ? (
            <>
              From this week&apos;s DraftKings slate —{" "}
              {heuristicSource === "v2-datagolf"
                ? "salary + value, form-weighted by DataGolf's pre-tournament model."
                : "salary + value model."}{" "}
              The full similarity-weighted model takes over once DataGolf
              publishes the field.
            </>
          ) : (
            <>
              Similarity-weighted prediction. Each player&apos;s projection blends
              their own past ownership (favoring the same course, similar salary,
              recent years) with a salary-bucket prior for thin samples.
            </>
          )}
        </p>
      </div>

      {loading && (
        <div className="text-text-dim" style={{ fontSize: 13 }}>
          Loading projections…
        </div>
      )}

      {!loading && mode === null && (
        <div className="rounded-[14px] border border-line p-5 bg-surface-1 space-y-3">
          <div className="text-text" style={{ fontSize: 14 }}>
            No projection available yet for this event.
          </div>
          <div className="text-text-dim" style={{ fontSize: 12 }}>
            Upload this week&apos;s DraftKings salaries, or pass the DataGolf
            event_id to force the similarity model:
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
              className="grid gap-2 px-4 py-2.5 num font-semibold uppercase text-text-muted border-b"
              style={{
                gridTemplateColumns: "2fr 80px 100px 90px 110px",
                fontSize: 10,
                letterSpacing: 1.1,
                background: "linear-gradient(90deg, rgba(127,212,154,0.10), rgba(0,0,0,0.18) 60%)",
                borderColor: "rgba(127,212,154,0.18)",
              }}
            >
              <span>Player</span>
              <span className="text-right">Salary</span>
              <span className="text-right">Projected</span>
              <span className="text-right">Hist avg</span>
              <span className="text-right">Sample</span>
            </div>
            {filtered.map((r) => (
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
                <span className="flex justify-end">
                  <ScorePill
                    text={`${r.projected_own.toFixed(1)}%`}
                    color={ownColor(r.projected_own)}
                    minWidth={52}
                  />
                </span>
                <span className="num text-right text-text-dim">
                  {r.historical_avg_own != null
                    ? `${r.historical_avg_own.toFixed(1)}%`
                    : "—"}
                </span>
                <span className="num text-right text-text-muted" style={{ fontSize: 11 }}>
                  {mode === "heuristic"
                    ? "DK model"
                    : r.basis === "history"
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
