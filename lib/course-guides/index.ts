import type { CourseGuide } from "./types";
import { goLiveAtCentral } from "@/lib/data/event-rollover";
import { TPC_CRAIG_RANCH } from "./tpc-craig-ranch";
import { COLONIAL_COUNTRY_CLUB } from "./colonial-country-club";
import { MUIRFIELD_VILLAGE } from "./muirfield-village";
import { TPC_TORONTO_AT_OSPREY_VALLEY } from "./tpc-toronto-at-osprey-valley";
import { SHINNECOCK_HILLS } from "./shinnecock-hills";

export type { CourseGuide, DriverTier, HoleGuide, BettingAngle } from "./types";

// Registry of course guides keyed by slug. Add new guides Sunday evening
// 4 days ahead of tee-off — push the file, the dashboard picks it up
// automatically via currentWeekGuide().
export const COURSE_GUIDES: Record<string, CourseGuide> = {
  [TPC_CRAIG_RANCH.slug]: TPC_CRAIG_RANCH,
  [COLONIAL_COUNTRY_CLUB.slug]: COLONIAL_COUNTRY_CLUB,
  [MUIRFIELD_VILLAGE.slug]: MUIRFIELD_VILLAGE,
  [TPC_TORONTO_AT_OSPREY_VALLEY.slug]: TPC_TORONTO_AT_OSPREY_VALLEY,
  [SHINNECOCK_HILLS.slug]: SHINNECOCK_HILLS,
};

export const COURSE_GUIDE_LIST: CourseGuide[] = Object.values(COURSE_GUIDES).sort(
  (a, b) => a.tournamentStartsAt.localeCompare(b.tournamentStartsAt),
);

// The "current week" guide rolls over every Sunday at 8pm Central (shared
// rule with the PGA schedule): each guide goes live on the Sunday before its
// tournament week and stays current until the next guide's go-live. Falls
// back to the earliest guide before anything has gone live.
export function pickCurrentGuide(
  list: CourseGuide[],
  now: Date = new Date(),
): CourseGuide | null {
  if (list.length === 0) return null;
  const ranked = list
    .map((g) => ({ g, go: goLiveAtCentral(g.tournamentStartsAt) }))
    .sort((a, b) => a.go - b.go);
  const t = now.getTime();
  let current: CourseGuide | null = null;
  for (const { g, go } of ranked) {
    if (go <= t) current = g;
  }
  // Nothing has gone live yet (season hasn't started): show the earliest.
  return current ?? ranked[0].g;
}

export function currentWeekGuide(now: Date = new Date()): CourseGuide | null {
  return pickCurrentGuide(COURSE_GUIDE_LIST, now);
}

export function getCourseGuide(slug: string): CourseGuide | null {
  return COURSE_GUIDES[slug] ?? null;
}
