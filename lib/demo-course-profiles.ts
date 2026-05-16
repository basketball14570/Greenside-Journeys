// Detailed per-course profile data. Companion to lib/demo-courses.ts
// (which holds live snapshots). These records are mostly static metadata
// fed by DataGolf's course-history + ShotLink aggregates once wired.

import { COURSES } from "@/lib/demo-courses";

export type HoleStat = {
  hole: number;
  par: number;
  yards: number;
  scoringAvg: number;        // vs par; negative = under
  // % of field hitting fairway / green (front-9 / back-9 averages will do)
  fairwayHitPct: number;
  girPct: number;
  // Prevailing wind direction relative to play (HEAD / TAIL / CROSS-L / CROSS-R)
  windExposure: "HEAD" | "TAIL" | "CROSS-L" | "CROSS-R" | "MIXED";
};

export type SeasonAvg = {
  year: number;
  fieldAvgScore: number;
  cutLine: number;
  windAvgMph: number;
};

export type CourseProfile = {
  slug: string;
  archetype: string;
  yards: number;
  par: number;
  designer: string;
  established: number;
  // narrative / strategic note
  blurb: string;
  // 18 hole stats; we keep ALL holes for fidelity
  holes: HoleStat[];
  // last 5 years of field scoring averages
  history: SeasonAvg[];
  // wave-level historical scoring split (am vs pm, last 3 years averaged)
  waveSplit: { amAvg: number; pmAvg: number; sampleRounds: number };
};

// Quail Hollow — front 9 mostly cross/head exposure, back has the Green Mile
function quailHollow(): HoleStat[] {
  const front = [
    { hole: 1,  par: 4, yards: 505, scoringAvg: +0.12, fairwayHitPct: 58, girPct: 61, windExposure: "CROSS-R" as const },
    { hole: 2,  par: 4, yards: 462, scoringAvg: +0.04, fairwayHitPct: 66, girPct: 68, windExposure: "TAIL" as const },
    { hole: 3,  par: 4, yards: 483, scoringAvg: +0.08, fairwayHitPct: 64, girPct: 66, windExposure: "CROSS-L" as const },
    { hole: 4,  par: 3, yards: 184, scoringAvg: -0.01, fairwayHitPct: 0,  girPct: 78, windExposure: "HEAD" as const },
    { hole: 5,  par: 4, yards: 449, scoringAvg: +0.02, fairwayHitPct: 71, girPct: 72, windExposure: "MIXED" as const },
    { hole: 6,  par: 3, yards: 249, scoringAvg: +0.18, fairwayHitPct: 0,  girPct: 56, windExposure: "HEAD" as const },
    { hole: 7,  par: 5, yards: 546, scoringAvg: -0.34, fairwayHitPct: 62, girPct: 71, windExposure: "TAIL" as const },
    { hole: 8,  par: 4, yards: 348, scoringAvg: -0.12, fairwayHitPct: 78, girPct: 74, windExposure: "CROSS-R" as const },
    { hole: 9,  par: 4, yards: 458, scoringAvg: +0.06, fairwayHitPct: 68, girPct: 68, windExposure: "MIXED" as const },
  ];
  const back = [
    { hole: 10, par: 5, yards: 600, scoringAvg: -0.21, fairwayHitPct: 60, girPct: 64, windExposure: "TAIL" as const },
    { hole: 11, par: 4, yards: 460, scoringAvg: +0.07, fairwayHitPct: 65, girPct: 67, windExposure: "CROSS-L" as const },
    { hole: 12, par: 4, yards: 460, scoringAvg: +0.04, fairwayHitPct: 66, girPct: 70, windExposure: "MIXED" as const },
    { hole: 13, par: 3, yards: 207, scoringAvg: -0.05, fairwayHitPct: 0,  girPct: 73, windExposure: "CROSS-R" as const },
    { hole: 14, par: 4, yards: 344, scoringAvg: -0.18, fairwayHitPct: 76, girPct: 78, windExposure: "TAIL" as const },
    { hole: 15, par: 5, yards: 583, scoringAvg: -0.28, fairwayHitPct: 64, girPct: 66, windExposure: "CROSS-R" as const },
    { hole: 16, par: 4, yards: 506, scoringAvg: +0.22, fairwayHitPct: 54, girPct: 58, windExposure: "HEAD" as const },
    { hole: 17, par: 3, yards: 223, scoringAvg: +0.16, fairwayHitPct: 0,  girPct: 62, windExposure: "CROSS-L" as const },
    { hole: 18, par: 4, yards: 494, scoringAvg: +0.31, fairwayHitPct: 56, girPct: 60, windExposure: "HEAD" as const },
  ];
  return [...front, ...back];
}

