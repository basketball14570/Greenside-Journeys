import { NextResponse } from "next/server";
import { getFieldTeeTimes, datagolfEnabled } from "@/lib/data/datagolf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tee times for the live round, sourced from DataGolf's /field-updates
// feed. ESPN's scoreboard nulls tee times once the round goes live, and
// DataGolf's /preds/in-play feed carries NO tee-time field at all — it's
// only in field-updates, as a per-player `teetimes` array keyed by round.
// getFieldTeeTimes picks the current round's entry for each player.
//
// Returns { byName: { [normalized name]: teeTimeString } }. teeTime is a
// tournament-local ISO-ish string ("2026-05-31T10:55") the caller parses
// chronologically.
export async function GET() {
  if (!datagolfEnabled()) {
    return NextResponse.json({ byName: {}, source: "unavailable" });
  }
  try {
    const { rows, round } = await getFieldTeeTimes("pga");
    const byName: Record<string, string> = {};
    for (const r of rows) {
      if (!r.teetime || !r.player_name) continue;
      byName[normalize(r.player_name)] = r.teetime;
    }
    return NextResponse.json({
      byName,
      round,
      source: "datagolf-field-updates",
      count: Object.keys(byName).length,
    });
  } catch (e) {
    return NextResponse.json(
      { byName: {}, source: "error", error: e instanceof Error ? e.message : "unknown" },
      { status: 200 },
    );
  }
}

// Match the loose-name key used in lib/leaderboard-context — ASCII, no
// punctuation, single-spaced. "First Last" and "Last, First" both fold
// to the same key here so downstream lookups can use either order.
function normalize(name: string): string {
  const flipped = name.includes(",")
    ? name.split(",").map((s) => s.trim()).reverse().join(" ")
    : name;
  return flipped
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
