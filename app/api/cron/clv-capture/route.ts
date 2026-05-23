import { NextResponse } from "next/server";
import { getGolfOutrights, oddsApiEnabled } from "@/lib/data/odds";
import { clvSupportedMarket } from "@/lib/bets/clv";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Captures closing odds for open win-futures bets so we can compute CLV.
// Best run near first tee (vercel.json: Thursday morning) so the captured
// price approximates the true close. Only writes a closing price once per
// bet (closing_odds is null until captured). Outright markets only — the
// odds source doesn't close props/matchups.

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

const norm = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z\s]/g, "").trim();

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!oddsApiEnabled()) return NextResponse.json({ skipped: "odds api not configured" });
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ skipped: "supabase admin not configured" });

  const outrights = await getGolfOutrights("").catch(() => [] as Awaited<ReturnType<typeof getGolfOutrights>>);
  if (outrights.length === 0) return NextResponse.json({ skipped: "no outright odds" });

  // player → { byBook, prices } for current outright lines.
  const byPlayer = new Map<string, { byBook: Map<string, number>; prices: number[] }>();
  for (const o of outrights) {
    const k = norm(o.player);
    const e = byPlayer.get(k) ?? { byBook: new Map<string, number>(), prices: [] as number[] };
    e.byBook.set(o.bookmaker.toLowerCase(), o.americanOdds);
    e.prices.push(o.americanOdds);
    byPlayer.set(k, e);
  }

  const { data: bets } = await admin
    .from("bets")
    .select("id, player, market, book, american_odds")
    .is("closing_odds", null)
    .in("status", ["pending", "live"]);
  if (!bets || bets.length === 0) {
    return NextResponse.json({ ran_at: new Date().toISOString(), captured: 0 });
  }

  let captured = 0;
  const at = new Date().toISOString();
  for (const b of bets) {
    if (clvSupportedMarket(b.market) !== "outright") continue;
    const entry = byPlayer.get(norm(b.player));
    if (!entry) continue;
    const close = entry.byBook.get(String(b.book).toLowerCase()) ?? median(entry.prices);
    const { error } = await admin
      .from("bets")
      .update({ closing_odds: close, closing_captured_at: at })
      .eq("id", b.id);
    if (!error) captured++;
  }

  return NextResponse.json({ ran_at: at, captured });
}

export const POST = GET;
