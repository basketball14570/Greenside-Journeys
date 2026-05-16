import { NextResponse } from "next/server";
import { fetchLeaderboard } from "@/lib/espn-leaderboard";
import { gradeAll, type OpenBet } from "@/lib/grading";
import { DEMO_BETS } from "@/lib/demo-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Periodic settlement cron. Currently grades the demo open-bets list —
// once user bets land in Supabase this same handler will iterate users
// and persist resolved rows.
//
// Schedule via vercel.json:
//   { "path": "/api/cron/grade", "schedule": "*/15 * * * *" }
//
// Auth: matches the newsletter cron — Bearer ${CRON_SECRET} when set.

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function openBetsFromDemo(): OpenBet[] {
  return DEMO_BETS.filter((b) => b.status === "live").map((b) => ({
    player: b.player,
    market: b.market,
    line: b.line,
    stake: b.stake,
    payout: b.payout,
  }));
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const snapshot = await fetchLeaderboard();
    const report = gradeAll(openBetsFromDemo(), snapshot);
    return NextResponse.json({
      ran_at: new Date().toISOString(),
      event: snapshot.event?.shortName ?? null,
      total: report.total,
      by_status: report.by_status,
      net_pnl_units: report.net_pnl_units,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

export const POST = GET;
