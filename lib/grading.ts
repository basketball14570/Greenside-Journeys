// Bet grading engine. Takes an open bet + a live leaderboard snapshot
// and returns a decision: won / lost / live / push / unknown. Used by the
// settlement cron, the showdown page (to color winning legs), and the Ask
// Greenside `grade_bets` tool.
//
// Each market type has a dedicated grader. Add new ones as you wire new
// market types — the dispatch is by `bet.market` string match.

import type { LeaderboardPlayer, LeaderboardSnapshot } from "@/lib/espn-leaderboard";

export type OpenBet = {
  id?: string;
  player: string;
  market: string;
  // American odds string like "+250", "-115", or a prop line like "O 4.5"
  line: string;
  stake: number;
  payout: number;
  // Optional explicit fields some bets carry
  round?: number;
  side?: "over" | "under" | "to-win" | "top-5" | "top-10" | "top-20" | "matchup";
  opponent?: string;
};

export type Decision = {
  bet: OpenBet;
  status: "won" | "lost" | "live" | "push" | "unknown";
  reason: string;
  observedValue?: number | string;
  pnl?: number; // net units if settled
};

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findPlayer(
  snapshot: LeaderboardSnapshot,
  name: string,
): LeaderboardPlayer | null {
  const target = norm(name);
  // Exact
  for (const p of snapshot.players) if (norm(p.name) === target) return p;
  // Contains
  for (const p of snapshot.players) {
    const n = norm(p.name);
    if (n.includes(target) || target.includes(n)) return p;
  }
  return null;
}

function eventComplete(snapshot: LeaderboardSnapshot): boolean {
  return snapshot.event?.state === "post";
}

function payoutOnWin(bet: OpenBet): number {
  // payout field in DEMO_BETS is the decimal odds multiplier including stake.
  // Net profit on win = stake * (payout - 1).
  return +(bet.stake * (bet.payout - 1)).toFixed(2);
}

// ── Market graders ───────────────────────────────────────────────

function gradeTopN(bet: OpenBet, snapshot: LeaderboardSnapshot): Decision {
  const target = parseTopN(bet.market);
  const p = findPlayer(snapshot, bet.player);
  if (!p) {
    return { bet, status: "unknown", reason: `Player '${bet.player}' not in current ESPN field` };
  }
  if (p.isCut) {
    return {
      bet,
      status: "lost",
      reason: "Missed cut / withdrew",
      observedValue: p.posDisplay,
      pnl: -bet.stake,
    };
  }
  const meets = p.posNum !== null && p.posNum <= target;
  if (eventComplete(snapshot)) {
    return {
      bet,
      status: meets ? "won" : "lost",
      reason: meets
        ? `Finished ${p.posDisplay}, inside top ${target}`
        : `Finished ${p.posDisplay}, outside top ${target}`,
      observedValue: p.posDisplay,
      pnl: meets ? payoutOnWin(bet) : -bet.stake,
    };
  }
  return {
    bet,
    status: "live",
    reason: meets
      ? `Currently ${p.posDisplay}, inside top ${target}`
      : `Currently ${p.posDisplay}, outside top ${target}`,
    observedValue: p.posDisplay,
  };
}

function gradeToWin(bet: OpenBet, snapshot: LeaderboardSnapshot): Decision {
  const p = findPlayer(snapshot, bet.player);
  if (!p) return { bet, status: "unknown", reason: "Player not in field" };
  if (p.isCut) {
    return { bet, status: "lost", reason: "Missed cut / withdrew", observedValue: p.posDisplay, pnl: -bet.stake };
  }
  if (eventComplete(snapshot)) {
    const won = p.posNum === 1 && !p.posDisplay.startsWith("T");
    return {
      bet,
      status: won ? "won" : "lost",
      reason: won ? "Won outright" : `Finished ${p.posDisplay}`,
      observedValue: p.posDisplay,
      pnl: won ? payoutOnWin(bet) : -bet.stake,
    };
  }
  return {
    bet,
    status: "live",
    reason: `Currently ${p.posDisplay}`,
    observedValue: p.posDisplay,
  };
}

