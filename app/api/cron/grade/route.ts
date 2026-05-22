import { NextResponse } from "next/server";
import { fetchLeaderboard, type LeaderboardSnapshot } from "@/lib/espn-leaderboard";
import { gradeAll, type OpenBet } from "@/lib/grading";
import { dbBetToOpenBet } from "@/lib/bets/open-bet";
import {
  deriveShotCounts,
  gradeShotProp,
  normShotName,
  type ShotRates,
} from "@/lib/bets/shot-props";
import { datagolfEnabled, getLiveTournamentStats } from "@/lib/data/datagolf";
import { DEMO_BETS } from "@/lib/demo-data";
import { diffDecisions, renderAlertText } from "@/lib/notify/alerts";
import { dispatchAll } from "@/lib/notify/webhooks";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { pushToUser, pushEnabled } from "@/lib/notify/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
    const { changed, firstRun } = diffDecisions("default", report.decisions);

    // Only fan out webhooks when something actually transitioned, and
    // never on the first run (avoids a flood when the process boots).
    let dispatched: Awaited<ReturnType<typeof dispatchAll>> = [];
    if (changed.length && !firstRun) {
      const markdown = renderAlertText(changed);
      dispatched = await dispatchAll({
        title: `Greenside · ${changed.length} bet update${changed.length === 1 ? "" : "s"}`,
        markdown,
        html: `<pre style="font-family:-apple-system,Segoe UI,Roboto,sans-serif">${escapeHtml(markdown)}</pre>`,
        url: `${new URL(req.url).origin}/dashboard/bets`,
      });
    }

    const userPush = await gradeAndPushUserBets(snapshot);

    return NextResponse.json({
      ran_at: new Date().toISOString(),
      event: snapshot.event?.shortName ?? null,
      total: report.total,
      by_status: report.by_status,
      net_pnl_units: report.net_pnl_units,
      first_run: firstRun,
      changed: changed.length,
      dispatched,
      user_push: userPush.push,
      settled: userPush.settled,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

export const POST = GET;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Pulls all live/pending bets owned by real users out of Supabase,
// grades each user's bets, diffs against the prior tick scoped by
// user_id, and fires a web-push to that user for every transition.
// No-ops cleanly when the service role key or push aren't configured.
async function gradeAndPushUserBets(snapshot: LeaderboardSnapshot): Promise<{
  push: { users: number; transitions: number; pushed: number };
  settled: number;
}> {
  const admin = supabaseAdmin();
  if (!admin) return { push: { users: 0, transitions: 0, pushed: 0 }, settled: 0 };

  const { data, error } = await admin
    .from("bets")
    .select("id, user_id, player, market, line, american_odds, stake, to_win, status")
    .in("status", ["live", "pending"]);
  if (error || !data) return { push: { users: 0, transitions: 0, pushed: 0 }, settled: 0 };

  const byUser = new Map<string, typeof data>();
  for (const row of data) {
    const arr = byUser.get(row.user_id) ?? [];
    arr.push(row);
    byUser.set(row.user_id, arr);
  }

  // DataGolf fairways/GIR rates for the active round, so FH/GIR props can
  // settle server-side (ESPN's free feed has none). Keyed by normalized
  // name; empty when DataGolf isn't configured or the call fails.
  const courseName = snapshot.event?.course ?? null;
  const round = snapshot.event?.period;
  const dgRates = new Map<string, ShotRates>();
  if (datagolfEnabled() && round && round >= 1 && round <= 4) {
    try {
      const res = await getLiveTournamentStats({ round: round as 1 | 2 | 3 | 4 });
      for (const s of res.live_stats) {
        dgRates.set(normShotName(s.player_name), {
          accuracy: s.accuracy,
          gir: s.gir,
          scrambling: s.scrambling,
        });
      }
    } catch {
      /* leave FH/GIR props for manual settlement this tick */
    }
  }
  const playerByName = new Map(
    snapshot.players.map((p) => [normShotName(p.name), p]),
  );

  let transitions = 0;
  let pushed = 0;
  let settled = 0;
  const canPush = pushEnabled();
  const now = new Date().toISOString();

  for (const [userId, rows] of byUser) {
    const rowById = new Map(rows.map((r) => [r.id, r]));
    const openBets: OpenBet[] = rows.map((r) => dbBetToOpenBet(r));
    const report = gradeAll(openBets, snapshot);

    // Grade FH/GIR props (which the base grader punts to manual) from the
    // DataGolf rates, so they reach a terminal state once the round ends.
    for (const d of report.decisions) {
      if (d.status !== "unknown" || !d.bet.id) continue;
      const mm = d.bet.market.toLowerCase();
      if (!mm.includes("fairway") && !mm.includes("green")) continue;
      const lp = playerByName.get(normShotName(d.bet.player));
      const shots = deriveShotCounts(
        dgRates.get(normShotName(d.bet.player)) ?? null,
        lp?.todayLine,
        courseName,
      );
      if (!shots) continue;
      const sp = gradeShotProp(d.bet, shots);
      if (sp) Object.assign(d, sp);
    }

    // Persist any leg that reached a terminal state. The query above only
    // pulls live/pending rows, so this is idempotent across ticks. A
    // parlay leg settles independently; bankroll aggregates by parlay.
    for (const d of report.decisions) {
      if (!d.bet.id) continue;
      if (d.status !== "won" && d.status !== "lost" && d.status !== "push") continue;
      const row = rowById.get(d.bet.id);
      if (!row) continue;
      const resolved_payout =
        d.status === "won"
          ? Number(row.to_win)
          : d.status === "push"
            ? Number(row.stake)
            : 0;
      const status = d.status === "push" ? "void" : d.status;
      const { error: upErr } = await admin
        .from("bets")
        .update({ status, resolved_at: now, resolved_payout })
        .eq("id", d.bet.id)
        .in("status", ["live", "pending"]);
      if (!upErr) settled++;
    }

    const { changed, firstRun } = diffDecisions(`user:${userId}`, report.decisions);
    if (changed.length === 0 || firstRun) continue;
    transitions += changed.length;
    if (!canPush) continue;
    const head = changed[0];
    const more = changed.length > 1 ? ` +${changed.length - 1} more` : "";
    const res = await pushToUser(userId, {
      title: `Greenside · ${head.bet.player} ${head.status.toUpperCase()}`,
      body: `${head.bet.market} — ${head.reason}${more}`,
      url: "/dashboard/bets",
      tag: "greenside-grade",
    });
    pushed += res.sent;
  }

  return { push: { users: byUser.size, transitions, pushed }, settled };
}
