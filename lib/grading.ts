// Bet grading engine. Takes an open bet + a live leaderboard snapshot
// and returns a decision: won / lost / live / push / unknown. Used by the
// settlement cron, the showdown page (to color winning legs), and the Ask
// Greenside `grade_bets` tool.
//
// Each market type has a dedicated grader. Add new ones as you wire new
// market types — the dispatch is by `bet.market` string match.

import {
  roundStats,
  type LeaderboardPlayer,
  type LeaderboardSnapshot,
} from "@/lib/espn-leaderboard";

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
  others?: string[];  // 3-ball: the other two players in the group
};

export type Decision = {
  bet: OpenBet;
  status: "won" | "lost" | "live" | "push" | "unknown";
  reason: string;
  observedValue?: number | string;
  // Short, bold "where it stands right now" shown on the right of the
  // live card — e.g. "T36", "4", "-2", "Up 2", "Win". `standingNote` is
  // the small secondary label beneath it — e.g. "birdies", "thru 7".
  standing?: string;
  standingNote?: string;
  pnl?: number; // net units if settled
};

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    // Scandinavian / German precomposed letters that NFD doesn't decompose.
    // Without this, "Højgaard" → "hjgaard" and won't match "Hojgaard".
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .replace(/æ/g, "ae")
    .replace(/ß/g, "ss")
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

// A specific round is "final" once every player still in the field has a
// completed line for it. Used to settle round-scoped position bets ("R1
// Top 10") at the end of that round rather than waiting for the whole
// event — and since the next round is the next day, the leaderboard order
// stays put long enough for the cron to lock it in.
function roundComplete(snapshot: LeaderboardSnapshot, n: number): boolean {
  if (eventComplete(snapshot)) return true;
  const active = snapshot.players.filter((p) => !p.isCut);
  if (active.length === 0) return false;
  return active.every((p) => p.rounds.find((r) => r.period === n)?.complete === true);
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
      standing: "CUT",
      pnl: -bet.stake,
    };
  }
  const meets = p.posNum !== null && p.posNum <= target;
  // Round-scoped position bets ("R1 Top 10") lock when that round is
  // final; tournament-long ones wait for the event to post.
  const settled = bet.round ? roundComplete(snapshot, bet.round) : eventComplete(snapshot);
  if (settled) {
    return {
      bet,
      status: meets ? "won" : "lost",
      reason: meets
        ? `Finished ${p.posDisplay}, inside top ${target}`
        : `Finished ${p.posDisplay}, outside top ${target}`,
      observedValue: p.posDisplay,
      standing: p.posDisplay,
      pnl: meets ? payoutOnWin(bet) : -bet.stake,
    };
  }

  // Cutoff math — surface "X strokes clear of top N" / "Y strokes back of
  // top N" so the bettor sees their actual margin, not just position.
  // This is the Underdog-style display that's more actionable than "T8".
  const cutoff = cutoffForTopN(snapshot, target);
  const myScore = p.totalScoreNum;
  let detail = "";
  if (cutoff !== null && myScore !== null) {
    const diff = myScore - cutoff;
    if (meets) {
      detail = diff === 0
        ? "on the bubble"
        : `${Math.abs(diff)} stroke${Math.abs(diff) === 1 ? "" : "s"} clear of top ${target}`;
    } else {
      detail = diff === 0
        ? "tied with top-" + target + " cutoff"
        : `${Math.abs(diff)} back of top ${target}`;
    }
  }

  return {
    bet,
    status: "live",
    reason: detail
      ? `${p.posDisplay} — ${detail}`
      : meets
        ? `Currently ${p.posDisplay}, inside top ${target}`
        : `Currently ${p.posDisplay}, outside top ${target}`,
    observedValue: p.posDisplay,
    standing: p.posDisplay,
    standingNote: p.todayLine?.thru ? `thru ${p.todayLine.thru}` : undefined,
  };
}

