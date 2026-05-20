import type { OpenBet } from "@/lib/grading";

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
