// Similarity-weighted ownership projection.
//
// Idea: for each player in this week's field, look back at every DFS event
// they've played and predict this week's ownership as a weighted average
// of their historical ownership. Weights favor history that's most "like"
// the upcoming spot: same course, similar salary, similar event type,
// recent. Players with no history get the field-wide salary-bucket mean
// (rookies / first-timers).
//
// This is intentionally a transparent model — every weight is something
// a sharp DFS player would do by hand. It's not a neural net; it's a
// reproducible rule we can defend on the page.

export type HistoryRow = {
  event_id: string;
  year: number;
  course: string | null;
  event_name: string;
  event_type?: string | null;       // signature / major / full_cut / sig_cut / alternate
  player_name: string;
  salary: number | null;
  ownership_pct: number | null;
};

export type TargetSpot = {
  course: string;
  eventType?: string;
  year: number;                     // upcoming event's year
};

export type FieldEntry = {
  player_name: string;
  salary: number;
};

export type ProjectionRow = {
  player_name: string;
  salary: number;
  projected_own: number;            // percent, 0..100
  basis: "history" | "salary_bucket" | "default";
  history_n: number;                // # historical rows used
  course_n: number;                 // # of those that were at same course
  effective_weight: number;         // sum of weights — confidence proxy
  historical_avg_own: number | null;
};

const COURSE_BONUS = 2.2;
const TYPE_BONUS = 1.3;
const SALARY_SIGMA = 1400;          // in dollars; wider = more forgiving match
const RECENCY_HALF_LIFE_YEARS = 2.0;

function normCourse(s: string | null | undefined): string {
  if (!s) return "";
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function similarityWeight(
  target: TargetSpot,
  row: HistoryRow,
  targetSalary: number,
): number {
  const yearsAgo = Math.max(0, target.year - row.year);
  const recency = Math.pow(0.5, yearsAgo / RECENCY_HALF_LIFE_YEARS);

  let salaryW = 0.4;
  if (row.salary != null && targetSalary > 0) {
    const d = targetSalary - row.salary;
    salaryW = Math.exp(-(d * d) / (2 * SALARY_SIGMA * SALARY_SIGMA));
  }

  const sameCourse =
    normCourse(target.course) === normCourse(row.course) && row.course;
  const sameType =
    target.eventType &&
    row.event_type &&
    target.eventType === row.event_type;

  let w = recency * salaryW;
  if (sameCourse) w *= COURSE_BONUS;
  if (sameType) w *= TYPE_BONUS;
  return w;
}

// Median of a numeric array. Cheap O(n log n) implementation; arrays are
// small (one player's history).
function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Build a salary-bucket fallback so first-time-on-tour players still get
// a sane projection. Buckets are $1000 wide. We use median to be robust
// to one chalk outlier blowing up a sparsely-populated bucket.
function buildSalaryBuckets(
  rows: HistoryRow[],
): Map<number, number> {
  const groups = new Map<number, number[]>();
  for (const r of rows) {
    if (r.salary == null || r.ownership_pct == null) continue;
    const bucket = Math.round(r.salary / 1000) * 1000;
    const arr = groups.get(bucket) ?? [];
    arr.push(r.ownership_pct);
    groups.set(bucket, arr);
  }
  const out = new Map<number, number>();
  for (const [bucket, owns] of groups) out.set(bucket, median(owns));
  return out;
}

// Pick the closest bucket if exact match not present.
function lookupBucket(buckets: Map<number, number>, salary: number): number | null {
  if (buckets.size === 0) return null;
  const target = Math.round(salary / 1000) * 1000;
  if (buckets.has(target)) return buckets.get(target)!;
  let bestKey: number | null = null;
  let bestDist = Infinity;
  for (const k of buckets.keys()) {
    const d = Math.abs(k - target);
    if (d < bestDist) {
      bestDist = d;
      bestKey = k;
    }
  }
  return bestKey != null ? buckets.get(bestKey)! : null;
}

export function projectOwnership(
  target: TargetSpot,
  field: FieldEntry[],
  historyByPlayer: Map<string, HistoryRow[]>,
  allHistory: HistoryRow[],
): ProjectionRow[] {
  const buckets = buildSalaryBuckets(allHistory);

  const out = field.map<ProjectionRow>((entry) => {
    const hist = historyByPlayer.get(entry.player_name) ?? [];

    if (hist.length === 0) {
      const bucketOwn = lookupBucket(buckets, entry.salary);
      return {
        player_name: entry.player_name,
        salary: entry.salary,
        projected_own: bucketOwn ?? 4,
        basis: bucketOwn != null ? "salary_bucket" : "default",
        history_n: 0,
        course_n: 0,
        effective_weight: 0,
        historical_avg_own: null,
      };
    }

    let num = 0;
    let den = 0;
    let courseN = 0;
    let sumOwn = 0;
    let countOwn = 0;
    for (const row of hist) {
      if (row.ownership_pct == null) continue;
      const w = similarityWeight(target, row, entry.salary);
      num += w * row.ownership_pct;
      den += w;
      sumOwn += row.ownership_pct;
      countOwn += 1;
      if (normCourse(row.course) === normCourse(target.course)) courseN += 1;
    }

    if (den === 0 || countOwn === 0) {
      const bucketOwn = lookupBucket(buckets, entry.salary);
      return {
        player_name: entry.player_name,
        salary: entry.salary,
        projected_own: bucketOwn ?? 4,
        basis: bucketOwn != null ? "salary_bucket" : "default",
        history_n: hist.length,
        course_n: courseN,
        effective_weight: 0,
        historical_avg_own: null,
      };
    }

    // Shrink toward salary-bucket prior when evidence is thin. K controls
    // how aggressively we trust the player's own history vs the prior.
    const K = 0.7;
    const prior = lookupBucket(buckets, entry.salary) ?? sumOwn / countOwn;
    const playerEstimate = num / den;
    const shrinkW = den / (den + K);
    const projected = shrinkW * playerEstimate + (1 - shrinkW) * prior;

    return {
      player_name: entry.player_name,
      salary: entry.salary,
      projected_own: Math.max(0.3, Math.min(60, projected)),
      basis: "history",
      history_n: countOwn,
      course_n: courseN,
      effective_weight: +den.toFixed(2),
      historical_avg_own: +(sumOwn / countOwn).toFixed(2),
    };
  });

  return out.sort((a, b) => b.projected_own - a.projected_own);
}
