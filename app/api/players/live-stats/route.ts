import { NextResponse } from "next/server";
import { datagolfEnabled, getLiveTournamentStats } from "@/lib/data/datagolf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Live shot-quality stats per player for the active tournament.
// Surfaces FH%, GIR%, SG categories, scrambling, distance — the
// "why is X +2 today" detail that ESPN's free leaderboard doesn't
// expose. Cached 60s at the edge to avoid hammering DataGolf.
export async function GET(req: Request) {
  if (!datagolfEnabled()) {
    return NextResponse.json(
      { configured: false, stats: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  // Scope to a single round when asked (?round=1..4) so the FH/GIR/
  // scrambling counts line up with holes played THIS round; default to
  // the tournament average.
  const roundParam = new URL(req.url).searchParams.get("round");
  const round =
    roundParam && /^[1-4]$/.test(roundParam)
      ? (Number(roundParam) as 1 | 2 | 3 | 4)
      : "event_avg";
  try {
    const result = await getLiveTournamentStats({ round });
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
