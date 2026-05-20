import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { ParsedBetSchema } from "@/lib/parsers/screenshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Persists one or more ParsedBet rows (the shape returned by the
// screenshot OCR endpoint) into the `bets` table for the signed-in user.
// Status starts as 'pending' so the user still confirms on the Tickets
// page — same flow as the email-inbound path.

const PayloadSchema = z.object({
  bets: z.array(ParsedBetSchema).min(1).max(50),
  source: z.enum(["screenshot", "manual"]).default("screenshot"),
});

export async function POST(req: NextRequest) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.json({ error: "supabase not configured" }, { status: 503 });
  }
  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const body = PayloadSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const rows = body.data.bets.map((b) => ({
    user_id: userData.user!.id,
    book: b.book,
    player: b.player,
    // The bets table has no opponent column, so matchup/3-ball groups are
    // encoded into the market text as "... vs A / B". The live grader
    // reconstructs the opponents from this on /dashboard/live.
    market:
      b.others && b.others.length > 0
        ? `${b.market} vs ${b.others.join(" / ")}`
        : b.market,
    line: b.line,
    american_odds: b.americanOdds ?? -110,
    stake: b.stake ?? 0,
    to_win: b.toWin ?? 0,
    status: "pending" as const,
    source: body.data.source,
    parse_confidence: b.confidence,
    user_confirmed: false,
    placed_at: new Date().toISOString(),
  }));

  const { error, count } = await supabase
    .from("bets")
    .insert(rows, { count: "exact" });
  if (error) {
    // Surface the full Postgres detail so a failed save is diagnosable
    // from the Vercel runtime logs and the client toast.
    console.error("bets insert failed", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      sampleRow: rows[0],
    });
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, inserted: count ?? rows.length });
}
