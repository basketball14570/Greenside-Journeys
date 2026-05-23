import type { GenHole } from "@/lib/course-guides/generate";

// Structural profile per venue — the non-prose facts a course guide needs
// (course meta + per-hole par/yardage). This is the one-time-per-venue
// data the weekly auto-generator reads; most courses repeat yearly, so the
// table grows slowly. Free APIs don't reliably carry per-hole yardage or
// course rating/slope, so we keep them here. The cron will still attempt
// ESPN for holes when a venue isn't listed.

export type CourseProfile = {
  courseName: string;
  designer: string;
  established: number;
  par: number;
  yards: number;
  courseRating: number;
  slope: number;
  greens: string;
  fairways: string;
  difficultyRank: string;
  waterOnHoles: number;
  holes: GenHole[];
};

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export const COURSE_PROFILES: Record<string, CourseProfile> = {
  "Colonial Country Club": {
    courseName: "Colonial Country Club",
    designer: "John Bredemus & Perry Maxwell",
    established: 1936,
    par: 70,
    yards: 7010,
    courseRating: 73.7,
    slope: 132,
    greens: "Bentgrass",
    fairways: "Bermudagrass (narrow)",
    difficultyRank: "A demanding par 70 — precision over power",
    waterOnHoles: 4,
    holes: [
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
    ],
  },
  "TPC Craig Ranch": {
    courseName: "TPC Craig Ranch",
    designer: "Tom Weiskopf",
    established: 2004,
    par: 71,
    yards: 7569,
    courseRating: 76.7,
    slope: 147,
    greens: "Bentgrass",
    fairways: "Bermudagrass",
    difficultyRank: "45th easiest on Tour",
    waterOnHoles: 9,
    holes: [
      { hole: 1, par: 4, yards: 431 },
      { hole: 2, par: 4, yards: 466 },
      { hole: 3, par: 4, yards: 420 },
      { hole: 4, par: 3, yards: 219 },
      { hole: 5, par: 5, yards: 635, eliteApproach: 170 },
      { hole: 6, par: 4, yards: 361 },
      { hole: 7, par: 3, yards: 232 },
      { hole: 8, par: 4, yards: 509 },
      { hole: 9, par: 5, yards: 564, eliteApproach: 99 },
      { hole: 10, par: 4, yards: 491 },
      { hole: 11, par: 4, yards: 467 },
      { hole: 12, par: 4, yards: 493 },
      { hole: 13, par: 4, yards: 512 },
      { hole: 14, par: 4, yards: 362 },
      { hole: 15, par: 3, yards: 216 },
      { hole: 16, par: 4, yards: 492 },
      { hole: 17, par: 3, yards: 147 },
      { hole: 18, par: 5, yards: 552, eliteApproach: 87 },
    ],
  },
};

export function getCourseProfile(courseName: string | null | undefined): CourseProfile | null {
  if (!courseName) return null;
  if (COURSE_PROFILES[courseName]) return COURSE_PROFILES[courseName];
  const key = Object.keys(COURSE_PROFILES).find((k) => norm(k) === norm(courseName));
  return key ? COURSE_PROFILES[key] : null;
}

// Best-effort per-hole par/yardage from ESPN's golf scoreboard course
// block. Returns null when ESPN omits holes or yardage (common) — the
// caller then falls back to COURSE_PROFILES.
export async function fetchEspnCourseHoles(): Promise<GenHole[] | null> {
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard?_=${Date.now()}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const events: any[] = json?.events ?? [];
    const event = events.find((e) => e?.status?.type?.state === "in") ?? events.find((e) => e?.status?.type?.state === "pre") ?? events[0];
    const comp = event?.competitions?.[0];
    const course = Array.isArray(comp?.courses) ? comp.courses[0] : comp?.course;
    const holes: any[] = course?.holes ?? [];
    const parsed: GenHole[] = [];
    for (const h of holes) {
      const hole = Number(h?.number ?? h?.hole);
      const par = Number(h?.par);
      const yards = Number(h?.yards ?? h?.yardage ?? h?.totalYards);
      if (!hole || !(par >= 3 && par <= 5) || !(yards > 60)) continue;
      parsed.push({ hole, par: par as 3 | 4 | 5, yards });
    }
    return parsed.length === 18 ? parsed : null;
  } catch {
    return null;
  }
}
