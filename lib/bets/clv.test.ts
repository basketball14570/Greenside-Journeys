import { describe, it, expect } from "vitest";
import {
  americanToDecimal,
  americanToProb,
  clvPercent,
  beatClose,
  clvSupportedMarket,
  clvSummary,
} from "./clv";

describe("clv math", () => {
  it("converts american to decimal", () => {
    expect(americanToDecimal(100)).toBeCloseTo(2.0);
    expect(americanToDecimal(-110)).toBeCloseTo(1.909, 2);
    expect(americanToDecimal(500)).toBeCloseTo(6.0);
  });

  it("converts american to implied probability", () => {
    expect(americanToProb(100)).toBeCloseTo(0.5);
    expect(americanToProb(-200)).toBeCloseTo(0.667, 2);
  });

  it("flags beating the close when entry odds are longer", () => {
    expect(beatClose(500, 300)).toBe(true); // bet +500, closed +300
    expect(beatClose(300, 500)).toBe(false);
    expect(beatClose(-110, -110)).toBe(false);
  });

  it("computes positive CLV when you got a longer price", () => {
    // +500 (dec 6.0) vs close +300 (dec 4.0) → 6/4 - 1 = +50%
    expect(clvPercent(500, 300)).toBeCloseTo(0.5, 5);
    // negative when you got worse than close
    expect(clvPercent(300, 500)).toBeCloseTo(-1 / 3, 5);
  });

  it("only supports win/outright markets", () => {
    expect(clvSupportedMarket("To Win")).toBe("outright");
    expect(clvSupportedMarket("Outright Winner")).toBe("outright");
    expect(clvSupportedMarket("Top 10")).toBe(null);
    expect(clvSupportedMarket("Birdies O 3.5")).toBe(null);
  });

  it("aggregates beat-rate and average CLV over captured closes", () => {
    const s = clvSummary([
      { american_odds: 500, closing_odds: 300 }, // beat, +50%
      { american_odds: 300, closing_odds: 500 }, // miss, -33.3%
      { american_odds: 200, closing_odds: null }, // ignored (no close)
    ]);
    expect(s.graded).toBe(2);
    expect(s.beat).toBe(1);
    expect(s.beatRate).toBeCloseTo(0.5);
    expect(s.avgClvPct).toBeCloseTo((0.5 - 1 / 3) / 2, 5);
  });
});
