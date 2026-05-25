// Build the real DraftKings slate as optimizer-ready players from this week's
// salaries + the heuristic ownership projection + DataGolf's pre-tournament
// model.
//
// Projection (DK fantasy points) blends two signals:
//   1. DK AvgPointsPerGame — the player's season scoring rate.
//   2. A DataGolf weekly-strength rating from this week's finish-probability
//      distribution (win / top-5/10/20 / make-cut), which already encodes
//      course fit via DataGolf's course-history-weighted model. Mapped onto
//      the AvgPPG scale (same field mean/spread) so the blend is in points.
// This tilts each projection toward this week's expectation while staying
// anchored to how many points the player actually scores.
//
// Note: wave (AM/PM) and per-player wind deltas need tee times, which aren't
// posted until ~Tuesday — neutral until then. Ceiling/floor are heuristic
// spreads (golf DK scoring is high variance) that feed the Monte Carlo sim.

import type { DfsPlayer } from "@/lib/demo-dfs";
import { computeHeuristicProjection } from "@/lib/dfs/heuristic-projection";
import { normName } from "@/lib/dfs/project-ownership";
import { getPreTournamentProjections, type DgProjection } from "@/lib/data/datagolf";

// Weight on the DataGolf signal in the final blend (rest is AvgPPG).
const DG_BLEND = 0.45;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Upside-weighted "how strong is this player this week" score (unitless).
function dgRating(p: DgProjection): number {
  return p.win * 30 + p.top5 * 10 + p.top10 * 5 + p.top20 * 2.5 + p.makeCut * 1;
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
}
function stdev(xs: number[], m: number): number {
  if (xs.length < 2) return 0;
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
}

export type RealSlate = {
  event: string;
  source: "v2-datagolf" | "v1.1";
  projectionSharpened: boolean;
  players: DfsPlayer[];
};

export async function buildRealSlate(): Promise<RealSlate> {
  const { event, source, projections } = await computeHeuristicProjection();

  // DataGolf finish-probability model → weekly-strength rating per player.
  let ratingByName: Map<string, number> | null = null;
  try {
    const dg = await getPreTournamentProjections("pga");
    if (dg && dg.length) {
      const m = new Map<string, number>();
      for (const p of dg) m.set(normName(p.player_name), dgRating(p));
      if (m.size >= 10) ratingByName = m;
    }
  } catch {
    // DataGolf unavailable — projection stays pure AvgPPG.
  }

  // Map the rating onto the AvgPPG scale using the players present in both,
  // so the blend stays in DK-points units.
  let ratingMean = 0;
  let ratingStd = 0;
  let ppgMean = 0;
  let ppgStd = 0;
  if (ratingByName) {
    const pairs = projections
      .filter((p) => p.ppg > 0 && ratingByName!.has(normName(p.name)))
      .map((p) => ({ ppg: p.ppg, r: ratingByName!.get(normName(p.name))! }));
    if (pairs.length >= 10) {
      ppgMean = mean(pairs.map((x) => x.ppg));
      ppgStd = stdev(pairs.map((x) => x.ppg), ppgMean);
      ratingMean = mean(pairs.map((x) => x.r));
      ratingStd = stdev(pairs.map((x) => x.r), ratingMean);
    } else {
      ratingByName = null; // not enough overlap to calibrate
    }
  }

  const sharpen = !!ratingByName && ratingStd > 0 && ppgStd > 0;

  const players: DfsPlayer[] = projections.map((p) => {
    let projection = p.ppg;
    if (sharpen) {
      const r = ratingByName!.get(normName(p.name));
      if (r != null) {
        const dgPoints = Math.max(0, ppgMean + ((r - ratingMean) / ratingStd) * ppgStd);
        projection = p.ppg > 0 ? (1 - DG_BLEND) * p.ppg + DG_BLEND * dgPoints : dgPoints;
      }
    }
    projection = Math.round(projection * 10) / 10;
    return {
      id: slugify(p.name),
      name: p.name,
      salary: p.salary,
      projection,
      ownership: Number(p.projOwn.toFixed(1)),
      // No tee-time draw pre-tournament — wave/wind tilt stays neutral.
      wave: "AM",
      windAdj: 0,
      // Golf DK scoring is high-variance: a stud's ceiling laps their floor.
      ceiling: Math.round(projection * 1.6),
      floor: Math.round(projection * 0.45),
    };
  });

  return { event, source, projectionSharpened: sharpen, players };
}
