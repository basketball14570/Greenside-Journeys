import { describe, it, expect } from "vitest";
import { projectOwnership } from "./project-ownership";

// 20 identical players so the field budget (roster_size * 100) spreads out
// without everyone hitting the MAX_OWN cap — lets the market signal move ranks.
const NAMES = [
  "alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel",
  "india", "juliet", "kilo", "lima", "mike", "november", "oscar", "papa",
  "quebec", "romeo", "sierra", "tango",
];
const rows = NAMES.map((name) => ({ name, salary: 8000, ppg: 60 }));

describe("projectOwnership", () => {
  it("returns equal ownership for identical players with no market signal", () => {
    const out = projectOwnership(rows);
    expect(out).toHaveLength(20);
    expect(out[0].projOwn).toBeCloseTo(out[19].projOwn, 5);
    expect(out[0].marketProb).toBeNull();
  });

  it("lifts the player with a stronger form signal when market is supplied", () => {
    const market = new Map(NAMES.map((n, i) => [n, i === 0 ? 0.6 : 0.05]));
    const out = projectOwnership(rows, market);
    const a = out.find((p) => p.name === "alpha")!;
    const b = out.find((p) => p.name === "bravo")!;
    expect(a.projOwn).toBeGreaterThan(b.projOwn);
    expect(a.marketProb).toBe(0.6);
  });

  it("ignores the market signal when fewer than two players have one", () => {
    const market = new Map([["alpha", 0.9]]);
    const out = projectOwnership(rows, market);
    expect(out[0].projOwn).toBeCloseTo(out[19].projOwn, 5);
  });
});
