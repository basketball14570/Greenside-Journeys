// Weekly event rollover rule, shared by the PGA schedule (getActiveEvent)
// and the course guides (pickCurrentGuide) so every surface flips at the
// same instant: 8pm America/Chicago on the Sunday before a tournament week.

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

// 8pm Central on the Sunday before the tournament's week. Accepts either a
// full ISO timestamp (course guides) or a date-only string (the schedule);
// both resolve to the same preceding Sunday for a Thursday-start event.
export function goLiveAtCentral(startIso: string): number {
  const start = new Date(startIso);
  const cp = centralParts(start);
  const daysBack = cp.weekday === 0 ? 7 : cp.weekday;
  const sunday = centralParts(new Date(start.getTime() - daysBack * 86_400_000));
  return centralWallToUTC(sunday.y, sunday.mo, sunday.day, 20);
}

// 9pm Central on the most recent Sunday — the DFS contest rollover. Saved
// contests created before this instant belong to a prior week and should
// drop out of the current-week list. If `now` is itself on a Sunday before
// 9pm, the cutoff is the previous Sunday's 9pm.
export function lastDfsContestRolloverCentral(now: Date = new Date()): number {
  const p = centralParts(now);
  let daysBack: number;
  if (p.weekday === 0) {
    daysBack = p.hour >= 21 ? 0 : 7;
  } else {
    daysBack = p.weekday;
  }
  const target = centralParts(new Date(now.getTime() - daysBack * 86_400_000));
  return centralWallToUTC(target.y, target.mo, target.day, 21);
}
