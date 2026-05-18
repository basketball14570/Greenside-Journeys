// Bet-grading alert dispatcher. Runs from the /api/cron/grade handler:
// each tick we re-grade and compare against the prior snapshot. When a
// leg transitions (live → won, live → lost, unknown → live, etc.) we
// fan out a notification via the existing webhook layer.
//
// State persistence: a JSON blob in Supabase profiles.push_subscription
// (when wired) or, until then, an in-process Map. Stateless restarts
// will surface false positives once after a redeploy — acceptable.

import type { Decision } from "@/lib/grading";

type PriorState = Record<string, Decision["status"]>;

// In-memory store keyed by user (or "default" for the demo cron).
const STATE = new Map<string, PriorState>();

export function diffDecisions(
  scope: string,
  decisions: Decision[],
): { changed: Decision[]; firstRun: boolean } {
  const prior = STATE.get(scope);
  const firstRun = prior === undefined;
  const next: PriorState = {};
  const changed: Decision[] = [];
  for (const d of decisions) {
    const key = `${d.bet.player}|${d.bet.market}|${d.bet.line}`;
    next[key] = d.status;
    if (!firstRun && prior![key] !== d.status) {
      changed.push(d);
    }
  }
  STATE.set(scope, next);
  return { changed, firstRun };
}

export function renderAlertText(changed: Decision[]): string {
  const lines: string[] = [];
  for (const d of changed) {
    const emoji =
      d.status === "won"
        ? "✅"
        : d.status === "lost"
          ? "❌"
          : d.status === "live"
            ? "🟡"
            : d.status === "push"
              ? "🔵"
              : "❓";
    const pnl =
      d.pnl !== undefined && d.pnl !== 0
        ? ` (${d.pnl > 0 ? "+" : ""}${d.pnl}u)`
        : "";
    lines.push(`${emoji} **${d.bet.player}** ${d.bet.market} → ${d.status.toUpperCase()}${pnl} — ${d.reason}`);
  }
  return lines.join("\n");
}
