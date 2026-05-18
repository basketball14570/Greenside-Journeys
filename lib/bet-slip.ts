// Unified bet-slip model. One type covers every market we grade today:
// over/under round props, top-N finishes, outrights, head-to-head matchups,
// 3-balls, and "make/miss cut". Adding a market = adding a `kind` plus a
// grader in lib/grading.ts.
//
// The shape is intentionally flat so it serializes cleanly into
// localStorage and into the Supabase bet_slips.bets JSONB column without
// further marshalling.

export type SlipLegBase = {
  id: string;             // stable client id (uuid v4 or nanoid)
  player: string;         // canonical display name; matched against leaderboard.name
  book?: string;          // DK / FD / PP / UD / etc — optional, for display
  stake: number;          // unit stake (1u = 1 unit on the user's scale)
  americanOdds: number;   // +250, -115, etc.
  note?: string;          // freeform user note
  createdAt: string;      // ISO
};

export type TopNLeg = SlipLegBase & {
  kind: "top_n";
  n: number;              // 5 / 10 / 20 / 30
};

export type WinnerLeg = SlipLegBase & {
  kind: "winner";
};

export type MatchupLeg = SlipLegBase & {
  kind: "matchup";
  opponent: string;       // other player; lower total-to-par wins
  round?: number;         // optional R1..R4 narrowing
};

export type ThreeBallLeg = SlipLegBase & {
  kind: "three_ball";
  others: [string, string];
  round: number;
};

export type RoundPropLeg = SlipLegBase & {
  kind: "round_prop";
  // ESPN provides strokes per round reliably. Birdies/bogeys/eagles are
  // available when the boxscore feed populates them. Fairways hit and
  // greens in regulation come from the detailed stats feed and may be
  // null mid-round — those grade as "unknown" until the round closes.
  metric: "strokes" | "birdies" | "bogeys" | "eagles" | "fairways" | "greens";
  side: "over" | "under";
  line: number;
  round: number;
};

export type MakeCutLeg = SlipLegBase & {
  kind: "make_cut";
  side: "make" | "miss";
};

export type SlipLeg =
  | TopNLeg
  | WinnerLeg
  | MatchupLeg
  | ThreeBallLeg
  | RoundPropLeg
  | MakeCutLeg;

export type Slip = {
  schemaVersion: 1;
  updatedAt: string;
  tournamentId?: string;  // optional context — auto-filled from active event
  legs: SlipLeg[];
};

export const EMPTY_SLIP: Slip = {
  schemaVersion: 1,
  updatedAt: new Date(0).toISOString(),
  legs: [],
};

// Convert a SlipLeg to the OpenBet shape lib/grading.ts consumes. The
// grader does the heavy lifting; we just rewrite the market string into
// a form its dispatcher matches on (lower-cased keyword match).
import type { OpenBet } from "@/lib/grading";

export function legToOpenBet(leg: SlipLeg): OpenBet {
  const stakeStr = leg.stake;
  const decimalOdds = americanToDecimal(leg.americanOdds);
  switch (leg.kind) {
    case "top_n":
      return {
        id: leg.id,
        player: leg.player,
        market: `Top ${leg.n}`,
        line: formatAmerican(leg.americanOdds),
        stake: stakeStr,
        payout: decimalOdds,
      };
    case "winner":
      return {
        id: leg.id,
        player: leg.player,
        market: "Tournament Winner",
        line: formatAmerican(leg.americanOdds),
        stake: stakeStr,
        payout: decimalOdds,
      };
    case "matchup":
      return {
        id: leg.id,
        player: leg.player,
        market: leg.round ? `R${leg.round} Matchup` : "Tournament Matchup",
        line: formatAmerican(leg.americanOdds),
        stake: stakeStr,
        payout: decimalOdds,
        opponent: leg.opponent,
        round: leg.round,
      };
    case "three_ball":
      return {
        id: leg.id,
        player: leg.player,
        market: `R${leg.round} 3-Ball`,
        line: formatAmerican(leg.americanOdds),
        stake: stakeStr,
        payout: decimalOdds,
        round: leg.round,
        others: leg.others.slice(),
      };
    case "round_prop":
      return {
        id: leg.id,
        player: leg.player,
        market: `R${leg.round} ${capitalize(leg.metric)}`,
        line: `${leg.side === "over" ? "O" : "U"} ${leg.line}`,
        stake: stakeStr,
        payout: decimalOdds,
        round: leg.round,
        side: leg.side,
      };
    case "make_cut":
      return {
        id: leg.id,
        player: leg.player,
        market: leg.side === "make" ? "Make Cut" : "Miss Cut",
        line: formatAmerican(leg.americanOdds),
        stake: stakeStr,
        payout: decimalOdds,
      };
  }
}

export function americanToDecimal(odds: number): number {
  if (odds > 0) return odds / 100 + 1;
  return 100 / Math.abs(odds) + 1;
}

// Decimal odds → American (positive when underdog, negative when favorite).
export function decimalToAmerican(decimal: number): number {
  if (decimal >= 2) return Math.round((decimal - 1) * 100);
  return Math.round(-100 / (decimal - 1));
}

function formatAmerican(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Human-readable summary used in lists / pills.
export function describeLeg(leg: SlipLeg): string {
  switch (leg.kind) {
    case "top_n":
      return `Top ${leg.n}`;
    case "winner":
      return `Outright`;
    case "matchup":
      return `vs ${leg.opponent}${leg.round ? ` (R${leg.round})` : ""}`;
    case "three_ball":
      return `3-Ball vs ${leg.others.join(", ")} (R${leg.round})`;
    case "round_prop":
      return `R${leg.round} ${leg.metric} ${leg.side === "over" ? "O" : "U"}${leg.line}`;
    case "make_cut":
      return leg.side === "make" ? "Make Cut" : "Miss Cut";
  }
}
