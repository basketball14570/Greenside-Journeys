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

// The "current week" guide rolls over every Sunday at 8pm Central: each
// guide goes live on the Sunday before its tournament week (8pm America/
// Chicago, DST-aware) and stays current until the next guide's go-live.
// Falls back to the earliest guide before anything has gone live.
const CENTRAL_TZ = "America/Chicago";
const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

function centralParts(d: Date): {
  y: number;
  mo: number;
  day: number;
  weekday: number;
  hour: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CENTRAL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    y: Number(get("year")),
    mo: Number(get("month")),
    day: Number(get("day")),
    weekday: WEEKDAY_INDEX[get("weekday")] ?? 0,
    hour: Number(get("hour")) % 24,
  };
}

// Convert a Central wall-clock time to a UTC epoch (ms), DST-safe — probes
// both CDT (-5) and CST (-6) and keeps the offset that round-trips.
function centralWallToUTC(y: number, mo: number, day: number, hour: number): number {
  for (const offset of [5, 6]) {
    const guess = Date.UTC(y, mo - 1, day, hour + offset, 0, 0);
    const p = centralParts(new Date(guess));
    if (p.y === y && p.mo === mo && p.day === day && p.hour === hour) return guess;
  }
  return Date.UTC(y, mo - 1, day, hour + 5, 0, 0);
}

// 8pm Central on the Sunday before the tournament's (Thursday) start.
function goLiveAt(guide: CourseGuide): number {
  const start = new Date(guide.tournamentStartsAt);
  const cp = centralParts(start);
  const daysBack = cp.weekday === 0 ? 7 : cp.weekday;
  const sunday = centralParts(new Date(start.getTime() - daysBack * 86_400_000));
  return centralWallToUTC(sunday.y, sunday.mo, sunday.day, 20);
}

export function pickCurrentGuide(
  list: CourseGuide[],
  now: Date = new Date(),
): CourseGuide | null {
  if (list.length === 0) return null;
  const ranked = list
    .map((g) => ({ g, go: goLiveAt(g) }))
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
