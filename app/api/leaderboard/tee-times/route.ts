import { NextResponse } from "next/server";
import { getLiveLeaderboard, datagolfEnabled } from "@/lib/data/datagolf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tee times for the live round, sourced from DataGolf's in-play feed.
// ESPN's scoreboard endpoint nulls these out once the round goes live,
// and the summary endpoint frequently 502s — so we fall back to DataGolf,
// which keeps tee times populated through the round.
//
// Returns { byName: { [normalized name]: teeTimeString } } plus a small
// piece of metadata. teeTime is returned as DataGolf provides it (likely
// "HH:MM" local) — the caller parses chronologically.
export async function GET() {
  if (!datagolfEnabled()) {
    return NextResponse.json({ byName: {}, source: "unavailable" });
  }
  try {
    const rows = await getLiveLeaderboard("pga");
    const byName: Record<string, string> = {};
    for (const r of rows) {
      if (!r.tee_time || !r.player_name) continue;
      byName[normalize(r.player_name)] = r.tee_time;
    }
    return NextResponse.json({
      byName,
      source: "datagolf",
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
