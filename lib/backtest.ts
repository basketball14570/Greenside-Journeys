// Backtest harness — run different bet-selection strategies against the
// settled bet history and surface ROI, drawdown, and a P&L curve.
//
// Inputs are intentionally tiny while the history sits in demo data; once
// real settlement events stream in from Supabase the same engine runs over
// thousands of rows without changes.

import { SETTLED_BETS, type HistoryBet } from "@/lib/demo-history";
import { PLAYERS } from "@/lib/demo-players";
import { COURSES } from "@/lib/demo-courses";

export type Strategy = {
  id: string;
  label: string;
  description: string;
  // Returns true if the bet should be taken under this strategy.
  filter: (bet: HistoryBet, history: HistoryBet[], idx: number) => boolean;
  // Optional sizing adjustment — return a multiplier on stake (default 1).
  sizing?: (bet: HistoryBet) => number;
};

export type EquityPoint = {
  idx: number;
  resolvedAt: string;
  cumulative: number;     // net units after this bet
  peak: number;           // running max equity
  drawdown: number;       // peak - cumulative (>= 0)
};

export type StrategyResult = {
  strategy: Strategy;
  taken: number;
  skipped: number;
  wins: number;
  losses: number;
  totalRisk: number;
  netUnits: number;
  roi: number;
  winRate: number;
  maxDrawdown: number;
  profitFactor: number;   // wins$ / losses$
  curve: EquityPoint[];
};

// Resolve a player slug from a bet's player string (handles "Schauffele vs Spieth" etc.).
function playerLookup(playerString: string) {
  const lowered = playerString.toLowerCase();
  for (const p of Object.values(PLAYERS)) {
    if (lowered.includes(p.name.toLowerCase().split(" ").pop() ?? "")) return p;
  }
  return null;
}

// Find the course tied to a tournament name.
function courseForTournament(tournament: string) {
  return COURSES.find((c) => c.tournament === tournament);
}

export const STRATEGIES: Strategy[] = [
  {
    id: "baseline",
    label: "Take everything",
    description: "Every settled bet, no filter. The benchmark.",
    filter: () => true,
  },
  {
    id: "wind-discipline",
    label: "Wind discipline",
    description:
      "Skip bets on wind-sensitive players (sensitivity > 0.25) when the course is averaging > 12 mph.",
    filter: (bet) => {
      const player = playerLookup(bet.player);
      const course = courseForTournament(bet.tournament);
      if (!player || !course) return true;
      const windy = course.wind > 12;
      const sensitive = player.windSensitivity > 0.25;
      return !(windy && sensitive);
    },
  },
  {
    id: "no-longshots",
    label: "Drop longshots",
    description:
      "Skip outrights priced longer than +300 — they wreck variance and rarely close.",
    filter: (bet) => bet.payout < 4.0,
  },
  {
    id: "mainstream-books",
    label: "DK + FD only",
    description:
      "Restrict to mainstream sportsbooks. Hedges and live edges live elsewhere; this measures the core book mix.",
    filter: (bet) => bet.book === "DK" || bet.book === "FD",
  },
  {
    id: "wave-aware",
    label: "Wave-aware",
    description:
      "Skip PM-wave bets when the AM-PM scoring split exceeds 0.6 strokes. The simplest way to honor the conditions edge.",
    filter: (bet) => {
      const course = courseForTournament(bet.tournament);
      if (!course || bet.wave !== "PM") return true;
      return Math.abs(course.amSg - course.pmSg) <= 0.6;
    },
  },
  {
    id: "kelly-quarter",
    label: "Quarter-Kelly sizing",
    description:
      "Take everything but scale stake by 0.25 of full Kelly using the book's implied probability as the true probability proxy.",
    filter: () => true,
    sizing: (bet) => {
      const b = bet.payout - 1;
      const p = 1 / bet.payout;
      const q = 1 - p;
      const kelly = (b * p - q) / b;
      return Math.max(0.1, Math.min(1, 0.25 * Math.max(0, kelly) * 4));
    },
  },
];