// Generates similar realistic-ish data for a course with a base par/length.
function syntheticHoles(par: number, baseYards: number): HoleStat[] {
  const pars = par === 71 ? [4, 4, 4, 3, 5, 4, 4, 3, 4, 4, 4, 3, 5, 4, 4, 4, 3, 5] : [4, 4, 4, 3, 4, 4, 5, 4, 4, 5, 4, 4, 3, 4, 5, 4, 3, 4];
  return pars.map((p, i) => {
    const hole = i + 1;
    const yards = p === 3 ? 175 + i * 5 : p === 5 ? 540 + i * 4 : Math.round(baseYards / 18) + (i % 3) * 15;
    const exposure: HoleStat["windExposure"] =
      i % 4 === 0 ? "HEAD" : i % 4 === 1 ? "TAIL" : i % 4 === 2 ? "CROSS-L" : "CROSS-R";
    const scoringAvg = p === 5 ? -0.25 + Math.random() * 0.15 : p === 3 ? -0.02 + Math.random() * 0.2 : Math.random() * 0.2;
    return {
      hole,
      par: p,
      yards,
      scoringAvg: +scoringAvg.toFixed(2),
      fairwayHitPct: p === 3 ? 0 : 58 + Math.floor(Math.random() * 16),
      girPct: 60 + Math.floor(Math.random() * 18),
      windExposure: exposure,
    };
  });
}

export const COURSE_PROFILES: Record<string, CourseProfile> = {
  "quail-hollow": {
    slug: "quail-hollow",
    archetype: "Parkland · long",
    yards: 7561,
    par: 71,
    designer: "George W. Cobb (1961) · Tom Fazio renovations",
    established: 1961,
    blurb:
      "Big-and-long parkland. The closing stretch — 16, 17, 18 (the 'Green Mile') — historically yields a +0.69 stroke premium vs. par and decides outcomes when wind comes up.",
    holes: quailHollow(),
    history: [
      { year: 2025, fieldAvgScore: 71.4, cutLine: -1, windAvgMph: 9 },
      { year: 2024, fieldAvgScore: 71.8, cutLine: 0, windAvgMph: 11 },
      { year: 2023, fieldAvgScore: 70.9, cutLine: -2, windAvgMph: 7 },
      { year: 2022, fieldAvgScore: 71.6, cutLine: 0, windAvgMph: 10 },
      { year: 2021, fieldAvgScore: 72.1, cutLine: +1, windAvgMph: 13 },
    ],
    waveSplit: { amAvg: 71.2, pmAvg: 71.9, sampleRounds: 1842 },
  },
  "pebble-beach": {
    slug: "pebble-beach",
    archetype: "Coastal · wind",
    yards: 7075,
    par: 72,
    designer: "Jack Neville & Douglas Grant (1919)",
    established: 1919,
    blurb:
      "Short by tour standards but exposed to the Pacific. Wind direction off the bay dictates whether the par-5 6th plays as a birdie hole or a defensive layup.",
    holes: syntheticHoles(72, 7075),
    history: [
      { year: 2025, fieldAvgScore: 72.6, cutLine: +2, windAvgMph: 14 },
      { year: 2024, fieldAvgScore: 72.1, cutLine: +1, windAvgMph: 11 },
      { year: 2023, fieldAvgScore: 73.2, cutLine: +3, windAvgMph: 17 },
      { year: 2022, fieldAvgScore: 71.9, cutLine: 0, windAvgMph: 9 },
      { year: 2021, fieldAvgScore: 72.4, cutLine: +1, windAvgMph: 12 },
    ],
    waveSplit: { amAvg: 72.0, pmAvg: 72.8, sampleRounds: 1456 },
  },
  "torrey-pines-south": {
    slug: "torrey-pines-south",
    archetype: "Coastal · long",
    yards: 7765,
    par: 72,
    designer: "William F. Bell (1957) · Rees Jones redesign",
    established: 1957,
    blurb:
      "Long and demanding kikuyu fairways. Marine layer mornings tend to soften the greens; afternoon onshore breezes punish the long approach holes.",
    holes: syntheticHoles(72, 7765),
    history: [
      { year: 2025, fieldAvgScore: 71.8, cutLine: 0, windAvgMph: 10 },
      { year: 2024, fieldAvgScore: 72.4, cutLine: +1, windAvgMph: 12 },
      { year: 2023, fieldAvgScore: 71.5, cutLine: -1, windAvgMph: 8 },
      { year: 2022, fieldAvgScore: 72.1, cutLine: 0, windAvgMph: 11 },
      { year: 2021, fieldAvgScore: 72.7, cutLine: +2, windAvgMph: 14 },
    ],
    waveSplit: { amAvg: 71.6, pmAvg: 72.3, sampleRounds: 1284 },
  },
};

// Convenience: list of every course with its live snapshot merged in.
export function listCourses() {
  return Object.values(COURSE_PROFILES).map((p) => {
    const live = COURSES.find((c) => c.id === p.slug);
    return { ...p, live };
  });
}
