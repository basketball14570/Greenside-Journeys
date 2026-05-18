import { NextResponse } from "next/server";
import { fetchLeaderboard } from "@/lib/espn-leaderboard";
import { gradeAll, type OpenBet } from "@/lib/grading";
import { DEMO_BETS } from "@/lib/demo-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Bet-grading endpoint. Two modes:
//
//   GET  /api/bets/grade         — grade the demo open-bets list against
//                                   the current PGA scoreboard. Useful as
//                                   a smoke test and for the UI's
//                                   "current state of my bets" panel.
//
//   POST /api/bets/grade         — body: { bets: OpenBet[] }. Grade any
//                                   caller-supplied list. Returns the
//                                   same shape.
//
// Either way, response is the GradingReport from lib/grading.ts.

function toOpenBets(): OpenBet[] {
  return DEMO_BETS.filter((b) => b.status === "live").map((b) => ({
    player: b.player,
    market: b.market,
    line: b.line,
    stake: b.stake,
    payout: b.payout,
  }));
}

export async function GET() {
  try {
    const snapshot = await fetchLeaderboard();
    const report = gradeAll(toOpenBets(), snapshot);
    return NextResponse.json(report, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { bets?: OpenBet[] };
    if (!Array.isArray(body.bets) || body.bets.length === 0) {
      return NextResponse.json(
        { error: "Body must include a non-empty 'bets' array" },
        { status: 400 },
      );
    }
    const snapshot = await fetchLeaderboard();
    const report = gradeAll(body.bets, snapshot);
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
