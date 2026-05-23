import { NextResponse } from "next/server";
import { fetchLeaderboard } from "@/lib/espn-leaderboard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { pushToUser, pushEnabled } from "@/lib/notify/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Tee-time reminders. Runs every ~15 min (vercel.json); finds open bets
// whose player tees off within the next REMIND_MIN minutes and pushes the
// owner a heads-up. One notification per user per tick, deduped in-memory
// by user|player|teeTime so a player only triggers once even though the
// window spans multiple ticks.
//
// NOTE: needs a sub-hourly cron (Vercel Pro). On Hobby (daily crons only)
// trigger it from an external scheduler hitting this endpoint.

const REMIND_MIN = 30;
const sent = new Set<string>();

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

const norm = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z\s]/g, "").trim();
const lastName = (s: string) => norm(s).split(/\s+/).pop() ?? "";

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!pushEnabled()) return NextResponse.json({ skipped: "push not configured" });
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ skipped: "supabase admin not configured" });

  const lb = await fetchLeaderboard().catch(() => null);
  const players = lb?.players ?? [];
  const byName = new Map<string, string>();
  const byLast = new Map<string, string>();
  for (const p of players) {
    if (!p.teeTime) continue;
    byName.set(norm(p.name), p.teeTime);
    byLast.set(lastName(p.name), p.teeTime);
  }

  const { data: bets } = await admin
    .from("bets")
    .select("user_id, player")
    .in("status", ["pending", "live"]);
  if (!bets || bets.length === 0) {
    return NextResponse.json({ ran_at: new Date().toISOString(), reminders: 0 });
  }

  const now = Date.now();
  // user → list of { player, minutes } for players teeing off soon.
  const perUser = new Map<string, { player: string; minutes: number }[]>();
  for (const b of bets) {
    const tee = byName.get(norm(b.player)) ?? byLast.get(lastName(b.player));
    if (!tee) continue;
    const minutes = Math.round((Date.parse(tee) - now) / 60000);
    if (minutes < 0 || minutes > REMIND_MIN) continue;
    const dedupKey = `${b.user_id}|${norm(b.player)}|${tee}`;
    if (sent.has(dedupKey)) continue;
    sent.add(dedupKey);
    const arr = perUser.get(b.user_id) ?? [];
    arr.push({ player: b.player, minutes });
    perUser.set(b.user_id, arr);
  }

  let pushed = 0;
  for (const [userId, list] of perUser) {
    const soonest = list.reduce((a, b) => (b.minutes < a.minutes ? b : a));
    const body =
      list.length === 1
        ? `${soonest.player} tees off in ${Math.max(0, soonest.minutes)} min`
        : `${list.length} of your players tee off soon — ${soonest.player} in ${Math.max(0, soonest.minutes)} min`;
    const res = await pushToUser(userId, {
      title: "⛳ Tee time soon",
      body,
      url: "/dashboard/live",
      tag: "tee-reminder",
    });
    if (res.sent > 0) pushed++;
  }

  return NextResponse.json({ ran_at: new Date().toISOString(), reminders: pushed });
}

export const POST = GET;
