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

// Derive each hole's par from the field: the par of a hole is the same for
// everyone, and across a full field the most common score on a hole is its
// par. Lets us score live points from ESPN's per-hole strokes even when the
// feed carries no par at all. `rounds` is every player's round(s) flattened.
export function deriveHolePars(rounds: RoundLine[]): number[] {
  const counts = new Map<number, Map<number, number>>(); // hole → strokes → count
  for (const r of rounds) {
    for (const h of r.holes) {
      if (h.strokes && h.strokes > 0 && h.hole >= 1 && h.hole <= 18) {
        const m = counts.get(h.hole) ?? new Map<number, number>();
        m.set(h.strokes, (m.get(h.strokes) ?? 0) + 1);
        counts.set(h.hole, m);
      }
    }
  }
  const pars: number[] = [];
  for (const [hole, m] of counts) {
    let bestStroke = 0;
    let bestCount = -1;
    for (const [stroke, c] of m) {
      if (c > bestCount) {
        bestCount = c;
        bestStroke = stroke;
      }
    }
    pars[hole - 1] = bestStroke;
  }
  return pars;
}

// Combine two per-hole par arrays, preferring the first (real) and falling
// back to the second (derived) hole-by-hole.
export function mergeHolePars(primary: number[], fallback: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < 18; i++) {
    const p = primary[i];
    out[i] = p && p > 0 ? p : (fallback[i] ?? 0);
  }
  return out;
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
