import { describe, it, expect } from "vitest";
import {
  roundsToHoleResults,
  parCoverage,
  playerLivePoints,
  fillHolePars,
  deriveHolePars,
  mergeHolePars,
} from "./live-points";
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

describe("deriveHolePars", () => {
  it("takes the modal score per hole across the field as par", () => {
    // Hole 1: most players make 4 (one birdie 3). Hole 2: most make 3.
    const field = [
      mkRound(1, [{ strokes: 4, par: null }, { strokes: 3, par: null }]),
      mkRound(1, [{ strokes: 4, par: null }, { strokes: 3, par: null }]),
      mkRound(1, [{ strokes: 3, par: null }, { strokes: 4, par: null }]),
    ];
    const pars = deriveHolePars(field);
    expect(pars[0]).toBe(4); // hole 1 par
    expect(pars[1]).toBe(3); // hole 2 par
  });

  it("makes live scoring possible when ESPN omits par entirely", () => {
    const field = Array.from({ length: 5 }, () =>
      mkRound(1, [{ strokes: 4, par: null }]),
    );
    const derived = deriveHolePars(field);
    const player = mkRound(1, [{ strokes: 3, par: null }]); // birdie on a par 4
    const filled = fillHolePars([player], derived);
    expect(filled[0].holes[0].par).toBe(4);
    expect(parCoverage(filled).holesScoreable).toBe(1);
  });
});

describe("mergeHolePars", () => {
  it("prefers real pars, falls back to derived per hole", () => {
    const merged = mergeHolePars([4, 0, 5], [4, 3, 4]);
    expect(merged[0]).toBe(4); // real
    expect(merged[1]).toBe(3); // fell back to derived (real was 0)
    expect(merged[2]).toBe(5); // real
  });

  it("lets real course pars override the field-derived par-5 undercount", () => {
    // Most of the field birdies a par-5 (modal score 4), so deriving par from
    // the field labels the hole a par-4 — turning real birdies into "pars" and
    // undercounting Showdown points. The real scorecard par (5) must win.
    const field = [
      mkRound(1, [{ strokes: 4, par: null }]),
      mkRound(1, [{ strokes: 4, par: null }]),
      mkRound(1, [{ strokes: 5, par: null }]),
    ];
    const derived = deriveHolePars(field);
    expect(derived[0]).toBe(4); // wrong: it's really a par 5

    const coursePars = [5]; // from the published scorecard
    const merged = mergeHolePars(mergeHolePars([], coursePars), derived);
    expect(merged[0]).toBe(5); // course par wins over the bad derived value
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
