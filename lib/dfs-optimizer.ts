// Monte Carlo DFS lineup optimizer.
//
// What it does, in order:
// 1. Build a candidate pool of N random lineups under the salary cap by
//    weighted-random sampling (heavier players sampled more often, so we
//    don't waste cycles generating obviously bad lineups).
// 2. For each candidate, run S simulations. Each player's score is drawn
//    from a normal distribution centered at projection with σ derived
//    from ceiling/floor. We add a shared wave-wind factor so AM players'
//    outcomes correlate with each other and PM players' with each other
//    — that's the "correlation" piece. Same-tee-time wind isn't iid.
// 3. Score each lineup by a weighted combination of:
//      - expected (mean) sim points
//      - ceiling (90th percentile sim points) — what wins GPPs
//      - leverage penalty (sum of projected ownership * λ)
//    Weights are tunable from the UI.
// 4. Return the top K by score, plus the population mean/ceiling so the
//    UI can show how the picks stand out.
//
// This is intentionally not an ILP. ILP gives you the *one* optimal
// lineup on projection — which everyone in the field has. The whole
// point of GPP lineup building is finding correlated, leverage-tilted
// picks that aren't on chalk projections. Monte Carlo + ranked output
// matches that workflow.

import type { DfsPlayer } from "@/lib/demo-dfs";
import { PLAYERS } from "@/lib/demo-players";

// Course archetypes we model. These match the strings used in the
// PlayerProfile.fit array so a lookup is a string compare.
export const COURSE_ARCHETYPES = [
  "Parkland · long",
  "Parkland · short",
  "Coastal · wind",
  "Links",
  "Desert",
] as const;
export type CourseArchetype = (typeof COURSE_ARCHETYPES)[number];

// Returns a multiplier on a player's baseline projection based on how
// well they perform on the given archetype vs their overall mean. 1.0 =
// neutral. Returns 1.0 if we have no fit data for the player or no
// rounds in that archetype.
export function fitMultiplier(playerId: string, archetype: CourseArchetype | null): number {
  if (!archetype) return 1.0;
  const profile = PLAYERS[playerId];
  if (!profile) return 1.0;
  const target = profile.fit.find((f) => f.archetype === archetype);
  if (!target || target.rounds === 0) return 1.0;
  const weightedMean =
    profile.fit.reduce((acc, f) => acc + f.sgPerRound * f.rounds, 0) /
    Math.max(1, profile.fit.reduce((acc, f) => acc + f.rounds, 0));
  // Convert to multiplicative factor — cap the swing at ±20% so a single
  // good (or bad) archetype doesn't dominate.
  const ratio = weightedMean === 0 ? 1 : target.sgPerRound / weightedMean;
  return Math.max(0.8, Math.min(1.2, ratio));
}

export type Lineup = {
  picks: DfsPlayer[];
  salary: number;
  projection: number;          // sum of mean projections
  meanSim: number;             // average simulated score
  ceiling: number;             // 90th percentile simulated score
  floor: number;               // 10th percentile simulated score
  avgOwnership: number;
  leverage: number;            // negative = less owned than field median
  score: number;               // composite scoring function
};

export type OptimizerWeights = {
  expected: number;            // weight on meanSim
  ceiling: number;             // weight on 90th percentile
  leverage: number;            // weight on (median_own − avgOwn). Positive favors leverage.
};

export const DEFAULT_WEIGHTS: OptimizerWeights = {
  expected: 0.5,
  ceiling: 0.4,
  leverage: 0.1,
};

export type OptimizerOptions = {
  lineupSize?: number;         // default 6
  cap?: number;                // default 50000
  candidates?: number;         // how many candidate lineups to evaluate (default 1500)
  simulations?: number;        // sims per lineup (default 200)
  topK?: number;               // top N to return (default 20)
  weights?: OptimizerWeights;
  // Wave wind volatility — std of the shared factor each sim. Larger =
  // wave-correlated outcomes swing harder together.
  waveSigma?: number;
  // When set, each player's projection is multiplied by their fit factor
  // for this archetype before scoring + sampling weights are computed.
  archetype?: CourseArchetype | null;
};

