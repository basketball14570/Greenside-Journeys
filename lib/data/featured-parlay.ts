// The curated "parlay of the week" we feature on the public site and
// track live against the ESPN leaderboard. Hand-entered from the slip;
// update each tournament week. Tee times are local to the venue.

export type FeaturedLeg = {
  player: string;
  pick: string; // human-readable prop as shown on the book
  side: "higher" | "lower" | "better";
  line: number;
  round: 1 | 2 | 3 | 4;
  teeTime: string; // ISO; venue-local wall time noted in `teeLabel`
  teeLabel: string;
};

export type FeaturedParlay = {
  book: string;
  event: string;
  venue: string;
  entry: number;
  payout: number;
  multiplier: number;
  postedAt: string; // ISO
  legs: FeaturedLeg[];
};

import type { OpenBet } from "@/lib/grading";

// Map a featured leg to the grading engine's OpenBet shape so it can be
// graded live against the ESPN snapshot. Market strings are chosen to hit
// the right grader: "Top N" → position, "birdies/bogeys" → hole-by-hole
// stat prop, "round strokes" → round score prop.
export function featuredLegToOpenBet(leg: FeaturedLeg): OpenBet {
  const p = leg.pick.toLowerCase();
  if (p.includes("leaderboard position")) {
    // "Better than 10.5 position" = finish inside the top 10.
    const topN = Math.floor(leg.line);
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
export const FEATURED_PARLAY: FeaturedParlay = {
  book: "Underdog Fantasy",
  event: "AT&T Byron Nelson",
  venue: "TPC Craig Ranch · McKinney, TX",
  entry: 15,
  payout: 14559.75,
  multiplier: 970.65,
  postedAt: "2026-05-19T15:35:00-05:00",
  legs: [
    { player: "Rasmus Højgaard", pick: "Better than 10.5 R1 leaderboard position", side: "better", line: 10.5, round: 1, teeTime: "2026-05-21T07:22:00-05:00", teeLabel: "Thu 7:22a" },
    { player: "Scottie Scheffler", pick: "Better than 10.5 R1 leaderboard position", side: "better", line: 10.5, round: 1, teeTime: "2026-05-21T07:33:00-05:00", teeLabel: "Thu 7:33a" },
    { player: "Si Woo Kim", pick: "Lower than 1.5 bogeys or worse", side: "lower", line: 1.5, round: 1, teeTime: "2026-05-21T07:33:00-05:00", teeLabel: "Thu 7:33a" },
    { player: "Wyndham Clark", pick: "Better than 10.5 R1 leaderboard position", side: "better", line: 10.5, round: 1, teeTime: "2026-05-21T07:44:00-05:00", teeLabel: "Thu 7:44a" },
    { player: "Jordan Smith", pick: "Higher than 4.5 birdies or better", side: "higher", line: 4.5, round: 1, teeTime: "2026-05-21T08:28:00-05:00", teeLabel: "Thu 8:28a" },
    { player: "Rico Hoey", pick: "Better than 10.5 R1 leaderboard position", side: "better", line: 10.5, round: 1, teeTime: "2026-05-21T08:28:00-05:00", teeLabel: "Thu 8:28a" },
    { player: "Austin Eckroat", pick: "Higher than 4.5 birdies or better", side: "higher", line: 4.5, round: 1, teeTime: "2026-05-21T12:32:00-05:00", teeLabel: "Thu 12:32p" },
    { player: "Beau Hossler", pick: "Lower than 69.5 round strokes", side: "lower", line: 69.5, round: 1, teeTime: "2026-05-21T13:27:00-05:00", teeLabel: "Thu 1:27p" },
  ],
};