function gradeMatchup(bet: OpenBet, snapshot: LeaderboardSnapshot): Decision {
  if (!bet.opponent) {
    return { bet, status: "unknown", reason: "Matchup bet has no opponent recorded" };
  }
  const mine = findPlayer(snapshot, bet.player);
  const opp = findPlayer(snapshot, bet.opponent);
  if (!mine || !opp) {
    return { bet, status: "unknown", reason: "Could not find one or both matchup players" };
  }
  if (mine.totalScoreNum === null || opp.totalScoreNum === null) {
    return { bet, status: "live", reason: "Matchup not yet started" };
  }
  // Lower total-to-par wins. Tie = push.
  const diff = mine.totalScoreNum - opp.totalScoreNum;
  const ahead = diff < 0;
  const tied = diff === 0;
  if (eventComplete(snapshot)) {
    if (tied) return { bet, status: "push", reason: "Tied on total — push", pnl: 0 };
    return {
      bet,
      status: ahead ? "won" : "lost",
      reason: ahead
        ? `Beat ${bet.opponent} by ${Math.abs(diff)}`
        : `Lost to ${bet.opponent} by ${Math.abs(diff)}`,
      observedValue: `${mine.totalToPar} vs ${opp.totalToPar}`,
      pnl: ahead ? payoutOnWin(bet) : -bet.stake,
    };
  }
  return {
    bet,
    status: "live",
    reason: tied
      ? "Tied on total"
      : ahead
        ? `Up ${Math.abs(diff)} on ${bet.opponent}`
        : `Down ${Math.abs(diff)} to ${bet.opponent}`,
    observedValue: `${mine.totalToPar} vs ${opp.totalToPar}`,
  };
}

function gradeRoundProp(bet: OpenBet, snapshot: LeaderboardSnapshot): Decision {
  // "R2 Score U 70.5" style — needs the round number and an over/under.
  const round = bet.round ?? deriveRoundFromMarket(bet.market);
  const { side, line } = parsePropLine(bet.line);
  if (!round || !side || line === null) {
    return { bet, status: "unknown", reason: "Could not parse round / line / side" };
  }
  const p = findPlayer(snapshot, bet.player);
  if (!p) return { bet, status: "unknown", reason: "Player not in field" };
  const rl = p.rounds.find((r) => r.period === round);
  if (!rl || rl.strokes === null) {
    return { bet, status: "live", reason: `R${round} not started` };
  }
  // Round complete or in progress
  if (side === "over") {
    if (rl.strokes > line) {
      return rl.complete || eventComplete(snapshot)
        ? { bet, status: "won", reason: `R${round} ${rl.strokes} > ${line}`, observedValue: rl.strokes, pnl: payoutOnWin(bet) }
        : { bet, status: "won", reason: `R${round} ${rl.strokes} already exceeds ${line}`, observedValue: rl.strokes, pnl: payoutOnWin(bet) };
    }
    if (!rl.complete && !eventComplete(snapshot)) {
      return { bet, status: "live", reason: `R${round} ${rl.strokes} thru ${rl.thru ?? "?"}`, observedValue: rl.strokes };
    }
    return { bet, status: "lost", reason: `R${round} ${rl.strokes} ≤ ${line}`, observedValue: rl.strokes, pnl: -bet.stake };
  } else {
    // under
    if (rl.complete || eventComplete(snapshot)) {
      const won = rl.strokes < line;
      return {
        bet,
        status: won ? "won" : "lost",
        reason: `R${round} ${rl.strokes} ${won ? "<" : "≥"} ${line}`,
        observedValue: rl.strokes,
        pnl: won ? payoutOnWin(bet) : -bet.stake,
      };
    }
    if (rl.strokes >= line) {
      return { bet, status: "lost", reason: `R${round} ${rl.strokes} already at/over ${line}`, observedValue: rl.strokes, pnl: -bet.stake };
    }
    return { bet, status: "live", reason: `R${round} ${rl.strokes} thru ${rl.thru ?? "?"}`, observedValue: rl.strokes };
  }
}

// ── Parsers ───────────────────────────────────────────────────────