export function optimizeLineups(
  players: DfsPlayer[],
  opts: OptimizerOptions = {},
): { lineups: Lineup[]; population: { meanSim: number; meanCeiling: number } } {
  const lineupSize = opts.lineupSize ?? 6;
  const cap = opts.cap ?? 50_000;
  const candidates = opts.candidates ?? 1500;
  const simulations = opts.simulations ?? 200;
  const topK = opts.topK ?? 20;
  const weights = opts.weights ?? DEFAULT_WEIGHTS;
  const waveSigma = opts.waveSigma ?? 0.06;
  const archetype = opts.archetype ?? null;

  // Apply course-fit multiplier to projections up-front so it cascades
  // into both the sampling weights and the simulation means.
  const adjusted: DfsPlayer[] = archetype
    ? players.map((p) => ({
        ...p,
        projection: p.projection * fitMultiplier(p.id, archetype),
        ceiling: p.ceiling * fitMultiplier(p.id, archetype),
        floor: p.floor * fitMultiplier(p.id, archetype),
      }))
    : players;
  players = adjusted;

  const medianOwnership = median(players.map((p) => p.ownership));

  // Build a candidate pool. Dedupe by sorted-id signature so we don't
  // simulate the same lineup twice.
  const seen = new Set<string>();
  const pool: { picks: DfsPlayer[]; salary: number }[] = [];
  let attempts = 0;
  while (pool.length < candidates && attempts < candidates * 8) {
    attempts++;
    const lineup = sampleLineup(players, lineupSize, cap);
    if (!lineup) continue;
    const sig = lineup.picks
      .map((p) => p.id)
      .sort()
      .join("|");
    if (seen.has(sig)) continue;
    seen.add(sig);
    pool.push(lineup);
  }

  // Simulate each lineup.
  const evaluated: Lineup[] = pool.map(({ picks, salary }) => {
    const sim = simulateLineup(picks, simulations, waveSigma);
    return {
      picks,
      salary,
      projection: sum(picks.map((p) => p.projection)),
      meanSim: sim.meanSim,
      ceiling: sim.ceiling,
      floor: sim.floor,
      avgOwnership: sim.avgOwnership,
      leverage: medianOwnership - sim.avgOwnership,
      score: 0, // filled below
    };
  });

  // Normalize each component to z-scores so the weights are scale-free.
  const meanZs = zscores(evaluated.map((e) => e.meanSim));
  const ceilZs = zscores(evaluated.map((e) => e.ceiling));
  const levZs = zscores(evaluated.map((e) => e.leverage));
  evaluated.forEach((e, i) => {
    e.score =
      weights.expected * meanZs[i] +
      weights.ceiling * ceilZs[i] +
      weights.leverage * levZs[i];
  });

  evaluated.sort((a, b) => b.score - a.score);

  const population = {
    meanSim: avg(evaluated.map((e) => e.meanSim)),
    meanCeiling: avg(evaluated.map((e) => e.ceiling)),
  };

  return { lineups: evaluated.slice(0, topK), population };
}

// ─── Simulation ──────────────────────────────────────────

// Monte Carlo one lineup: shared AM/PM wind draws per sim (wave-internal
// correlation) plus each player's idiosyncratic spread from ceiling/floor.
function simulateLineup(
  picks: DfsPlayer[],
  simulations: number,
  waveSigma: number,
): { meanSim: number; ceiling: number; floor: number; avgOwnership: number } {
  const sims: number[] = new Array(simulations);
  for (let i = 0; i < simulations; i++) {
    const amWind = randn() * waveSigma;
    const pmWind = randn() * waveSigma;
    let total = 0;
    for (const p of picks) {
      const sigma = Math.max(2, (p.ceiling - p.floor) / 2.5);
      const idio = randn() * sigma;
      const wave = p.wave === "AM" ? amWind : pmWind;
      // windAdj is signed strokes; ≈3.5 DK pts/stroke, modulated by the draw.
      const waveImpact = p.windAdj * 3.5 * (1 + wave);
      total += Math.max(0, p.projection + idio + waveImpact);
    }
    sims[i] = total;
  }
  sims.sort((a, b) => a - b);
  return {
    meanSim: avg(sims),
    ceiling: percentile(sims, 0.9),
    floor: percentile(sims, 0.1),
    avgOwnership: avg(picks.map((p) => p.ownership)),
  };
}

export type LineupEval = {
  salary: number;
  projection: number;
  meanSim: number;
  ceiling: number;
  floor: number;
  avgOwnership: number;
};

