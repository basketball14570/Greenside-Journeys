import { NextResponse } from "next/server";
import { getPlayerHedgeQuotes, oddsApiEnabled } from "@/lib/data/odds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Live cross-book hedge quotes for the named player. When THE_ODDS_API_KEY
// is set, returns sportsbook prices from The Odds API. Without the key,
// returns 200 with `source: "unavailable"` and an empty quotes list — the
// UI then falls back to its built-in demo prices.
export async function GET(
  _req: Request,
  { params }: { params: { player: string } },
) {
  const playerName = decodeURIComponent(params.player);
  if (!oddsApiEnabled()) {
    return NextResponse.json(
      {
        source: "unavailable",
        reason: "THE_ODDS_API_KEY not configured",
        player: playerName,
        quotes: [],
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  const quotes = await getPlayerHedgeQuotes(playerName);
  return NextResponse.json(
    {
      source: quotes ? "the-odds-api" : "unavailable",
      player: playerName,
      quotes: quotes ?? [],
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