export function runStrategy(strategy: Strategy, bets: HistoryBet[] = SETTLED_BETS): StrategyResult {
  // Sort chronologically so the curve is meaningful.
  const ordered = [...bets].sort((a, b) =>
    a.resolvedAt.localeCompare(b.resolvedAt),
  );
  const curve: EquityPoint[] = [];
  let cumulative = 0;
  let peak = 0;
  let maxDD = 0;
  let taken = 0;
  let skipped = 0;
  let wins = 0;
  let losses = 0;
  let totalRisk = 0;
  let winDollars = 0;
  let lossDollars = 0;

  ordered.forEach((bet, idx) => {
    if (!strategy.filter(bet, ordered, idx)) {
      skipped++;
      return;
    }
    const sizeMul = strategy.sizing ? strategy.sizing(bet) : 1;
    const stake = bet.stake * sizeMul;
    const pnl = bet.resolvedPayout * sizeMul;
    cumulative += pnl;
    peak = Math.max(peak, cumulative);
    maxDD = Math.max(maxDD, peak - cumulative);
    taken++;
    totalRisk += stake;
    if (bet.won) {
      wins++;
      winDollars += pnl;
    } else {
      losses++;
      lossDollars += -pnl;
    }
    curve.push({
      idx,
      resolvedAt: bet.resolvedAt,
      cumulative: +cumulative.toFixed(3),
      peak: +peak.toFixed(3),
      drawdown: +(peak - cumulative).toFixed(3),
    });
  });

  return {
    strategy,
    taken,
    skipped,
    wins,
    losses,
    totalRisk: +totalRisk.toFixed(2),
    netUnits: +cumulative.toFixed(2),
    roi: totalRisk ? +(cumulative / totalRisk).toFixed(3) : 0,
    winRate: taken ? +(wins / taken).toFixed(3) : 0,
    maxDrawdown: +maxDD.toFixed(2),
    profitFactor: lossDollars ? +(winDollars / lossDollars).toFixed(2) : winDollars > 0 ? Infinity : 0,
    curve,
  };
}

export function runAllStrategies(bets: HistoryBet[] = SETTLED_BETS) {
  return STRATEGIES.map((s) => runStrategy(s, bets));
}

// ── Multi-tournament aggregator ───────────────────────────────
//
// Slices the history by tournament and runs every strategy against each
// slice + the union. Returns a grid that can power "where is the edge"
// per-tournament panels and a per-event ROI heatmap.

export type TournamentSlice = {
  tournament: string;
  bets: HistoryBet[];
  results: StrategyResult[];
};

export function listTournaments(bets: HistoryBet[] = SETTLED_BETS): string[] {
  const seen = new Set<string>();
  for (const b of bets) seen.add(b.tournament);
  return Array.from(seen);
}

export function runByTournament(
  bets: HistoryBet[] = SETTLED_BETS,
): TournamentSlice[] {
  return listTournaments(bets).map((tournament) => {
    const slice = bets.filter((b) => b.tournament === tournament);
    return {
      tournament,
      bets: slice,
      results: STRATEGIES.map((s) => runStrategy(s, slice)),
    };
  });
}

// Returns rows shaped for a strategy × tournament matrix:
// [{ strategy, byTournament: { [tournament]: { netUnits, roi, ... } }, overall }]
export type StrategyMatrixRow = {
  strategy: Strategy;
  overall: StrategyResult;
  byTournament: Record<
    string,
    Pick<StrategyResult, "netUnits" | "roi" | "winRate" | "taken" | "maxDrawdown">
  >;
};

export function buildStrategyMatrix(
  bets: HistoryBet[] = SETTLED_BETS,
): StrategyMatrixRow[] {
  const slices = runByTournament(bets);
  return STRATEGIES.map((strategy) => {
    const overall = runStrategy(strategy, bets);
    const byTournament: StrategyMatrixRow["byTournament"] = {};
    for (const slice of slices) {
      const r = slice.results.find((x) => x.strategy.id === strategy.id)!;
      byTournament[slice.tournament] = {
        netUnits: r.netUnits,
        roi: r.roi,
        winRate: r.winRate,
        taken: r.taken,
        maxDrawdown: r.maxDrawdown,
      };
    }
    return { strategy, overall, byTournament };
  });
}
