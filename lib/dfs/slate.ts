// Build the real DraftKings slate as optimizer-ready players from this week's
// salaries + the heuristic ownership projection (DataGolf-backed when
// available). Projection is DK AvgPointsPerGame — our best pre-tournament
// points proxy — and ownership is the projected field ownership. Ceiling/floor
// are heuristic spreads around the projection (golf DK scoring is high
// variance), which feed the Monte Carlo sim.
//
// Note: wave (AM/PM) and per-player wind deltas need tee times, which aren't
// posted pre-tournament — so those are neutral until the draw is out. The
// optimizer still works on projection, ownership leverage, and ceiling.

import type { DfsPlayer } from "@/lib/demo-dfs";
import { computeHeuristicProjection } from "@/lib/dfs/heuristic-projection";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export type RealSlate = {
  event: string;
  source: "v2-datagolf" | "v1.1";
  players: DfsPlayer[];
};

export async function buildRealSlate(): Promise<RealSlate> {
  const { event, source, projections } = await computeHeuristicProjection();

  const players: DfsPlayer[] = projections.map((p) => {
    const projection = p.ppg;
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

  return { event, source, players };
}
