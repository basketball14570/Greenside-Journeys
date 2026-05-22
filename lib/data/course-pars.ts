// Per-hole par maps for courses we track. Used when ESPN's free
// scoreboard feed omits per-hole par (most events). Sourced from each
// course's published scorecard; verify when a course re-routes or
// redesigns a hole.
//
// Order is hole 1 → hole 18.

export type HolePar = number[];

// Best-effort mapping. Course names match the schedule entries
// (lib/data/pga-schedule.ts) plus ESPN's likely `course.name` value.
export const COURSE_HOLE_PARS: Record<string, HolePar> = {
  "Quail Hollow Club": [4, 4, 4, 3, 4, 4, 3, 4, 5, 4, 4, 5, 3, 4, 4, 3, 4, 4],
  "Quail Hollow": [4, 4, 4, 3, 4, 4, 3, 4, 5, 4, 4, 5, 3, 4, 4, 3, 4, 4],
  "Augusta National": [4, 5, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 5, 3, 4, 4],
  "Pebble Beach Golf Links": [4, 5, 4, 4, 3, 5, 3, 4, 4, 4, 4, 3, 4, 5, 4, 4, 3, 5],
  "TPC Sawgrass": [4, 5, 3, 4, 4, 4, 4, 3, 5, 4, 5, 4, 4, 4, 3, 5, 3, 4],
  "TPC Sawgrass (Stadium)": [4, 5, 3, 4, 4, 4, 4, 3, 5, 4, 5, 4, 4, 4, 3, 5, 3, 4],
  "Bay Hill Club & Lodge": [4, 4, 4, 5, 4, 5, 3, 4, 4, 4, 4, 3, 4, 5, 3, 4, 3, 4],
  "TPC Scottsdale": [4, 4, 5, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 5, 3, 4, 4],
  "TPC Scottsdale (Stadium)": [4, 4, 5, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 5, 3, 4, 4],
  "Torrey Pines (South)": [4, 4, 3, 4, 4, 4, 4, 3, 4, 4, 3, 4, 5, 4, 3, 5, 4, 5],
  "Riviera Country Club": [5, 4, 4, 3, 4, 3, 4, 4, 4, 3, 4, 4, 4, 4, 5, 3, 4, 4],
  "Innisbrook (Copperhead)": [4, 4, 4, 3, 4, 4, 3, 4, 4, 5, 4, 3, 4, 4, 5, 4, 3, 4],
  "PGA National (Champion)": [4, 4, 3, 4, 5, 4, 3, 4, 4, 4, 4, 3, 4, 5, 4, 4, 3, 4],
  "Trump National Doral (Blue Monster)": [5, 4, 4, 3, 4, 4, 3, 5, 4, 4, 4, 3, 4, 5, 3, 4, 4, 4],
  "Harbour Town Golf Links": [4, 4, 4, 3, 5, 4, 3, 4, 4, 4, 4, 4, 4, 3, 5, 3, 4, 4],
  "Waialae Country Club": [4, 5, 4, 4, 4, 4, 3, 5, 4, 4, 3, 4, 4, 4, 3, 4, 4, 5],
  "TPC Twin Cities": [4, 4, 4, 3, 5, 4, 3, 4, 4, 4, 4, 5, 3, 4, 4, 3, 4, 5],
  "TPC River Highlands": [4, 4, 3, 4, 4, 4, 4, 5, 4, 4, 4, 3, 4, 3, 5, 4, 4, 4],
  "Detroit Golf Club": [4, 4, 4, 5, 4, 3, 4, 4, 4, 4, 4, 4, 3, 4, 4, 3, 5, 3],
  "TPC Southwind": [4, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 4, 4, 4, 4],
  "East Lake Golf Club": [4, 5, 4, 3, 4, 3, 4, 4, 4, 4, 4, 3, 5, 4, 4, 3, 4, 5],
  "Sea Island Golf Club": [4, 4, 4, 5, 3, 5, 4, 4, 3, 4, 4, 3, 4, 4, 4, 3, 4, 4],
  "Caves Valley": [4, 5, 4, 4, 4, 3, 4, 3, 5, 4, 3, 4, 5, 4, 4, 3, 4, 4],
  "TPC Craig Ranch": [4, 4, 4, 3, 5, 4, 3, 4, 4, 4, 5, 4, 3, 4, 4, 3, 4, 4],
  "Memorial Park Golf Course": [4, 4, 4, 3, 5, 4, 3, 4, 4, 5, 4, 3, 4, 4, 4, 4, 3, 5],
};

// Returns the par for a single hole on a course, or 4 as a defensible
// guess when the course or hole isn't mapped. (Most PGA holes are par-4;
// you'll under-count birdies on par-5s and miss eagles, but never claim
// a fake birdie on a par-3.)
export function holeParFor(courseName: string | null | undefined, hole: number): number {
  return holeParStrict(courseName, hole) ?? 4;
}

// Like holeParFor but returns null (not a default 4) when the course or
// hole isn't mapped — so callers can tell "known par 4" from "unknown".
// Used for fairway counting, where guessing par 4 on an unmapped par-3
// would wrongly count it as a driving hole.
export function holeParStrict(
  courseName: string | null | undefined,
  hole: number,
): number | null {
  if (!courseName) return null;
  let map = COURSE_HOLE_PARS[courseName];
  if (!map) {
    const key = Object.keys(COURSE_HOLE_PARS).find(
      (k) => normalize(k) === normalize(courseName),
    );
    if (key) map = COURSE_HOLE_PARS[key];
  }
  return map?.[hole - 1] ?? null;
}

// ESPN sometimes leaves the course name blank; resolve it from the event
// name so per-hole pars still load. Extend as new events are added.
const EVENT_COURSE_ALIASES: { match: string; course: string }[] = [
  { match: "byron nelson", course: "TPC Craig Ranch" },
];

export function resolveCourseName(
  courseName: string | null | undefined,
  eventName: string | null | undefined,
): string | null {
  if (courseName) {
    if (COURSE_HOLE_PARS[courseName]) return courseName;
    const key = Object.keys(COURSE_HOLE_PARS).find(
      (k) => normalize(k) === normalize(courseName),
    );
    if (key) return key;
  }
  if (eventName) {
    const en = eventName.toLowerCase();
    const alias = EVENT_COURSE_ALIASES.find((a) => en.includes(a.match));
    if (alias) return alias.course;
  }
  return courseName ?? null;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}
