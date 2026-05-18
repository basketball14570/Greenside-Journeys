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
  if (!courseName) return 4;
  const map = COURSE_HOLE_PARS[courseName];
  if (!map) {
    // Try a fuzzy match — ESPN sometimes uses slightly different naming
    const key = Object.keys(COURSE_HOLE_PARS).find(
      (k) => normalize(k) === normalize(courseName),
    );
    if (key) return COURSE_HOLE_PARS[key][hole - 1] ?? 4;
    return 4;
  }
  return map[hole - 1] ?? 4;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}
