// Pace-based projection + win probability for single-round (Showdown) DFS.
// Once holes are in the books, a golfer's points-per-hole-played extrapolated
// over their remaining holes is a better signal than raw current points:
// 99 pts with 8 holes left (12.4/hole) projects past 100 pts with 5 left.
// We then Monte-Carlo the remaining holes to turn projections into a real
// "chance of winning". Pure + seeded so it's deterministic under test.

import { normalizeName } from "./cut-sweat";
import type { StandingEntry } from "./payouts";

export type GolferState = {
  points: number;
  holesPlayed: number;
  holesRemaining: number;
};

// Mean projected final = current + pace * holes left. With no holes played we
// can't infer a pace, so we hold at current points.
export function projectGolferFinal(s: GolferState): number {
  if (s.holesPlayed < 1) return s.points;
  const pace = s.points / s.holesPlayed;
  return +(s.points + pace * Math.max(0, s.holesRemaining)).toFixed(2);
}

// Small, fast, seedable PRNG so simulations are reproducible.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export type WinProbResult = {
  perEntry: Map<string, number>; // entryId → P(this entry wins), my entries only
  anyMine: number; // P(at least one of my entries wins)
  projectedRank: Map<string, number>; // entryId → projected rank by mean, my entries only
  totalHolesRemaining: number; // across all golfers with state — gauges reliability
};

// Monte-Carlo win probability. Each golfer's remaining points are drawn as
// Normal(pace * holesLeft, sdPerHole * sqrt(holesLeft)); we sum per entry and
// see how often one of the user's entries tops the field. The field is pruned
// to the top `topN` projected entries (plus the user's) since only realistic
// contenders can win — keeps it fast enough for the browser.
export function winProbability(
  field: StandingEntry[],
  states: Map<string, GolferState>,
  opts: { myIds: Set<string>; sims?: number; sdPerHole?: number; seed?: number; topN?: number },
): WinProbResult {
  const sims = opts.sims ?? 2000;
  const sd = opts.sdPerHole ?? 2.0;
  const rng = mulberry32(opts.seed ?? 0x9e3779b9);
  const topN = opts.topN ?? 300;

  const mean = new Map<string, number>();
  const sdFinal = new Map<string, number>();
  let totalHolesRemaining = 0;
  for (const [name, s] of states) {
    mean.set(name, projectGolferFinal(s));
    sdFinal.set(name, sd * Math.sqrt(Math.max(0, s.holesRemaining)));
    totalHolesRemaining += Math.max(0, s.holesRemaining);
  }
  const meanFor = (g: string) => mean.get(normalizeName(g)) ?? 0;

  const withTotal = field.map((e) => ({
    e,
    total: e.golfers.reduce((s, g) => s + meanFor(g), 0),
  }));
  withTotal.sort((a, b) => b.total - a.total);

  const projectedRank = new Map<string, number>();
  let rank = 0;
  let prev: number | null = null;
  withTotal.forEach((row, i) => {
    if (prev === null || row.total < prev) {
      rank = i + 1;
      prev = row.total;
    }
    if (opts.myIds.has(row.e.entryId)) projectedRank.set(row.e.entryId, rank);
  });

  const contenders = withTotal.slice(0, topN).map((r) => r.e);
  const seen = new Set(contenders.map((e) => e.entryId));
  const mineEntries = field.filter((e) => opts.myIds.has(e.entryId));
  for (const e of mineEntries) if (!seen.has(e.entryId)) contenders.push(e);

  const golferSet = new Set<string>();
  for (const e of contenders) for (const g of e.golfers) golferSet.add(normalizeName(g));
  const golfers = [...golferSet];

  const winCounts = new Map<string, number>();
  for (const e of mineEntries) winCounts.set(e.entryId, 0);
  let anyMineWins = 0;
  const sample = new Map<string, number>();

  for (let s = 0; s < sims; s++) {
    for (const g of golfers) {
      const m = mean.get(g) ?? 0;
      const sv = sdFinal.get(g) ?? 0;
      sample.set(g, sv > 0 ? m + gaussian(rng) * sv : m);
    }
    let bestId = "";
    let best = -Infinity;
    for (const e of contenders) {
      let tot = 0;
      for (const g of e.golfers) tot += sample.get(normalizeName(g)) ?? 0;
      if (tot > best) {
        best = tot;
        bestId = e.entryId;
      }
    }
    if (opts.myIds.has(bestId)) {
      winCounts.set(bestId, (winCounts.get(bestId) ?? 0) + 1);
      anyMineWins++;
    }
  }

  const perEntry = new Map<string, number>();
  for (const [id, c] of winCounts) perEntry.set(id, c / sims);
  return { perEntry, anyMine: anyMineWins / sims, projectedRank, totalHolesRemaining };
}
