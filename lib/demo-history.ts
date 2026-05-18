// Settled-bet history demo data — used by the bets portfolio page until
// we wire Supabase queries.

import type { DashBet } from "@/components/edge/sections";

export type HistoryBet = DashBet & {
  resolvedAt: string;        // ISO timestamp
  resolvedPayout: number;    // net unit P&L (+ for win, − for loss)
  tournament: string;
};

const T = "Quail Hollow Championship";
const T_PREV = "Truist Championship";
const T_PREV2 = "RBC Heritage";

export const SETTLED_BETS: HistoryBet[] = [
  { tournament: T, book: "DK", player: "Schauffele vs Spieth", market: "R2 Matchup", line: "-115", stake: 0.75, payout: 1.4, status: "graded", wave: "AM", live: { score: "W", thru: "F" }, ev: 0, won: true,  resolvedAt: "2026-05-15T18:14:00Z", resolvedPayout: +0.65 },
  { tournament: T, book: "PP", player: "Ludvig Åberg", market: "Birdies",  line: "O 4.5", stake: 0.5,  payout: 1.4, status: "graded", wave: "AM", live: { score: "L", thru: "F" }, ev: 0,                resolvedAt: "2026-05-15T18:02:00Z", resolvedPayout: -0.5 },
  { tournament: T, book: "FD", player: "Sam Burns",    market: "Top 30",   line: "+170", stake: 1.0,  payout: 2.7, status: "graded", wave: "AM", live: { score: "W", thru: "F" }, ev: 0, won: true,  resolvedAt: "2026-05-15T18:00:00Z", resolvedPayout: +1.7 },

  { tournament: T_PREV, book: "DK", player: "Rory McIlroy", market: "To Win",    line: "+900", stake: 0.5, payout: 5.0, status: "graded", live: { score: "L", thru: "F" }, ev: 0,                resolvedAt: "2026-05-12T22:30:00Z", resolvedPayout: -0.5 },
  { tournament: T_PREV, book: "PP", player: "Scottie Scheffler", market: "Strokes Gained Off Tee", line: "O 1.0", stake: 0.5, payout: 1.4, status: "graded", live: { score: "W", thru: "F" }, ev: 0, won: true, resolvedAt: "2026-05-12T22:25:00Z", resolvedPayout: +0.4 },
  { tournament: T_PREV, book: "UD", player: "Tony Finau", market: "Top 20",   line: "+150", stake: 1.0, payout: 2.5, status: "graded", live: { score: "W", thru: "F" }, ev: 0, won: true, resolvedAt: "2026-05-12T22:20:00Z", resolvedPayout: +1.5 },
  { tournament: T_PREV, book: "FD", player: "Hovland vs Cantlay", market: "Matchup", line: "-110", stake: 1.0, payout: 1.9, status: "graded", live: { score: "L", thru: "F" }, ev: 0, resolvedAt: "2026-05-12T22:10:00Z", resolvedPayout: -1.0 },
  { tournament: T_PREV, book: "PP", player: "Patrick Cantlay", market: "Bogeys", line: "U 3.5", stake: 0.5, payout: 1.4, status: "graded", live: { score: "L", thru: "F" }, ev: 0, resolvedAt: "2026-05-12T22:05:00Z", resolvedPayout: -0.5 },

  { tournament: T_PREV2, book: "DK", player: "Justin Thomas",  market: "Top 10", line: "+225", stake: 1.0,  payout: 3.25, status: "graded", live: { score: "W", thru: "F" }, ev: 0, won: true, resolvedAt: "2026-04-21T22:00:00Z", resolvedPayout: +2.25 },
  { tournament: T_PREV2, book: "FD", player: "Collin Morikawa", market: "Top 5",  line: "+550", stake: 0.5,  payout: 3.25, status: "graded", live: { score: "L", thru: "F" }, ev: 0,                  resolvedAt: "2026-04-21T22:00:00Z", resolvedPayout: -0.5 },
  { tournament: T_PREV2, book: "UD", player: "Spieth vs Schauffele", market: "Matchup", line: "+105", stake: 1.0, payout: 2.05, status: "graded", live: { score: "W", thru: "F" }, ev: 0, won: true, resolvedAt: "2026-04-21T22:00:00Z", resolvedPayout: +1.05 },
  { tournament: T_PREV2, book: "PP", player: "Viktor Hovland", market: "Eagles", line: "O 0.5", stake: 0.5, payout: 1.6, status: "graded", live: { score: "L", thru: "F" }, ev: 0, resolvedAt: "2026-04-21T22:00:00Z", resolvedPayout: -0.5 },
];

export function summarize(bets: HistoryBet[]) {
  const total = bets.length;
  const wins = bets.filter((b) => b.won).length;
  const winRate = total ? wins / total : 0;
  const netUnits = bets.reduce((s, b) => s + b.resolvedPayout, 0);
  const totalRisk = bets.reduce((s, b) => s + b.stake, 0);
  const roi = totalRisk ? netUnits / totalRisk : 0;
  return { total, wins, losses: total - wins, winRate, netUnits, totalRisk, roi };
}

// Per-book and per-market breakdowns power the small "where is your edge" panel.
export function groupBy<K extends string>(
  bets: HistoryBet[],
  key: (b: HistoryBet) => K,
) {
  const map = new Map<K, HistoryBet[]>();
  for (const b of bets) {
    const k = key(b);
    const arr = map.get(k);
    if (arr) arr.push(b);
    else map.set(k, [b]);
  }
  return Array.from(map.entries()).map(([k, group]) => ({
    key: k,
    ...summarize(group),
  }));
}
