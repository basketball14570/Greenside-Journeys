import { describe, it, expect } from "vitest";
import {
  projectGolferFinal,
  fieldAveragePace,
  mulberry32,
  winProbability,
  type GolferState,
} from "./projection";
import { normalizeName } from "./cut-sweat";
import type { StandingEntry } from "./payouts";

describe("projectGolferFinal", () => {
  it("adds shrunk pace over the holes left", () => {
    // 100 pts thru 13 (5 left), default prior 2.0/6: effPace=(100+12)/19=5.89
    // → 100 + 5.89*5 = 129.5
    expect(projectGolferFinal({ points: 100, holesPlayed: 13, holesRemaining: 5 })).toBeCloseTo(129.47, 1);
  });

  it("shrinks a small-sample hot start toward the baseline", () => {
    // Thru 3 holes, 30 pts (raw pace 10/hole) — must NOT extrapolate ~180.
    const hot = projectGolferFinal({ points: 30, holesPlayed: 3, holesRemaining: 15 }, { priorPace: 2 });
    const naive = 30 + (30 / 3) * 15; // 180
    expect(hot).toBeLessThan(120); // heavily regressed
    expect(hot).toBeLessThan(naive - 60);
  });

  it("trusts pace more once many holes are in the books", () => {
    // Thru 15 (3 left): the estimate is close to the real pace.
    const p = projectGolferFinal({ points: 45, holesPlayed: 15, holesRemaining: 3 }, { priorPace: 2 });
    expect(p).toBeGreaterThan(45); // still adds for remaining holes
    expect(p).toBeLessThan(45 + (45 / 15) * 3 + 1); // not above naive
  });

  it("returns current points when the round is done", () => {
    expect(projectGolferFinal({ points: 60, holesPlayed: 18, holesRemaining: 0 })).toBe(60);
  });
});

describe("fieldAveragePace", () => {
  it("is total points over total holes played", () => {
    const states: GolferState[] = [
      { points: 40, holesPlayed: 10, holesRemaining: 8 },
      { points: 20, holesPlayed: 10, holesRemaining: 8 },
    ];
    expect(fieldAveragePace(states)).toBeCloseTo(3, 5); // 60 / 20
  });
});

describe("mulberry32", () => {
  it("is deterministic for a seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

function entry(id: string, golfers: string[]): StandingEntry {
  return { rank: 0, entryId: id, entryName: id, points: 0, golfers };
}

describe("winProbability", () => {
  const field: StandingEntry[] = [
    entry("mine", ["Alpha", "Beta"]),
    entry("rival", ["Gamma", "Delta"]),
  ];
  const states = new Map<string, GolferState>([
    [normalizeName("Alpha"), { points: 60, holesPlayed: 12, holesRemaining: 6 }],
    [normalizeName("Beta"), { points: 60, holesPlayed: 12, holesRemaining: 6 }],
    [normalizeName("Gamma"), { points: 10, holesPlayed: 12, holesRemaining: 6 }],
    [normalizeName("Delta"), { points: 10, holesPlayed: 12, holesRemaining: 6 }],
  ]);

  it("with no variance, the highest projection always wins", () => {
    const r = winProbability(field, states, { myIds: new Set(["mine"]), sims: 100, sdPerHole: 0 });
    expect(r.perEntry.get("mine")).toBe(1);
    expect(r.anyMine).toBe(1);
    expect(r.projectedRank.get("mine")).toBe(1);
  });

  it("with variance, win prob is between 0 and 1 and reproducible by seed", () => {
    const close = new Map<string, GolferState>([
      [normalizeName("Alpha"), { points: 40, holesPlayed: 12, holesRemaining: 6 }],
      [normalizeName("Beta"), { points: 40, holesPlayed: 12, holesRemaining: 6 }],
      [normalizeName("Gamma"), { points: 39, holesPlayed: 12, holesRemaining: 6 }],
      [normalizeName("Delta"), { points: 39, holesPlayed: 12, holesRemaining: 6 }],
    ]);
    const a = winProbability(field, close, { myIds: new Set(["mine"]), sims: 500, sdPerHole: 3, seed: 7 });
    const b = winProbability(field, close, { myIds: new Set(["mine"]), sims: 500, sdPerHole: 3, seed: 7 });
    expect(a.perEntry.get("mine")).toBe(b.perEntry.get("mine"));
    const p = a.perEntry.get("mine")!;
    expect(p).toBeGreaterThan(0.5); // slight edge
    expect(p).toBeLessThan(1);
  });

  it("reports total holes remaining for reliability gauging", () => {
    const r = winProbability(field, states, { myIds: new Set(["mine"]), sims: 10, sdPerHole: 0 });
    expect(r.totalHolesRemaining).toBe(24); // 4 golfers × 6
  });
});
