"use client";

import { useEffect, useState } from "react";
import { DesktopLeaderboard, MobileLeaderboard, type LeaderRow } from "@/components/edge/sections";
import { fetchLeaderboard, type LeaderboardSnapshot } from "@/lib/espn-leaderboard";

// Dashboard-home leaderboard widget. Pulls the live ESPN snapshot,
// keeps the top 12, and renders into the existing Desktop/Mobile
// widgets. Renders a demo fallback while loading or on network
// failure so the dashboard never shows an empty box.

type Layout = "desktop" | "mobile";

export function LiveDashboardLeaderboard({
  layout,
  fallback,
  limit = 12,
}: {
  layout: Layout;
  fallback: LeaderRow[];
  limit?: number;
}) {
  const [rows, setRows] = useState<LeaderRow[]>(fallback);

  useEffect(() => {
    let cancelled = false;
    fetchLeaderboard()
      .then((snap) => {
        if (cancelled) return;
        const live = snapshotToRows(snap, limit);
        if (live.length > 0) setRows(live);
      })
      .catch(() => undefined);

    // Refresh every 60s; cron grading is every 15min so this stays fresh.
    const id = setInterval(() => {
      fetchLeaderboard()
        .then((snap) => {
          if (cancelled) return;
          const live = snapshotToRows(snap, limit);
          if (live.length > 0) setRows(live);
        })
        .catch(() => undefined);
    }, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [limit]);

  if (layout === "desktop") return <DesktopLeaderboard rows={rows} />;
  return <MobileLeaderboard rows={rows} />;
}

function snapshotToRows(snap: LeaderboardSnapshot, limit: number): LeaderRow[] {
  // ESPN gives us players sorted by position already; take the leading
  // chunk. Wave is derived from tee time when available — if not, AM as
  // a safe default. The score field on LeaderRow is numeric so we parse
  // ESPN's pre-formatted "+1" / "E" / "-7" string back into an int.
  return snap.players.slice(0, limit).map((p): LeaderRow => {
    const today = p.todayLine;
    const thruRaw = today?.thru;
    return {
      pos: p.posDisplay || "—",
      name: p.name,
      score: parseToPar(p.totalToPar),
      thru:
        thruRaw === null || thruRaw === undefined
          ? today
            ? "—"
            : p.teeTime
              ? formatTeeTime(p.teeTime)
              : "—"
          : thruRaw === 18
            ? "F"
            : String(thruRaw),
      wave: deriveWave(p.teeTime),
      slug: slugify(p.name),
    };
  });
}

function parseToPar(s: string | null): number {
  if (!s) return 0;
  if (s === "E") return 0;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? 0 : n;
}

function deriveWave(teeTime: string | null): "AM" | "PM" {
  if (!teeTime) return "AM";
  // ESPN tee times are ISO timestamps; cutoff at local-noon UTC is too
  // coarse, but for a small widget the AM/PM split by US-eastern noon is
  // close enough. The Showdown page does this strictly already.
  try {
    const d = new Date(teeTime);
    return d.getUTCHours() < 17 ? "AM" : "PM";
  } catch {
    return "AM";
  }
}

function formatTeeTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function slugify(name: string): string {
  // Match the slug convention used elsewhere — kebab-case last name.
  const last = name.split(" ").pop() ?? name;
  return last
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/g, "");
}
