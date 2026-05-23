import { describe, it, expect } from "vitest";
import { roundsToHoleResults, parCoverage, playerLivePoints, fillHolePars } from "./live-points";
import { CLASSIC_SCORING } from "./scoring";
import type { RoundLine } from "@/lib/espn-leaderboard";

function mkRound(period: number, holes: { strokes: number | null; par: number | null }[]): RoundLine {
  return {
    period,
    strokes: holes.reduce((s, h) => s + (h.strokes ?? 0), 0) || null,
    toPar: null,
    thru: holes.filter((h) => h.strokes !== null).length || null,
    complete: holes.length === 18 && holes.every((h) => h.strokes !== null),
    holes: holes.map((h, i) => ({ hole: i + 1, strokes: h.strokes, par: h.par })),
  };
}

describe("roundsToHoleResults", () => {
  it("flattens RoundLine holes into per-round hole results", () => {
    const r = mkRound(1, [{ strokes: 3, par: 4 }, { strokes: 4, par: 4 }]);
    expect(roundsToHoleResults([r])).toEqual([[{ strokes: 3, par: 4 }, { strokes: 4, par: 4 }]]);
  });
});

describe("fillHolePars", () => {
  it("backfills missing hole pars from the course map, lifting coverage", () => {
    const r = mkRound(1, [
      { strokes: 3, par: null }, // hole 1, par missing
      { strokes: 4, par: null }, // hole 2, par missing
    ]);
    expect(parCoverage([r]).holesScoreable).toBe(0);
    const filled = fillHolePars([r], [4, 4]); // course pars for holes 1,2
    expect(parCoverage(filled).holesScoreable).toBe(2);
    expect(filled[0].holes[0].par).toBe(4);
  });

  it("does not overwrite a par ESPN already supplied", () => {
    const r = mkRound(1, [{ strokes: 3, par: 5 }]);
    const filled = fillHolePars([r], [4]);
    expect(filled[0].holes[0].par).toBe(5);
  });

  it("is a no-op with no course pars", () => {
    const r = mkRound(1, [{ strokes: 3, par: null }]);
    expect(fillHolePars([r], [])).toEqual([r]);
  });
});

describe("parCoverage", () => {
  it("flags holes with strokes but no par as unscoreable", () => {
    const r = mkRound(1, [
      { strokes: 3, par: 4 },
      { strokes: 4, par: null }, // played but no par → not scoreable
      { strokes: null, par: 4 }, // not played
    ]);
    expect(parCoverage([r])).toEqual({ holesWithStrokes: 2, holesScoreable: 1 });
  });
});

describe("playerLivePoints", () => {
  it("scores a completed round via the engine, no finish bonus mid-event", () => {
    const r = mkRound(1, Array(18).fill({ strokes: 4, par: 4 })); // all pars
    // 18*0.5 + bogey-free 3 = 12
    expect(playerLivePoints([r], CLASSIC_SCORING)).toBeCloseTo(12, 5);
  });

  it("adds finishing bonus only when a rank is supplied (event final)", () => {
    const r = mkRound(1, Array(18).fill({ strokes: 4, par: 4 }));
    expect(playerLivePoints([r], CLASSIC_SCORING, 1)).toBeCloseTo(12 + 30, 5);
  });
});
