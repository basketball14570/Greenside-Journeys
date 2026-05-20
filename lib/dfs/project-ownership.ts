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
};

// Blend weights. Salary is the market's own projection of a player and
// is the single best predictor of ownership, so it dominates. Value
// (points per $1k) gets a smaller, dampened bump — it nudges genuine
// value plays up without letting a cheap small-sample ppg outlier
// out-own the field's stud.
const W_SALARY = 0.7;
const W_VALUE = 0.3;
// Softmax temperature — higher = flatter ownership, lower = more
// top-heavy. Tuned so the chalkiest play lands in the 30s/40s and the
// field tail sits near the 1-3% punt range seen in historical data.
const TEMP = 0.7;
const MAX_OWN = 45; // hard cap; nobody is owned more than this in practice
const MIN_OWN = 0.3;
// Clamp z-scores so a single noisy season average can't dominate.
const Z_CLAMP_SALARY = 2.5;
const Z_CLAMP_VALUE = 2.0;

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

export function projectOwnership(rows: DkSalaryRow[]): OwnershipProjection[] {
  const withValue = rows.map((r) => ({
    ...r,
    value: r.ppg / (r.salary / 1000),
  }));

  const sals = withValue.map((r) => r.salary);
  const vals = withValue.map((r) => r.value);
  const salM = mean(sals);
  const salS = stdev(sals, salM);
  const valM = mean(vals);
  const valS = stdev(vals, valM);

  const scored = withValue.map((r) => {
    const zS = clamp((r.salary - salM) / salS, Z_CLAMP_SALARY);
    const zV = clamp((r.value - valM) / valS, Z_CLAMP_VALUE);
    const d = W_SALARY * zS + W_VALUE * zV;
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
      };
    })
    .sort((a, b) => b.projOwn - a.projOwn);
}
