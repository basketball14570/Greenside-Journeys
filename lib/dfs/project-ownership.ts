import { DK_ROSTER_SIZE, type DkSalaryRow } from "@/lib/data/dfs-salaries";

// Projected DFS ownership model (v1, heuristic — no ML).
//
// Golf GPP ownership is driven by two forces:
//   1. Raw scoring expectation — the studs everyone wants (tracks salary
//      and recent form / DK points-per-game).
//   2. Value — points per $1k of salary; cheap producers get piled on.
//
// We z-score each across the field, blend them, push through a softmax,
// and normalise so the field sums to roster_size * 100% (every roster
// spot is one full "100% owned" unit). Caps keep a single stud from
// running away past realistic chalk. Output is directly comparable to
// the actual ownership you upload after the contest locks.

export type OwnershipProjection = {
  name: string;
  salary: number;
  ppg: number;
  value: number; // points per $1k
  projOwn: number; // projected % owned
  marketProb: number | null; // DataGolf top-20 prob used as form signal, if any
};

export type OwnershipDelta = OwnershipProjection & {
  actualOwn: number;
  delta: number; // actual − projected (positive = we under-projected the chalk)
};

export function normName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ø/gi, "o")
    .replace(/å/gi, "a")
    .replace(/æ/gi, "ae")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Join the projection against actual ownership (once it's been uploaded
// for the event) so the page can show a projected-vs-actual delta. Only
// players present in both lists are returned, sorted by the size of the
// miss so the biggest surprises surface first.
export function joinActual(
  projection: OwnershipProjection[],
  actual: { name: string; own: number }[],
): OwnershipDelta[] {
  const actualByName = new Map(actual.map((a) => [normName(a.name), a.own]));
  const rows: OwnershipDelta[] = [];
  for (const p of projection) {
    const a = actualByName.get(normName(p.name));
    if (a === undefined) continue;
    rows.push({
      ...p,
      actualOwn: a,
      delta: Number((a - p.projOwn).toFixed(1)),
    });
  }
  return rows.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
}

// Blend weights. Salary and value (points per $1k) both drive ownership.
// Salary anchors the studs the field rosters on name alone (Scheffler is
// chalk at any value), but GPP fields chase value hard — they pile onto the
// cheap, high-projection plays. Backtesting the CJ Cup Byron Nelson showed
// the old 0.7/0.3 split badly under-owned the value tier (Blades Brown,
// Tom Kim, Jaeger, Eckroat were 12-19% actual but projected 4-8%) while
// over-owning ordinary-value studs, so we lean meaningfully more on value.
const W_SALARY = 0.55;
const W_VALUE = 0.45;
// Softmax temperature — higher = flatter ownership, lower = more
// top-heavy. Tuned so the chalkiest play lands in the 30s/40s and the
// field tail sits near the 1-3% punt range seen in historical data.
const TEMP = 0.7;
const MAX_OWN = 45; // hard cap; nobody is owned more than this in practice
const MIN_OWN = 0.3;
// Clamp z-scores so a single noisy season average can't dominate. Value gets
// the same headroom as salary now — capping it at 2.0 was throttling the
// genuine top-value plays the field actually chalks.
const Z_CLAMP_SALARY = 2.5;
const Z_CLAMP_VALUE = 2.5;
// v2: when a live finish signal (DataGolf top-20 probability) is supplied, it
// captures recent form / course fit that salary + season ppg can't — the part
// that drove misses like Keith Mitchell (great season ppg, cold form → faded).
// It takes a slice of the blend; salary and value keep their 0.55/0.45 ratio
// over what's left. Players without a signal fall back to the pure v1.1 blend.
const W_MARKET = 0.3;
const Z_CLAMP_MARKET = 2.5;

function mean(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}
function stdev(xs: number[], m: number): number {
  const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length;
  return Math.sqrt(v) || 1;
}
function clamp(x: number, lim: number): number {
  return Math.max(-lim, Math.min(lim, x));
}

// `marketByName` (optional) maps normalized player name → a live finish
// signal (DataGolf top-20 probability, 0..1). When present for a player it's
// blended in as the v2 form signal; absent, that player uses the v1.1 blend.
export function projectOwnership(
  rows: DkSalaryRow[],
  marketByName?: Map<string, number>,
): OwnershipProjection[] {
  const withValue = rows.map((r) => ({
    ...r,
    value: r.ppg / (r.salary / 1000),
    market: marketByName?.get(normName(r.name)) ?? null,
  }));

  const sals = withValue.map((r) => r.salary);
  const vals = withValue.map((r) => r.value);
  const salM = mean(sals);
  const salS = stdev(sals, salM);
  const valM = mean(vals);
  const valS = stdev(vals, valM);

  // Market stats only over players that actually have a signal. Need at least
  // a couple, else the z-score is meaningless and we ignore it entirely.
  const mkts = withValue.map((r) => r.market).filter((m): m is number => m != null);
  const useMarket = mkts.length >= 2;
  const mktM = useMarket ? mean(mkts) : 0;
  const mktS = useMarket ? stdev(mkts, mktM) : 1;
  // Salary/value keep their 0.55/0.45 ratio over the share the market leaves.
  const mSalW = (1 - W_MARKET) * W_SALARY;
  const mValW = (1 - W_MARKET) * W_VALUE;

  const scored = withValue.map((r) => {
    const zS = clamp((r.salary - salM) / salS, Z_CLAMP_SALARY);
    const zV = clamp((r.value - valM) / valS, Z_CLAMP_VALUE);
    let d: number;
    if (useMarket && r.market != null) {
      const zM = clamp((r.market - mktM) / mktS, Z_CLAMP_MARKET);
      d = mSalW * zS + mValW * zV + W_MARKET * zM;
    } else {
      d = W_SALARY * zS + W_VALUE * zV;
    }
    return { ...r, weight: Math.exp(d / TEMP) };
  });

  const totalWeight = scored.reduce((s, r) => s + r.weight, 0);
  const budget = DK_ROSTER_SIZE * 100; // total ownership points in the field

  return scored
    .map((r) => {
      const raw = (r.weight / totalWeight) * budget;
      const projOwn = Math.max(MIN_OWN, Math.min(MAX_OWN, raw));
      return {
        name: r.name,
        salary: r.salary,
        ppg: r.ppg,
        value: Number(r.value.toFixed(2)),
        projOwn: Number(projOwn.toFixed(1)),
        marketProb: r.market,
      };
    })
    .sort((a, b) => b.projOwn - a.projOwn);
}
