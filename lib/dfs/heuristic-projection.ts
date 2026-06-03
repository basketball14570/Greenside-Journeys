// Server-side: compute this week's heuristic ownership projection, blending in
// DataGolf's pre-tournament top-20 probabilities as the v2 form signal when
// they're available. Falls back to the pure salary+value model (v1.1) when
// DataGolf isn't configured or hasn't published the upcoming field yet.
//
// Shared by the projection page (server component) and the
// /api/dfs/heuristic-ownership route (which the vs-Actual tab calls) so both
// surfaces show the exact same numbers.

import { DK_EVENT, DK_OWNERSHIP_OVERRIDES, DK_SALARIES } from "@/lib/data/dfs-salaries";
import {
  projectOwnership,
  normName,
  type OwnershipProjection,
} from "@/lib/dfs/project-ownership";
import { getPreTournamentProjections } from "@/lib/data/datagolf";

export type HeuristicProjectionResult = {
  event: string;
  source: "v2-datagolf" | "v1.1";
  projections: OwnershipProjection[];
};

// Replaces the model's projOwn for any player in the overrides map with
// the operator's manual %. Re-sorts so the table stays ordered by the
// new displayed values. We intentionally don't re-normalize the field
// to sum to ROSTER_SIZE * 100 after overrides — the displayed % per
// player is what matters; minor sum drift is acceptable in exchange for
// a hard, predictable override behavior.
function applyOwnershipOverrides(
  projections: OwnershipProjection[],
  overrides: Record<string, number>,
): OwnershipProjection[] {
  const keys = Object.keys(overrides);
  if (keys.length === 0) return projections;
  const byNorm = new Map<string, number>();
  for (const k of keys) byNorm.set(normName(k), overrides[k]);
  return projections
    .map((p) => {
      const v = byNorm.get(normName(p.name));
      return v == null ? p : { ...p, projOwn: Number(v.toFixed(1)) };
    })
    .sort((a, b) => b.projOwn - a.projOwn);
}

export async function computeHeuristicProjection(): Promise<HeuristicProjectionResult> {
  let marketByName: Map<string, number> | undefined;
  let source: "v2-datagolf" | "v1.1" = "v1.1";

  try {
    const projs = await getPreTournamentProjections("pga");
    if (projs && projs.length) {
      const m = new Map<string, number>();
      for (const p of projs) {
        if (typeof p.top20 === "number") m.set(normName(p.player_name), p.top20);
      }
      if (m.size >= 2) {
        marketByName = m;
        source = "v2-datagolf";
      }
    }
  } catch {
    // DataGolf unavailable — fall through to the v1.1 salary+value model.
  }

  const modelOutput = projectOwnership(DK_SALARIES, marketByName);
  return {
    event: DK_EVENT,
    source,
    projections: applyOwnershipOverrides(modelOutput, DK_OWNERSHIP_OVERRIDES),
  };
}
