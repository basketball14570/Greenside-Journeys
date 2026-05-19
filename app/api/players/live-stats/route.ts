import { NextResponse } from "next/server";
import { datagolfEnabled, getLiveTournamentStats } from "@/lib/data/datagolf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Live shot-quality stats per player for the active tournament.
// Surfaces FH%, GIR%, SG categories, scrambling, distance — the
// "why is X +2 today" detail that ESPN's free leaderboard doesn't
// expose. Cached 60s at the edge to avoid hammering DataGolf.
export async function GET() {
  if (!datagolfEnabled()) {
    return NextResponse.json(
      { configured: false, stats: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    const result = await getLiveTournamentStats({ round: "event_avg" });
    return NextResponse.json(
      {
        configured: true,
        eventName: result.event_name,
        lastUpdated: result.last_updated,
        stats: result.live_stats,
      },
      {
        // Edge cache 60s, allow stale-while-revalidate another 60s so the
        // UI never blocks on an upstream stall.
        headers: {
          "Cache-Control":
            "public, s-maxage=60, stale-while-revalidate=60",
        },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json(
      { configured: true, stats: [], error: msg },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