// The score of the Nth-ranked player on the current leaderboard.
// Returns null when fewer than N players have a posted total. Ties at
// the boundary use the score of whoever is currently ranked at position
// N (which is the score the (N+1)th player would need to *beat* to
// claim a top-N spot).
function cutoffForTopN(snapshot: LeaderboardSnapshot, n: number): number | null {
  const scored = snapshot.players
    .filter((p) => !p.isCut && p.totalScoreNum !== null)
    .map((p) => p.totalScoreNum as number)
    .sort((a, b) => a - b);
  if (scored.length < n) return null;
  return scored[n - 1];
}

function gradeToWin(bet: OpenBet, snapshot: LeaderboardSnapshot): Decision {
  const p = findPlayer(snapshot, bet.player);
  if (!p) return { bet, status: "unknown", reason: "Player not in field" };
  if (p.isCut) {
    return { bet, status: "lost", reason: "Missed cut / withdrew", observedValue: p.posDisplay, standing: "CUT", pnl: -bet.stake };
  }
  if (eventComplete(snapshot)) {
    const won = p.posNum === 1 && !p.posDisplay.startsWith("T");
    return {
      bet,
      status: won ? "won" : "lost",
      reason: won ? "Won outright" : `Finished ${p.posDisplay}`,
      observedValue: p.posDisplay,
      standing: won ? "Win" : p.posDisplay,
      pnl: won ? payoutOnWin(bet) : -bet.stake,
    };
  }
  return {
    bet,
    status: "live",
    reason: `Currently ${p.posDisplay}`,
    observedValue: p.posDisplay,
    standing: p.posDisplay,
    standingNote: p.todayLine?.thru ? `thru ${p.todayLine.thru}` : undefined,
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

  // Round-narrowed matchup: compare strokes on the specified round only.
  // Most h2h golf bets are round-specific ("R3 matchup: Hovland vs Cantlay")
  // rather than tournament-long. Fall back to total comparison when no
  // round is set.
  if (bet.round) {
    const mineRound = mine.rounds.find((r) => r.period === bet.round);
    const oppRound = opp.rounds.find((r) => r.period === bet.round);
    const mineStrokes = mineRound?.strokes ?? null;
    const oppStrokes = oppRound?.strokes ?? null;
    if (mineStrokes === null && oppStrokes === null) {
      return { bet, status: "live", reason: `R${bet.round} not started` };
    }
    // While the round is in progress, par-relative through-current-hole
    // is what we want. ESPN gives us toPar on each round line for that.
    const mineToPar = mineRound?.toPar ?? null;
    const oppToPar = oppRound?.toPar ?? null;
    const mineNum = parseToParNum(mineToPar);
    const oppNum = parseToParNum(oppToPar);
    if (mineNum === null || oppNum === null) {
      return { bet, status: "live", reason: `R${bet.round} not started` };
    }
    const diff = mineNum - oppNum;
    const ahead = diff < 0;
    const tied = diff === 0;
    const roundComplete = !!mineRound?.complete && !!oppRound?.complete;
    if (roundComplete) {
      if (tied) return { bet, status: "push", reason: "Tied on R" + bet.round + " — push", standing: "Push", pnl: 0 };
      return {
        bet,
        status: ahead ? "won" : "lost",
        reason: ahead
          ? `Beat ${bet.opponent} by ${Math.abs(diff)} on R${bet.round}`
          : `Lost to ${bet.opponent} by ${Math.abs(diff)} on R${bet.round}`,
        observedValue: `${mineToPar} vs ${oppToPar}`,
        standing: ahead ? "Win" : "Loss",
        pnl: ahead ? payoutOnWin(bet) : -bet.stake,
      };
    }
    return {
      bet,
      status: "live",
      reason: tied
        ? `Tied on R${bet.round}`
        : ahead
          ? `Up ${Math.abs(diff)} on ${bet.opponent}`
          : `Down ${Math.abs(diff)} to ${bet.opponent}`,
      observedValue: `${mineToPar} vs ${oppToPar}`,
      standing: tied ? "AS" : ahead ? `${Math.abs(diff)} Up` : `${Math.abs(diff)} Down`,
      standingNote: mineRound?.thru ? `thru ${mineRound.thru}` : undefined,
    };
  }

  if (mine.totalScoreNum === null || opp.totalScoreNum === null) {
    return { bet, status: "live", reason: "Matchup not yet started" };
  }
  // Lower total-to-par wins. Tie = push.
  const diff = mine.totalScoreNum - opp.totalScoreNum;
  const ahead = diff < 0;
  const tied = diff === 0;
  if (eventComplete(snapshot)) {
    if (tied) return { bet, status: "push", reason: "Tied on total — push", standing: "Push", pnl: 0 };
    return {
      bet,
      status: ahead ? "won" : "lost",
      reason: ahead
        ? `Beat ${bet.opponent} by ${Math.abs(diff)}`
        : `Lost to ${bet.opponent} by ${Math.abs(diff)}`,
      observedValue: `${mine.totalToPar} vs ${opp.totalToPar}`,
      standing: ahead ? "Win" : "Loss",
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
    standing: tied ? "AS" : ahead ? `${Math.abs(diff)} Up` : `${Math.abs(diff)} Down`,
  };
}

function parseToParNum(s: string | null): number | null {
  if (s === null) return null;
  if (s === "E") return 0;
  const n = Number(s.replace("+", ""));
  return Number.isNaN(n) ? null : n;
}

// 3-ball matchup grader. Three players in a group, pick which one
// posts the lowest round score. Round-specific (3-balls are always
// per-round). Position 1st = won, 2nd or 3rd = lost. Ties at the top
// push (most books).
function gradeThreeBall(bet: OpenBet, snapshot: LeaderboardSnapshot): Decision {
  if (!bet.others || bet.others.length < 2 || !bet.round) {
    return { bet, status: "unknown", reason: "3-ball bet missing group members or round" };
  }
  const round = bet.round;
  const mine = findPlayer(snapshot, bet.player);
  const a = findPlayer(snapshot, bet.others[0]);
  const b = findPlayer(snapshot, bet.others[1]);
  if (!mine || !a || !b) {
    return { bet, status: "unknown", reason: "Could not find all three players in field" };
  }
  const mineRound = mine.rounds.find((r) => r.period === round);
  const aRound = a.rounds.find((r) => r.period === round);
  const bRound = b.rounds.find((r) => r.period === round);
  const mineNum = parseToParNum(mineRound?.toPar ?? null);
  const aNum = parseToParNum(aRound?.toPar ?? null);
  const bNum = parseToParNum(bRound?.toPar ?? null);

  // Per-player scoreline for the detail row — "Ryder E · Willett +1 ·
  // Villegas +2" — so the card shows where all three stand.
  const lastName = (n: string) => n.split(" ").slice(-1)[0];
  const fmtP = (n: number | null) =>
    n == null ? "—" : n === 0 ? "E" : n > 0 ? `+${n}` : `${n}`;
  const scoreLine = `${lastName(mine.name)} ${fmtP(mineNum)} · ${lastName(a.name)} ${fmtP(aNum)} · ${lastName(b.name)} ${fmtP(bNum)}`;

  // Pre-tee for the whole group.
  if (mineNum === null && aNum === null && bNum === null) {
    return { bet, status: "live", reason: `R${round} not started` };
  }

  const allComplete =
    !!mineRound?.complete && !!aRound?.complete && !!bRound?.complete;

  // Rank using whatever totals we have so far. Players who haven't
  // started yet sort below everyone with a score in match-state but
  // get the optimistic "incomplete" status until the round is done.
  const ranking = [
    { name: mine.name, score: mineNum, isMine: true },
    { name: a.name, score: aNum, isMine: false },
    { name: b.name, score: bNum, isMine: false },
  ];

  if (allComplete) {
    const min = Math.min(mineNum!, aNum!, bNum!);
    const winners = ranking.filter((r) => r.score === min);
    const minePos = ranking
      .slice()
      .sort((x, y) => (x.score ?? 999) - (y.score ?? 999))
      .findIndex((r) => r.isMine) + 1;
    if (winners.length > 1 && winners.some((w) => w.isMine)) {
      return {
        bet,
        status: "push",
        reason: `Tied for 1st on R${round} — push`,
        standing: "Push",
        pnl: 0,
      };
    }
    const won = winners.length === 1 && winners[0].isMine;
    return {
      bet,
      status: won ? "won" : "lost",
      reason: won
        ? `Won the 3-ball outright on R${round} · ${scoreLine}`
        : `Finished ${minePos} of 3 on R${round} · ${scoreLine}`,
      observedValue: `${mineRound?.toPar ?? "—"} vs ${aRound?.toPar ?? "—"} / ${bRound?.toPar ?? "—"}`,
      standing: won ? "Win" : "Loss",
      pnl: won ? payoutOnWin(bet) : -bet.stake,
    };
  }

  // Live state: rank by current to-par among players who have started.
  // "Leading by N" / "trails by N" / "T1 with X".
  const scored = ranking.filter((r) => r.score !== null) as {
    name: string;
    score: number;
    isMine: boolean;
  }[];
  if (scored.length === 0) {
    return { bet, status: "live", reason: `R${round} not started` };
  }
  scored.sort((x, y) => x.score - y.score);
  const top = scored[0];
  const next = scored[1];
  const mineEntry = scored.find((r) => r.isMine);

  const thru = mineRound?.thru ?? null;
  let reason: string;
  let standing: string | undefined;
  let standingNote: string | undefined;
  if (!mineEntry) {
    reason = `Pre-tee · ${scoreLine}`;
    standing = "—";
  } else if (mineEntry === top) {
    const tiedAtTop = scored.filter((r) => r.score === top.score).length > 1;
    if (tiedAtTop) {
      // Tied for the lead — match-play "all square" rather than a position.
      reason = `Tied for 1st · ${scoreLine}`;
      standing = "AS";
    } else if (next) {
      const lead = next.score - top.score;
      reason = `Leading by ${lead} · ${scoreLine}`;
      standing = `${lead} Up`;
    } else {
      reason = `Leading · ${scoreLine}`;
      standing = "1st";
    }
    standingNote = thru ? `thru ${thru}` : undefined;
  } else {
    const back = mineEntry.score - top.score;
    const pos =
      scored.findIndex((r) => r.isMine) === 1 ? "2nd" : "3rd";
    reason = `${pos} of 3 · ${back} back · ${scoreLine}`;
    standing = `${back} Down`;
    standingNote = thru ? `${pos} · thru ${thru}` : pos;
  }

  return {
    bet,
    status: "live",
    reason,
    observedValue: `${mineRound?.toPar ?? "—"} vs ${aRound?.toPar ?? "—"} / ${bRound?.toPar ?? "—"}`,
    standing,
    standingNote,
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
  // Score relative to par drives the bold standing ("-2"); strokes count
  // stays in the detail line. `thru` is the small note while in progress.
  const standing = rl.toPar ?? String(rl.strokes);
  const note = rl.thru && rl.thru < 18 ? `thru ${rl.thru}` : undefined;
  // Round complete or in progress
  if (side === "over") {
    if (rl.strokes > line) {
      return { bet, status: "won", reason: rl.complete || eventComplete(snapshot) ? `R${round} ${rl.strokes} > ${line}` : `R${round} ${rl.strokes} already exceeds ${line}`, observedValue: rl.strokes, standing, standingNote: note, pnl: payoutOnWin(bet) };
    }
    if (!rl.complete && !eventComplete(snapshot)) {
      return { bet, status: "live", reason: `R${round} ${rl.strokes} thru ${rl.thru ?? "?"}`, observedValue: rl.strokes, standing, standingNote: note };
    }
    return { bet, status: "lost", reason: `R${round} ${rl.strokes} ≤ ${line}`, observedValue: rl.strokes, standing, pnl: -bet.stake };
  } else {
    // under
    if (rl.complete || eventComplete(snapshot)) {
      const won = rl.strokes < line;
      return {
        bet,
        status: won ? "won" : "lost",
        reason: `R${round} ${rl.strokes} ${won ? "<" : "≥"} ${line}`,
        observedValue: rl.strokes,
        standing,
        pnl: won ? payoutOnWin(bet) : -bet.stake,
      };
    }
    if (rl.strokes >= line) {
      return { bet, status: "lost", reason: `R${round} ${rl.strokes} already at/over ${line}`, observedValue: rl.strokes, standing, standingNote: note, pnl: -bet.stake };
    }
    return { bet, status: "live", reason: `R${round} ${rl.strokes} thru ${rl.thru ?? "?"}`, observedValue: rl.strokes, standing, standingNote: note };
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
  // "Make the cut" / "Made cuts over 0.5" want a made cut; "miss" or the
  // under side (e.g. "made cuts under 0.5" = zero cuts made) want a miss.
  const m = bet.market.toLowerCase();
  const line = (bet.line ?? "").toString().toLowerCase();
  const under = line.startsWith("u") || m.includes("under") || m.includes("lower");
  const wantsMake = m.includes("miss") ? false : !under;
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
    reason: makeCutMargin(p.totalScoreNum, p.totalToPar, projectedCutScore(snapshot)),
    observedValue: p.posDisplay,
    standing: p.posDisplay || p.totalToPar || undefined,
    standingNote: p.todayLine?.thru ? `thru ${p.todayLine.thru}` : undefined,
  };
}

// Projected cut score — top 65 + ties. Uses the 65th-best score once the
// field is deep enough to be meaningful; before that, uses the worst score
// among players already scoring so early R1 still shows a rough margin.
function projectedCutScore(snapshot: LeaderboardSnapshot): number | null {
  const scored = snapshot.players
    .filter((p) => !p.isCut && p.totalScoreNum !== null)
    .map((p) => p.totalScoreNum as number)
    .sort((a, b) => a - b);
  if (scored.length < 10) return null;
  return scored[Math.min(64, scored.length - 1)];
}

// Strokes clear / back / on the PGA cut line (top 65 + ties). Falls back
// progressively: cut margin when we can compute it, the player's current
// to-par before enough field has scored, then a plain "Pre-cut".
function makeCutMargin(
  myScore: number | null,
  myToPar: string | null,
  cutoff: number | null,
): string {
  if (cutoff !== null && myScore !== null) {
    const diff = myScore - cutoff;
    if (diff === 0) return "on the cut line";
    const n = Math.abs(diff);
    const s = n === 1 ? "" : "s";
    return diff < 0 ? `${n} stroke${s} clear of cut` : `${n} stroke${s} back of cut`;
  }
  if (myToPar) return `Currently ${myToPar}`;
  return "Pre-cut";
}

// ── Dispatcher ───────────────────────────────────────────────────

export function gradeBet(bet: OpenBet, snapshot: LeaderboardSnapshot): Decision {
  const m = bet.market.toLowerCase();
  if (m.includes("make cut") || m.includes("made cut") || m.includes("make the cut") || m.includes("miss cut") || m.includes("miss the cut")) {
    return gradeMakeCut(bet, snapshot);
  }
  if (m.includes("top")) return gradeTopN(bet, snapshot);
  if (m.includes("win") && !m.includes("over") && !m.includes("under")) return gradeToWin(bet, snapshot);
  if (m.includes("3-ball") || m.includes("3 ball")) return gradeThreeBall(bet, snapshot);
  if (m.includes("matchup") || m.includes("vs")) return gradeMatchup(bet, snapshot);
  if (m.includes("score") || m.includes("strokes") || m.includes("round")) return gradeRoundProp(bet, snapshot);
  // Birdies / bogeys / eagles: derive from hole-by-hole scores in the
  // ESPN snapshot vs course par.
  if (m.includes("birdie") || m.includes("bogey") || m.includes("eagle")) {
    return gradeRoundStatProp(bet, snapshot);
  }
  // Fairways hit / greens in regulation are graded from DataGolf live
  // stats (see lib/bets/shot-props); the base grader only lands here
  // before that data exists — usually because the player hasn't teed off.
  // Surface a neutral "awaiting" state rather than a manual-settle note.
  if (m.includes("fairway") || m.includes("green")) {
    const rnd = bet.round ?? deriveRoundFromMarket(bet.market);
    const p = findPlayer(snapshot, bet.player);
    const rl = rnd ? p?.rounds.find((r) => r.period === rnd) : undefined;
    const started = !!rl && (rl.strokes !== null || (rl.thru ?? 0) > 0);
    return {
      bet,
      status: "live",
      reason: rnd && !started ? `R${rnd} not started` : "Awaiting fairways / GIR",
    };
  }
  return { bet, status: "unknown", reason: `No grader for market '${bet.market}'` };
}

function gradeRoundStatProp(bet: OpenBet, snapshot: LeaderboardSnapshot): Decision {
  const round = bet.round ?? deriveRoundFromMarket(bet.market);
  const { side, line } = parsePropLine(bet.line);
  if (!round || !side || line === null) {
    return { bet, status: "unknown", reason: "Could not parse round / line / side" };
  }
  const p = findPlayer(snapshot, bet.player);
  if (!p) return { bet, status: "unknown", reason: "Player not in field" };
  const rl = p.rounds.find((r) => r.period === round);
  if (!rl) {
    return { bet, status: "live", reason: `R${round} not started` };
  }
  const stats = roundStats(rl, snapshot.event?.course ?? null, snapshot.event?.holePars);
  if (!stats || stats.played === 0) {
    return { bet, status: "live", reason: `R${round} not started` };
  }
  const m = bet.market.toLowerCase();
  // "birdies or better" = birdie + eagle; "birdies" alone = exact -1 birdies
  // count. PrizePicks / DK both use the former phrasing for this market,
  // so we treat "birdies" without further qualifier as birdies-or-better
  // since that's by far the more common book offering.
  const observed = m.includes("eagle")
    ? stats.eagles
    : m.includes("bogey")
      ? stats.bogeys + stats.doublesOrWorse
      : stats.birdiesOrBetter;

  const label = m.includes("eagle") ? "eagles" : m.includes("bogey") ? "bogeys+" : "birdies+";
  const unit = m.includes("eagle") ? "eagles" : m.includes("bogey") ? "bogeys" : "birdies";
  const remaining = 18 - stats.played;
  const isFinal = rl.complete || stats.played >= 18;
  // Bold standing = the live count ("4"), with the unit as the small note.
  const standing = String(observed);

  if (side === "over") {
    if (observed > line) {
      return {
        bet,
        status: "won",
        reason: `R${round} ${observed} ${label} thru ${stats.played} (need >${line})`,
        observedValue: observed,
        standing,
        standingNote: unit,
        pnl: payoutOnWin(bet),
      };
    }
    if (isFinal) {
      return {
        bet,
        status: "lost",
        reason: `R${round} final: ${observed} ${label} ≤ ${line}`,
        observedValue: observed,
        standing,
        standingNote: unit,
        pnl: -bet.stake,
      };
    }
    return {
      bet,
      status: "live",
      reason: `R${round} ${observed} ${label} thru ${stats.played} · need ${Math.ceil(line - observed + 0.5)} more in ${remaining}`,
      observedValue: observed,
      standing,
      standingNote: unit,
    };
  }
  // Under
  if (observed > line) {
    return {
      bet,
      status: "lost",
      reason: `R${round} ${observed} ${label} already over ${line}`,
      observedValue: observed,
      standing,
      standingNote: unit,
      pnl: -bet.stake,
    };
  }
  if (isFinal) {
    return {
      bet,
      status: "won",
      reason: `R${round} final: ${observed} ${label} < ${line}`,
      observedValue: observed,
      standing,
      standingNote: unit,
      pnl: payoutOnWin(bet),
    };
  }
  return {
    bet,
    status: "live",
    reason: `R${round} ${observed} ${label} thru ${stats.played} · ${remaining} holes left for line ${line}`,
    observedValue: observed,
    standing,
    standingNote: unit,
  };
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
