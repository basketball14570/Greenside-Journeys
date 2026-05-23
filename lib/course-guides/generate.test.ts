import { describe, it, expect } from "vitest";
import {
  approachByTier,
  tierAggregates,
  generateHoleGuides,
  clubForYardage,
  type GenHole,
} from "./generate";

// Colonial CC holes — par + yardage (par-4 yards = elite drive 315 +
// elite approach; par-5s carry the doc's elite third-shot assumption).
// Verifies the generator reproduces the published approach-by-tier tables.
const COLONIAL: GenHole[] = [
  { hole: 1, par: 5, yards: 565, eliteApproach: 100 },
  { hole: 2, par: 4, yards: 400 },
  { hole: 3, par: 4, yards: 476 },
  { hole: 4, par: 3, yards: 246 },
  { hole: 5, par: 4, yards: 470 },
  { hole: 6, par: 4, yards: 393 },
  { hole: 7, par: 4, yards: 427 },
  { hole: 8, par: 3, yards: 192 },
  { hole: 9, par: 4, yards: 402 },
  { hole: 10, par: 4, yards: 404 },
  { hole: 11, par: 5, yards: 609, eliteApproach: 144 },
  { hole: 12, par: 4, yards: 433 },
  { hole: 13, par: 3, yards: 178 },
  { hole: 14, par: 4, yards: 457 },
  { hole: 15, par: 4, yards: 430 },
  { hole: 16, par: 3, yards: 188 },
  { hole: 17, par: 4, yards: 383 },
  { hole: 18, par: 4, yards: 427 },
];

describe("course-guide generator", () => {
  it("derives par-4 approaches as yards minus drive", () => {
    expect(approachByTier(COLONIAL[2])).toEqual({ elite: 161, mid: 174, bottom: 186 });
  });

  it("keeps par-3 approaches equal across tiers", () => {
    expect(approachByTier(COLONIAL[3])).toEqual({ elite: 246, mid: 246, bottom: 246 });
  });

  it("shifts par-5 approaches by the drive gap off the elite third shot", () => {
    expect(approachByTier(COLONIAL[0])).toEqual({ elite: 100, mid: 113, bottom: 125 });
  });

  it("matches the published per-round approach totals and averages", () => {
    const agg = tierAggregates(COLONIAL);
    expect(agg.elite).toEqual({ total: 2370, avg: 131.7 });
    expect(agg.mid).toEqual({ total: 2552, avg: 141.8 });
    expect(agg.bottom).toEqual({ total: 2720, avg: 151.1 });
  });

  it("maps approach yardage to a sensible club", () => {
    expect(clubForYardage(85)).toBe("SW / PW");
    expect(clubForYardage(161)).toBe("7i / 6i");
    expect(clubForYardage(246)).toBe("hybrid / 3w");
  });

  it("flags par 5s and wedge holes as opportunities", () => {
    const guides = generateHoleGuides(COLONIAL);
    const byHole = Object.fromEntries(guides.map((g) => [g.hole, g.flag]));
    expect(byHole[1]).toBe("opportunity"); // par 5
    expect(byHole[6]).toBe("opportunity"); // 78yd elite wedge
    expect(byHole[4]).toBe("penalty"); // 246yd par 3
  });
});
