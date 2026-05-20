import { NextResponse, type NextRequest } from "next/server";
import {
  PostmarkInboundSchema,
  extractUserToken,
  parseBetEmail,
} from "@/lib/parsers/email";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ParsedBet } from "@/lib/parsers/screenshot";

export const runtime = "nodejs";
export const maxDuration = 30;

// Postmark Inbound webhook. Configure Postmark to POST to /api/email/inbound
// with HTTP Basic auth using POSTMARK_INBOUND_TOKEN as the password. The
// `bets+<userToken>@...` address routes to the right account: we look up
// profiles.bets_token, then insert parsed legs into the `bets` table.
export async function POST(req: NextRequest) {
  const token = process.env.POSTMARK_INBOUND_TOKEN;
  if (token) {
    const auth = req.headers.get("authorization") ?? "";
    const expected = "Basic " + Buffer.from(`postmark:${token}`).toString("base64");
    if (auth !== expected) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const payload = PostmarkInboundSchema.safeParse(await req.json());
  if (!payload.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const userToken = extractUserToken(payload.data.To);
  if (!userToken) {
    // Not addressed to bets+<token>@… — silently accept to avoid bounces.
    return NextResponse.json({ accepted: false, reason: "no user token" });
  }

  const bets = await parseBetEmail(payload.data);

  const persisted = await persistBets(userToken, bets, payload.data.MessageID);

  return NextResponse.json({
    accepted: true,
    userToken,
    messageId: payload.data.MessageID,
    parsedCount: bets.length,
    persisted: persisted.count,
    persistError: persisted.error,
    bets,
  });
}

async function persistBets(
  userToken: string,
  bets: ParsedBet[],
  messageId: string,
): Promise<{ count: number; error: string | null }> {
  if (bets.length === 0) return { count: 0, error: null };
  const admin = supabaseAdmin();
  if (!admin) return { count: 0, error: "supabase admin not configured" };

  const { data: profile, error: lookupErr } = await admin
    .from("profiles")
    .select("id")
    .eq("bets_token", userToken)
    .maybeSingle();
  if (lookupErr) return { count: 0, error: `lookup: ${lookupErr.message}` };
  if (!profile) return { count: 0, error: "unknown user token" };

  const rows = bets.map((b) => ({
    user_id: profile.id,
    book: b.book,
    player: b.player,
    // Encode matchup/3-ball opponents into the market ("... vs A / B")
    // so the live grader can reconstruct them (no opponent column).
    market:
      b.others && b.others.length > 0
        ? `${b.market} vs ${b.others.join(" / ")}`
        : b.market,
    line: b.line,
    american_odds: b.americanOdds ?? -110,
    // Parlay economics normalized to a $10 stake (see /api/bets/save).
    stake: b.parlayMultiplier ? 10 : (b.stake ?? 0),
    to_win: b.parlayMultiplier
      ? Number((10 * b.parlayMultiplier).toFixed(2))
      : (b.toWin ?? 0),
    status: "pending" as const,
    source: "email" as const,
    parse_confidence: b.confidence,
    user_confirmed: false,
    placed_at: new Date().toISOString(),
    source_image_path: `postmark:${messageId}`,
  }));

  const { error: insertErr, count } = await admin
    .from("bets")
    .insert(rows, { count: "exact" });
  if (insertErr) return { count: 0, error: `insert: ${insertErr.message}` };
  return { count: count ?? rows.length, error: null };
}
