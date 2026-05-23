// Bridges the ESPN hole-by-hole leaderboard to the fantasy scoring engine:
// turn each player's RoundLine[] into per-hole results and score them with a
// chosen format. The scoring engine needs par PER HOLE; ESPN's feed doesn't
// always supply it, so `parCoverage` lets callers see how scoreable the live
// data actually is before trusting recomputed points.

import type { RoundLine } from "@/lib/espn-leaderboard";
import { scorePlayer, type HoleResult, type ScoringConfig } from "./scoring";

export function roundsToHoleResults(rounds: RoundLine[]): HoleResult[][] {
  return rounds.map((r) => r.holes.map((h) => ({ strokes: h.strokes, par: h.par })));
}

// Backfill hole pars ESPN omitted from player linescores using the course's
// static per-hole par (index 0 = hole 1). Big driver of par coverage.
export function fillHolePars(rounds: RoundLine[], holePars: number[]): RoundLine[] {
  if (!holePars.length) return rounds;
  return rounds.map((r) => ({
    ...r,
    holes: r.holes.map((h) => ({
      ...h,
      par: h.par ?? (holePars[h.hole - 1] ?? null),
    })),
  }));
}

export type ParCoverage = { holesWithStrokes: number; holesScoreable: number };

// How many played holes also carry a par (and are therefore scoreable). A
// big gap means ESPN isn't giving us hole pars and recomputed points can't
// be trusted for this event.
export function parCoverage(rounds: RoundLine[]): ParCoverage {
  let holesWithStrokes = 0;
  let holesScoreable = 0;
  for (const r of rounds) {
    for (const h of r.holes) {
      if (h.strokes !== null) {
        holesWithStrokes++;
        if (h.par !== null) holesScoreable++;
      }
    }
  }
  return { holesWithStrokes, holesScoreable };
}

// Live fantasy points for one golfer. `finishRank` is only passed once the
// event is final — finishing-position bonuses don't apply mid-tournament.
export function playerLivePoints(
  rounds: RoundLine[],
  config: ScoringConfig,
  finishRank: number | null = null,
): number {
  return scorePlayer(roundsToHoleResults(rounds), finishRank, config);
}
