import { describe, it, expect } from "vitest";
import {
  holePoints,
  scoreRound,
  finishBonus,
  scorePlayer,
  CLASSIC_SCORING,
  SHOWDOWN_SCORING,
  type HoleResult,
} from "./scoring";

// Build an 18-hole round from to-par values (par-4 holes by default).
function round(toPars: number[], par = 4): HoleResult[] {
  return toPars.map((tp) => ({ strokes: par + tp, par }));
}

// Reconstructs real DK Showdown scorecards (THE CJ CUP Byron Nelson R3,
// contest 190706927) from DK's own hole-count breakdown, proving the scoring
// engine matches DK exactly. Any live mismatch is therefore a hole-DATA
// problem (wrong par / missing hole), never the scoring math.
describe("matches DraftKings Showdown FPTS exactly", () => {
  const cases: { name: string; toPars: number[]; expected: number }[] = [
    // 13 PAR, 4 BIR, 1 EAG, bogey-free (+5)
    { name: "Hisatsune", toPars: [-1, 0, -1, 0, -1, 0, -2, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0], expected: 58.5 },
    // 13 PAR, 4 BIR, 1 BOG (no bonus)
    { name: "Mitchell", toPars: [-1, 0, -1, 0, -1, 0, -1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0], expected: 40.7 },
    // 11 PAR, 5 BIR, 1 EAG, 1 BOG, 3-birdie streak (+5)
    { name: "Clark", toPars: [-1, -1, -1, 0, -1, 0, -2, 0, -1, 0, 1, 0, 0, 0, 0, 0, 0, 0], expected: 59.45 },
    // 13 PAR, 2 BIR, 1 EAG, 1 BOG, 1 DBB
    { name: "Smith", toPars: [-2, 0, -1, 0, -1, 0, 1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0], expected: 36.3 },
    // 11 PAR, 5 BIR, 2 BOG (no bonus)
    { name: "Kirk", toPars: [-1, 0, -1, 0, -1, 0, -1, 0, -1, 0, 1, 0, 1, 0, 0, 0, 0, 0], expected: 41.65 },
    // 10 PAR, 5 BIR, 1 EAG, 1 BOG, 1 DBB
    { name: "Fisk", toPars: [-1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -2, 0, 1, 0, 2, 0, 0, 0], expected: 49.05 },
  ];
  for (const c of cases) {
    it(`${c.name} → ${c.expected}`, () => {
      expect(scorePlayer([round(c.toPars)], null, SHOWDOWN_SCORING)).toBe(c.expected);
    });
  }
});

describe("holePoints", () => {
  it("classifies by config", () => {
    expect(holePoints(-3, CLASSIC_SCORING.perHole)).toBe(13);
    expect(holePoints(-2, CLASSIC_SCORING.perHole)).toBe(8);
    expect(holePoints(-1, CLASSIC_SCORING.perHole)).toBe(3);
    expect(holePoints(0, CLASSIC_SCORING.perHole)).toBe(0.5);
    expect(holePoints(1, CLASSIC_SCORING.perHole)).toBe(-0.5);
    expect(holePoints(5, CLASSIC_SCORING.perHole)).toBe(-1);
    expect(holePoints(-1, SHOWDOWN_SCORING.perHole)).toBe(5.75);
    expect(holePoints(0, SHOWDOWN_SCORING.perHole)).toBe(1.5);
  });
});

describe("scoreRound", () => {
  it("all pars → per-hole + bogey-free bonus", () => {
    const r = scoreRound(round(Array(18).fill(0)), CLASSIC_SCORING);
    expect(r.points).toBeCloseTo(18 * 0.5 + 3, 5); // 9 + bogey-free 3
    expect(r.complete).toBe(true);
    expect(r.bogeyFree).toBe(true);
    expect(r.strokes).toBe(72);
  });

  it("awards a 3-birdie streak once", () => {
    const r = scoreRound(round([-1, -1, -1, ...Array(15).fill(0)]), CLASSIC_SCORING);
    // 3*3 + 15*0.5 = 16.5, streak +3, bogey-free +3
    expect(r.birdieStreak).toBe(true);
    expect(r.points).toBeCloseTo(16.5 + 3 + 3, 5);
  });

  it("breaks the streak across an unplayed hole", () => {
    const holes: HoleResult[] = [
      { strokes: 3, par: 4 },
      { strokes: 3, par: 4 },
      { strokes: null, par: 4 },
      { strokes: 3, par: 4 },
    ];
    expect(scoreRound(holes, CLASSIC_SCORING).birdieStreak).toBe(false);
  });

  it("counts a hole-in-one bonus", () => {
    const r = scoreRound([{ strokes: 1, par: 3 }], SHOWDOWN_SCORING);
    // eagle (-2) 11 + ace bonus 5; single hole → not complete, no bogey-free
    expect(r.aces).toBe(1);
    expect(r.points).toBeCloseTo(11 + 5, 5);
    expect(r.complete).toBe(false);
  });

  it("no bogey-free bonus when a bogey appears", () => {
    const r = scoreRound(round([1, ...Array(17).fill(0)]), CLASSIC_SCORING);
    expect(r.bogeyFree).toBe(false);
  });
});

describe("finishBonus", () => {
  it("classic ladder, full points (no tie averaging)", () => {
    expect(finishBonus(1, CLASSIC_SCORING)).toBe(30);
    expect(finishBonus(3, CLASSIC_SCORING)).toBe(18);
    expect(finishBonus(12, CLASSIC_SCORING)).toBe(6);
    expect(finishBonus(100, CLASSIC_SCORING)).toBe(0);
  });
  it("showdown has no finish bonus", () => {
    expect(finishBonus(1, SHOWDOWN_SCORING)).toBe(0);
  });
});

describe("scorePlayer", () => {
  it("sums rounds + finishing-position bonus", () => {
    const pts = scorePlayer([round(Array(18).fill(0)), round(Array(18).fill(0))], 5, CLASSIC_SCORING);
    expect(pts).toBeCloseTo(2 * 12 + 14, 2); // two 12-pt rounds + 5th place 14
  });

  it("adds the all-rounds-under-70 bonus when every round qualifies", () => {
    const r68 = round([-1, -1, -1, -1, ...Array(14).fill(0)]); // strokes 68
    const pts = scorePlayer([r68], null, CLASSIC_SCORING);
    // round: 4*3 + 14*0.5 = 19, streak +3, bogey-free +3 = 25; under-70 +5
    expect(pts).toBeCloseTo(25 + 5, 2);
  });
});