// Evaluate a user-built lineup with the same engine the optimizer uses, so
// "build your own" mean/ceiling/ownership are consistent with the generated
// lineups. Applies course-fit adjustment when an archetype is given.
export function evaluateLineup(
  picks: DfsPlayer[],
  opts: { simulations?: number; waveSigma?: number; archetype?: CourseArchetype | null } = {},
): LineupEval {
  const simulations = opts.simulations ?? 400;
  const waveSigma = opts.waveSigma ?? 0.06;
  const archetype = opts.archetype ?? null;
  const eff = archetype
    ? picks.map((p) => ({
        ...p,
        projection: p.projection * fitMultiplier(p.id, archetype),
        ceiling: p.ceiling * fitMultiplier(p.id, archetype),
        floor: p.floor * fitMultiplier(p.id, archetype),
      }))
    : picks;
  const sim = simulateLineup(eff, simulations, waveSigma);
  return {
    salary: sum(picks.map((p) => p.salary)),
    projection: sum(eff.map((p) => p.projection)),
    ...sim,
  };
}

// ─── Sampling ────────────────────────────────────────────

function sampleLineup(
  players: DfsPlayer[],
  size: number,
  cap: number,
): { picks: DfsPlayer[]; salary: number } | null {
  // Weighted-random: probability proportional to projection^2 so we lean
  // toward high-projection picks but still explore. Without replacement.
  const remaining = [...players];
  const picks: DfsPlayer[] = [];
  let salary = 0;
  for (let slot = 0; slot < size; slot++) {
    const slotsLeft = size - slot - 1;

    // Cheapest-completion lower bound, precomputed once per slot (not per
    // candidate): the cheapest `slotsLeft` players left. We need a per-
    // candidate version only because the candidate can't also fill a later
    // slot — so track the cheapest set's ids and the next-cheapest salary to
    // swap the candidate out in O(1). Without this the filter was O(n² log n)
    // per slot, which times out a phone on a full ~150-player field.
    let cheapestSum = 0;
    const cheapestIds = new Set<string>();
    let nextCheapestSalary = Infinity;
    if (slotsLeft > 0) {
      const asc = [...remaining].sort((a, b) => a.salary - b.salary);
      for (let i = 0; i < slotsLeft && i < asc.length; i++) {
        cheapestSum += asc[i].salary;
        cheapestIds.add(asc[i].id);
      }
      nextCheapestSalary = asc.length > slotsLeft ? asc[slotsLeft].salary : Infinity;
    }
    const minComplete = (p: DfsPlayer): number => {
      if (slotsLeft <= 0) return 0;
      if (remaining.length - 1 < slotsLeft) return Infinity; // can't finish
      // If p is one of the cheapest, swap it for the next cheapest player.
      return cheapestIds.has(p.id)
        ? cheapestSum - p.salary + nextCheapestSalary
        : cheapestSum;
    };

    const eligible = remaining.filter(
      (p) => p.salary <= cap - salary - minComplete(p),
    );
    if (eligible.length === 0) return null;
    const weights = eligible.map((p) => Math.pow(p.projection, 2));
    const pick = weightedPick(eligible, weights);
    picks.push(pick);
    salary += pick.salary;
    const idx = remaining.indexOf(pick);
    remaining.splice(idx, 1);
  }
  return { picks, salary };
}

function weightedPick<T>(items: T[], weights: number[]): T {
  const total = sum(weights);
  let roll = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

// ─── Stats helpers ────────────────────────────────────────

// Box-Muller standard normal.
function randn(): number {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function sum(xs: number[]): number {
  let s = 0;
  for (const x of xs) s += x;
  return s;
}

function avg(xs: number[]): number {
  return xs.length === 0 ? 0 : sum(xs) / xs.length;
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(sortedXs: number[], q: number): number {
  if (sortedXs.length === 0) return 0;
  const idx = Math.min(sortedXs.length - 1, Math.floor(q * sortedXs.length));
  return sortedXs[idx];
}

function zscores(xs: number[]): number[] {
  const m = avg(xs);
  const variance = avg(xs.map((x) => (x - m) ** 2));
  const sd = Math.sqrt(variance) || 1;
  return xs.map((x) => (x - m) / sd);
}
