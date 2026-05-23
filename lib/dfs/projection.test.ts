import { describe, it, expect } from "vitest";
import { projectGolferFinal, mulberry32, winProbability, type GolferState } from "./projection";
import { normalizeName } from "./cut-sweat";
import type { StandingEntry } from "./payouts";

describe("projectGolferFinal", () => {
  it("extrapolates current points by pace over holes left", () => {
    // 100 pts thru 13 (5 left) → pace 7.69 → ~138.5
    expect(projectGolferFinal({ points: 100, holesPlayed: 13, holesRemaining: 5 })).toBeCloseTo(138.46, 1);
  });

  it("the user's scenario: fewer points + more holes can project higher", () => {
    const a = projectGolferFinal({ points: 100, holesPlayed: 13, holesRemaining: 5 });
    const b = projectGolferFinal({ points: 99, holesPlayed: 10, holesRemaining: 8 });
    expect(b).toBeGreaterThan(a); // 99 with 8 to play out-projects 100 with 5
  });

  it("holds at current points when no holes are played", () => {
    expect(projectGolferFinal({ points: 0, holesPlayed: 0, holesRemaining: 18 })).toBe(0);
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
