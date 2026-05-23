import { describe, it, expect } from "vitest";
import { COURSE_HOLE_PARS, holeParStrict, resolveCourseName } from "./course-pars";

describe("course hole pars", () => {
  it("every mapped course has 18 holes summing to a sane par (70-72)", () => {
    for (const [course, pars] of Object.entries(COURSE_HOLE_PARS)) {
      expect(pars, course).toHaveLength(18);
      const total = pars.reduce((a, b) => a + b, 0);
      expect(total, `${course} total par`).toBeGreaterThanOrEqual(70);
      expect(total, `${course} total par`).toBeLessThanOrEqual(72);
    }
  });

  // From the PGA Tour R3 scorecard, THE CJ CUP Byron Nelson 2026 (par 71).
  it("TPC Craig Ranch matches the published scorecard", () => {
    expect(COURSE_HOLE_PARS["TPC Craig Ranch"]).toEqual([
      4, 4, 4, 3, 5, 4, 3, 4, 5, 4, 4, 5, 4, 4, 3, 4, 3, 4,
    ]);
    expect(COURSE_HOLE_PARS["TPC Craig Ranch"].reduce((a, b) => a + b, 0)).toBe(71);
  });

  it("resolves TPC Craig Ranch from the Byron Nelson event name when course is blank", () => {
    expect(resolveCourseName(null, "THE CJ CUP Byron Nelson")).toBe("TPC Craig Ranch");
    expect(holeParStrict(resolveCourseName(null, "THE CJ CUP Byron Nelson"), 9)).toBe(5);
  });
});
