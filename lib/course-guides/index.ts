import type { CourseGuide } from "./types";
import { TPC_CRAIG_RANCH } from "./tpc-craig-ranch";
import { COLONIAL_COUNTRY_CLUB } from "./colonial-country-club";

export type { CourseGuide, DriverTier, HoleGuide, BettingAngle } from "./types";

// Registry of course guides keyed by slug. Add new guides Sunday evening
// 4 days ahead of tee-off — push the file, the dashboard picks it up
// automatically via currentWeekGuide().
export const COURSE_GUIDES: Record<string, CourseGuide> = {
  [TPC_CRAIG_RANCH.slug]: TPC_CRAIG_RANCH,
  [COLONIAL_COUNTRY_CLUB.slug]: COLONIAL_COUNTRY_CLUB,
};

export const COURSE_GUIDE_LIST: CourseGuide[] = Object.values(COURSE_GUIDES).sort(
  (a, b) => a.tournamentStartsAt.localeCompare(b.tournamentStartsAt),
);

// The "current week" guide: the most recent guide whose tournament
// starts within the next 7 days, OR is already in-progress. Falls back
// to the chronologically nearest guide so the surface always renders
// something useful.
export function currentWeekGuide(now: Date = new Date()): CourseGuide | null {
  if (COURSE_GUIDE_LIST.length === 0) return null;
  const t = now.getTime();
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  // Tournament-active: started ≤ 4d ago, hasn't ended (assume 4-day event).
  const active = COURSE_GUIDE_LIST.find((g) => {
    const start = new Date(g.tournamentStartsAt).getTime();
    return start <= t && t - start <= 4.5 * 24 * 60 * 60 * 1000;
  });
  if (active) return active;
  // Upcoming within the next 7 days.
  const upcoming = COURSE_GUIDE_LIST.find((g) => {
    const start = new Date(g.tournamentStartsAt).getTime();
    return start > t && start - t <= WEEK;
  });
  if (upcoming) return upcoming;
  // Fallback: nearest by absolute distance.
  return [...COURSE_GUIDE_LIST].sort((a, b) => {
    const da = Math.abs(new Date(a.tournamentStartsAt).getTime() - t);
    const db = Math.abs(new Date(b.tournamentStartsAt).getTime() - t);
    return da - db;
  })[0];
}

export function getCourseGuide(slug: string): CourseGuide | null {
  return COURSE_GUIDES[slug] ?? null;
}
