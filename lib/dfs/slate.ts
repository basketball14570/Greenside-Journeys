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
// Tee waves: once the draw posts, each player is tagged to their tee wave
// (AM = wave 1 = Thu AM/Fri PM, PM = wave 2 = Thu PM/Fri AM) from DataGolf's
// field-updates, and a per-wave wind delta is derived from the forecast so the
// optimizer's wave correlation and the manual lineup lab reflect conditions.
// Ceiling/floor are heuristic spreads (golf DK scoring is high variance).

import type { DfsPlayer } from "@/lib/demo-dfs";
import { computeHeuristicProjection } from "@/lib/dfs/heuristic-projection";
import { normName } from "@/lib/dfs/project-ownership";
import { getPreTournamentProjections, type DgProjection } from "@/lib/data/datagolf";
import { getFieldWaveAttribution } from "@/lib/data/wave-tees";
import { getActiveEvent } from "@/lib/data/pga-schedule";
import {
  courseSlugFor,
  getForecast,
  waveSplitFromForecast,
} from "@/lib/weather/forecast";

// Weight on the DataGolf signal in the final blend (rest is AvgPPG).
const DG_BLEND = 0.45;
// Rough strokes-gained cost of wind, per mph, used to turn the per-wave wind
// gap into a signed windAdj (advantage vs the field's average conditions).
const SG_PER_MPH = 0.05;

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
  wavesApplied: boolean;
  players: DfsPlayer[];
};

export async function buildRealSlate(): Promise<RealSlate> {
  const { event, source, projections } = await computeHeuristicProjection();

  // Tee waves + per-wave wind adjustment, in parallel. Either can be null
  // (field not posted / no DataGolf add-on / no forecast) — slate still works.
  const [fieldWaves, waveWinds] = await Promise.all([
    getFieldWaveAttribution().catch(() => null),
    waveWindAverages().catch(() => null),
  ]);

  // normName → "wave1" | "wave2"
  const waveByName = new Map<string, "wave1" | "wave2">();
  if (fieldWaves) {
    for (const r of fieldWaves.rows) {
      if (r.wave === "wave1" || r.wave === "wave2") {
        waveByName.set(normName(r.name), r.wave);
      }
    }
  }
  const wavesApplied = waveByName.size >= 10;

  // Signed windAdj per wave = advantage vs the field's mean conditions.
  let wave1Adj = 0;
  let wave2Adj = 0;
  if (waveWinds) {
    const fieldMean = (waveWinds.wave1 + waveWinds.wave2) / 2;
    wave1Adj = (fieldMean - waveWinds.wave1) * SG_PER_MPH;
    wave2Adj = (fieldMean - waveWinds.wave2) * SG_PER_MPH;
  }

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
    const wave = waveByName.get(normName(p.name)) ?? null;
    return {
      id: slugify(p.name),
      name: p.name,
      salary: p.salary,
      projection,
      ownership: Number(p.projOwn.toFixed(1)),
      // Tee wave from the draw; unknown players default to wave 1 (AM).
      wave: wave === "wave2" ? "PM" : "AM",
      windAdj:
        wave === "wave1"
          ? Number(wave1Adj.toFixed(2))
          : wave === "wave2"
            ? Number(wave2Adj.toFixed(2))
            : 0,
      // Golf DK scoring is high-variance: a stud's ceiling laps their floor.
      ceiling: Math.round(projection * 1.6),
      floor: Math.round(projection * 0.45),
    };
  });

  return { event, source, projectionSharpened: sharpen, wavesApplied, players };
}

// Average forecast wind (mph) for each combined tee wave over the Thu+Fri
// stretch, from the active event's course forecast. Null when we can't
// resolve the course or the forecast/wave split is unavailable.
async function waveWindAverages(): Promise<{ wave1: number; wave2: number } | null> {
  const event = getActiveEvent();
  if (!event) return null;
  const slug = courseSlugFor(event.course);
  if (!slug) return null;
  const forecast = await getForecast(slug).catch(() => null);
  const split = waveSplitFromForecast(forecast, slug, event.startDate);
  const c = split?.combined;
  if (!c) return null;
  return { wave1: c.wave1.windAvg, wave2: c.wave2.windAvg };
}