function parseTopN(market: string): number {
  const m = market.toLowerCase().match(/top\s*(\d+)/);
  return m ? parseInt(m[1], 10) : 10;
}

function deriveRoundFromMarket(market: string): number | null {
  const m = market.toLowerCase().match(/\br\s*(\d)\b|round\s*(\d)/);
  if (m) return parseInt(m[1] ?? m[2], 10);
  return null;
}

function parsePropLine(line: string): { side: "over" | "under" | null; line: number | null } {
  const m = line.trim().toUpperCase().match(/^(O|U|OVER|UNDER)\s*(\d+(?:\.\d+)?)/);
  if (!m) return { side: null, line: null };
  const side: "over" | "under" = m[1].startsWith("O") ? "over" : "under";
  return { side, line: parseFloat(m[2]) };
}

// "Make Cut" / "Miss Cut" — settles only after the field plays through the
// cut line. Before then, status reflects current cut probability via
// position vs projected line — but we don't have a projected cut line in
// the ESPN feed, so we just surface "live" until the event posts.
function gradeMakeCut(bet: OpenBet, snapshot: LeaderboardSnapshot): Decision {
  const wantsMake = bet.market.toLowerCase().includes("make");
  const p = findPlayer(snapshot, bet.player);
  if (!p) return { bet, status: "unknown", reason: "Player not in field" };
  const finalState = eventComplete(snapshot);
  // ESPN sets isCut once the cut has been applied. Until then we wait.
  if (p.isCut) {
    return {
      bet,
      status: wantsMake ? "lost" : "won",
      reason: wantsMake ? "Missed cut" : "Missed cut as predicted",
      observedValue: p.posDisplay,
      pnl: wantsMake ? -bet.stake : payoutOnWin(bet),
    };
  }
  // No isCut flag — either still pre-cut or made it.
  // Period >= 3 with the player still active = made the cut.
  if ((snapshot.event?.period ?? 0) >= 3 && !p.isCut) {
    return {
      bet,
      status: wantsMake ? "won" : "lost",
      reason: wantsMake ? "Made cut" : "Made cut against you",
      observedValue: p.posDisplay,
      pnl: wantsMake ? payoutOnWin(bet) : -bet.stake,
    };
  }
  return {
    bet,
    status: finalState ? (wantsMake ? "won" : "lost") : "live",
    reason: "Pre-cut",
    observedValue: p.posDisplay,
  };
}

// ── Dispatcher ───────────────────────────────────────────────────

export function gradeBet(bet: OpenBet, snapshot: LeaderboardSnapshot): Decision {
  const m = bet.market.toLowerCase();
  if (m.includes("make cut") || m.includes("miss cut")) return gradeMakeCut(bet, snapshot);
  if (m.includes("top")) return gradeTopN(bet, snapshot);
  if (m.includes("win") && !m.includes("over") && !m.includes("under")) return gradeToWin(bet, snapshot);
  if (m.includes("matchup") || m.includes("vs")) return gradeMatchup(bet, snapshot);
  if (m.includes("score") || m.includes("strokes") || m.includes("round")) return gradeRoundProp(bet, snapshot);
  return { bet, status: "unknown", reason: `No grader for market '${bet.market}'` };
}

export type GradingReport = {
  graded_at: string;
  event: LeaderboardSnapshot["event"];
  total: number;
  by_status: Record<Decision["status"], number>;
  decisions: Decision[];
  net_pnl_units: number;
};

export function gradeAll(
  bets: OpenBet[],
  snapshot: LeaderboardSnapshot,
): GradingReport {
  const decisions = bets.map((b) => gradeBet(b, snapshot));
  const by_status: Record<Decision["status"], number> = {
    won: 0,
    lost: 0,
    live: 0,
    push: 0,
    unknown: 0,
  };
  let net = 0;
  for (const d of decisions) {
    by_status[d.status]++;
    if (d.pnl !== undefined) net += d.pnl;
  }
  return {
    graded_at: new Date().toISOString(),
    event: snapshot.event,
    total: decisions.length,
    by_status,
    decisions,
    net_pnl_units: +net.toFixed(2),
  };
}
