import type { OpenBet } from "@/lib/grading";
import type { ParsedBet } from "@/lib/parsers/screenshot";

// Curated parlays we feature on the public site and track live against
// the ESPN leaderboard. Hand-entered from the slips; update each week.
// Tee times are venue-local.

export type FeaturedLeg = {
  player: string;
  pick: string; // human-readable prop/matchup as shown on the book
  odds?: string; // american odds for display, e.g. "+110"
  round: 1 | 2 | 3 | 4;
  teeLabel: string;
  // Prop legs (birdies / bogeys / round strokes / position):
  side?: "higher" | "lower" | "better";
  line?: number;
  // 3-ball matchup legs: the other two players in the group.
  others?: string[];
};

export type FeaturedParlay = {
  id: string;
  book: string;
  event: string;
  venue: string;
  entry: number;
  payout: number;
  odds: string; // headline american odds, e.g. "+970" or "+10565"
  postedAt: string; // ISO
  legs: FeaturedLeg[];
};

// Map a featured leg to the grading engine's OpenBet so it grades live.
export function featuredLegToOpenBet(leg: FeaturedLeg): OpenBet {
  // 3-ball matchup.
  if (leg.others && leg.others.length >= 2) {
    return {
      player: leg.player,
      market: `R${leg.round} 3-ball`,
      line: leg.odds ?? "+100",
      stake: 1,
      payout: 1,
      round: leg.round,
      side: "matchup",
      others: leg.others,
    };
  }
  const p = leg.pick.toLowerCase();
  if (p.includes("leaderboard position")) {
    const topN = Math.floor(leg.line ?? 10);
    return {
      player: leg.player,
      market: `R${leg.round} Top ${topN} leaderboard position`,
      line: "+100",
      stake: 1,
      payout: 1,
      round: leg.round,
      side: topN <= 5 ? "top-5" : topN <= 10 ? "top-10" : "top-20",
    };
  }
  const ou = leg.side === "lower" ? "U" : "O";
  let market: string;
  if (p.includes("birdie")) market = `R${leg.round} birdies or better`;
  else if (p.includes("bogey")) market = `R${leg.round} bogeys or worse`;
  else market = `R${leg.round} round strokes`;
  return {
    player: leg.player,
    market,
    line: `${ou} ${leg.line}`,
    stake: 1,
    payout: 1,
    round: leg.round,
    side: leg.side === "lower" ? "under" : "over",
  };
}

// Deterministic seed for "load this into my account": converts a
// featured parlay into the ParsedBet rows the save route expects, with
// the REAL ticket economics baked in via parlayMultiplier (= payout ÷
// entry). This bypasses OCR so the grouped parlay card always shows the
// correct multiplier and $10 → $X payout instead of a per-leg estimate.
// Market strings mirror what the OCR pipeline emits so each leg routes
// to the same grader (Top-N, round prop, 3-ball, round-stat prop).
function bookToSlug(book: string): ParsedBet["book"] {
  const b = book.toLowerCase();
  if (b.includes("underdog")) return "underdog";
  if (b.includes("prizepicks")) return "prizepicks";
  if (b.includes("draftkings")) return "draftkings";
  if (b.includes("fanduel")) return "fanduel";
  if (b.includes("caesars")) return "caesars";
  if (b.includes("betmgm")) return "betmgm";
  return "other";
}

function featuredLegToMarketLine(leg: FeaturedLeg): { market: string; line: number | null } {
  // 3-ball matchup — opponents fold into the market on save as "vs A / B".
  if (leg.others && leg.others.length >= 2) {
    return { market: `R${leg.round} 3-ball`, line: null };
  }
  const p = leg.pick.toLowerCase();
  if (p.includes("leaderboard position") || p.includes("finish")) {
    const topN = Math.floor(leg.line ?? 10);
    return { market: `R${leg.round} Top ${topN}`, line: topN };
  }
  const ou = leg.side === "lower" ? "under" : "over";
  if (p.includes("birdie")) return { market: `R${leg.round} birdies or better ${ou}`, line: leg.line ?? null };
  if (p.includes("bogey")) return { market: `R${leg.round} bogeys or worse ${ou}`, line: leg.line ?? null };
  return { market: `R${leg.round} round score ${ou}`, line: leg.line ?? null };
}

export function featuredParlayToParsedBets(p: FeaturedParlay): ParsedBet[] {
  const multiplier = Number((p.payout / p.entry).toFixed(2));
  return p.legs.map((leg) => {
    const { market, line } = featuredLegToMarketLine(leg);
    const odds = leg.odds ? parseInt(leg.odds.replace("+", ""), 10) : null;
    return {
      book: bookToSlug(p.book),
      player: leg.player,
      market,
      line,
      americanOdds: Number.isFinite(odds) ? odds : null,
      stake: null,
      toWin: null,
      confidence: 1,
      others: leg.others,
      parlayMultiplier: multiplier,
    };
  });
}

// AT&T Byron Nelson — TPC Craig Ranch, McKinney TX. Round 1, Thursday.
const BYRON_NELSON_UD: FeaturedParlay = {
  id: "ud-byron-nelson-r1",
  book: "Underdog Fantasy",
  event: "THE CJ CUP Byron Nelson",
  venue: "TPC Craig Ranch · McKinney, TX",
  entry: 15,
  payout: 14559.75,
  odds: "+97065",
  postedAt: "2026-05-19T15:35:00-05:00",
  legs: [
    { player: "Rasmus Højgaard", pick: "Better than 10.5 R1 leaderboard position", side: "better", line: 10.5, round: 1, teeLabel: "Thu 7:22a" },
    { player: "Scottie Scheffler", pick: "Better than 10.5 R1 leaderboard position", side: "better", line: 10.5, round: 1, teeLabel: "Thu 7:33a" },
    { player: "Si Woo Kim", pick: "Lower than 1.5 bogeys or worse", side: "lower", line: 1.5, round: 1, teeLabel: "Thu 7:33a" },
    { player: "Wyndham Clark", pick: "Better than 10.5 R1 leaderboard position", side: "better", line: 10.5, round: 1, teeLabel: "Thu 7:44a" },
    { player: "Jordan Smith", pick: "Higher than 4.5 birdies or better", side: "higher", line: 4.5, round: 1, teeLabel: "Thu 8:28a" },
    { player: "Rico Hoey", pick: "Better than 10.5 R1 leaderboard position", side: "better", line: 10.5, round: 1, teeLabel: "Thu 8:28a" },
    { player: "Austin Eckroat", pick: "Higher than 4.5 birdies or better", side: "higher", line: 4.5, round: 1, teeLabel: "Thu 12:32p" },
    { player: "Beau Hossler", pick: "Lower than 69.5 round strokes", side: "lower", line: 69.5, round: 1, teeLabel: "Thu 1:27p" },
  ],
};

// 6-leg R1 3-ball matchup parlay (Hard Rock Bet). Each leg wins if the
// player has the low round in their threesome.
const BYRON_NELSON_3BALL: FeaturedParlay = {
  id: "hr-byron-nelson-3ball-r1",
  book: "Hard Rock Bet",
  event: "THE CJ CUP Byron Nelson",
  venue: "TPC Craig Ranch · McKinney, TX",
  entry: 5,
  payout: 533.23,
  odds: "+10565",
  postedAt: "2026-05-19T00:00:00-05:00",
  legs: [
    { player: "Mac Meissner", pick: "R1 3-ball vs Adam Svensson, Dylan Wu", odds: "+110", round: 1, teeLabel: "Thu 8:00a", others: ["Adam Svensson", "Dylan Wu"] },
    { player: "Doug Ghim", pick: "R1 3-ball vs Emiliano Grillo, S.Y. Noh", odds: "+130", round: 1, teeLabel: "Thu 8:00a", others: ["Emiliano Grillo", "S.Y. Noh"] },
    { player: "Kevin Roy", pick: "R1 3-ball vs Scott Piercy, Justin Lower", odds: "+100", round: 1, teeLabel: "Thu 9:17a", others: ["Scott Piercy", "Justin Lower"] },
    { player: "Karl Vilips", pick: "R1 3-ball vs Adam Schenk, Steven Fisk", odds: "+140", round: 1, teeLabel: "Thu 8:55a", others: ["Adam Schenk", "Steven Fisk"] },
    { player: "Eric Cole", pick: "R1 3-ball vs Vince Whaley, Carson Young", odds: "+130", round: 1, teeLabel: "Thu 9:17a", others: ["Vince Whaley", "Carson Young"] },
    { player: "Sam Ryder", pick: "R1 3-ball vs Danny Willett, Camilo Villegas", odds: "+100", round: 1, teeLabel: "Thu 2:16p", others: ["Danny Willett", "Camilo Villegas"] },
  ],
};

export const FEATURED_PARLAYS: FeaturedParlay[] = [
  BYRON_NELSON_UD,
  BYRON_NELSON_3BALL,
];

// Primary parlay for the homepage teaser.
export const FEATURED_PARLAY = BYRON_NELSON_UD;
