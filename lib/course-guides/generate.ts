import type { HoleGuide, DriverTier } from "./types";

// Deterministic "math layer" for course guides. Given per-hole par +
// yardage and the three driver-distance tiers, it computes the parts of a
// guide that are pure arithmetic — approach yardage by tier, club per
// approach, per-round approach totals/averages, and heuristic penalty /
// opportunity flags. The narrative fields (headline, tldr, hole strategy,
// betting angles, verdict) are left to the prose layer (Claude / human),
// since they need judgment this can't infer.
//
// Exactness: par-3 approach = tee length; par-4 approach = yards − drive.
// Par-5 "approach" is the third-shot yardage after a layup, which is a
// strategic choice, so it takes a per-hole `eliteApproach` input (with a
// rough default) and the other tiers shift by the drive gap.

export type TierDrive = { id: DriverTier["id"]; driveYds: number };

export const DEFAULT_TIER_DRIVES: TierDrive[] = [
  { id: "elite", driveYds: 315 },
  { id: "mid", driveYds: 302 },
  { id: "bottom", driveYds: 290 },
];

export type GenHole = {
  hole: number;
  par: 3 | 4 | 5;
  yards: number;
  // Par 5 only: the assumed elite third-shot yardage after a layup. Other
  // tiers derive from this by the drive gap. Defaults to a wedge zone.
  eliteApproach?: number;
};

// Club by approach yardage — bucket boundaries follow the doc's mapping
// (≤100 wedge, 100-150 mid-short iron, 150-200 mid-long iron, 200+ long
// iron / hybrid). A range string keeps it honest about overlap.
export function clubForYardage(yds: number): string {
  if (yds < 60) return "GW / SW";
  if (yds < 90) return "SW / PW";
  if (yds < 115) return "PW / 9i";
  if (yds < 140) return "9i / 8i";
  if (yds < 160) return "8i / 7i";
  if (yds < 180) return "7i / 6i";
  if (yds < 200) return "6i / 5i";
  if (yds < 220) return "5i / 4i";
  if (yds < 240) return "4i / hybrid";
  return "hybrid / 3w";
}

// Elite-tier approach for a hole. Par 3 = tee shot; par 4 = yards − drive
// (floored so a drivable par 4 still shows a wedge); par 5 = the layup
// third-shot input, defaulting to a wedge zone.
function eliteApproachFor(h: GenHole, eliteDrive: number): number {
  if (h.par === 3) return h.yards;
  if (h.par === 4) return Math.max(45, h.yards - eliteDrive);
  return h.eliteApproach ?? 100; // par 5 layup → wedge by default
}

export function approachByTier(
  h: GenHole,
  drives: TierDrive[] = DEFAULT_TIER_DRIVES,
): Record<DriverTier["id"], number> {
  const eliteDrive = drives.find((d) => d.id === "elite")?.driveYds ?? 315;
  const elite = eliteApproachFor(h, eliteDrive);
  const out = {} as Record<DriverTier["id"], number>;
  for (const d of drives) {
    // Par 3 is identical for everyone; otherwise each shorter tier leaves
    // the drive-gap of extra approach. (Negative gaps would only happen if
    // a tier out-drove elite, which the tiers preclude.)
    out[d.id] = h.par === 3 ? h.yards : elite + (eliteDrive - d.driveYds);
  }
  return out;
}

// Heuristic flag: opportunity when the field gets a wedge/short iron (or a
// par 5), penalty when even good drives leave a long iron or it's a long
// par 3. Expert curation can override — this is a first pass.
function flagFor(h: GenHole, approaches: Record<DriverTier["id"], number>): HoleGuide["flag"] {
  const elite = approaches.elite;
  const bottom = approaches.bottom;
  if (h.par === 5 || elite <= 110) return "opportunity";
  if (bottom >= 195 || (h.par === 3 && h.yards >= 235)) return "penalty";
  return "neutral";
}

// Build the mechanical HoleGuide rows — approach yardages, clubs, flag —
// with empty strategy/keyInsight for the prose layer to fill.
export function generateHoleGuides(
  holes: GenHole[],
  drives: TierDrive[] = DEFAULT_TIER_DRIVES,
): HoleGuide[] {
  return holes.map((h) => {
    const approachYds = approachByTier(h, drives);
    const approachClubs = {} as Record<DriverTier["id"], string>;
    for (const d of drives) approachClubs[d.id] = clubForYardage(approachYds[d.id]);
    return {
      hole: h.hole,
      par: h.par,
      yards: h.yards,
      approachYds,
      approachClubs,
      strategy: "",
      flag: flagFor(h, approachYds),
    };
  });
}

export type TierAggregate = { total: number; avg: number };

// Per-round approach total + per-shot average for each tier.
export function tierAggregates(
  holes: GenHole[],
  drives: TierDrive[] = DEFAULT_TIER_DRIVES,
): Record<DriverTier["id"], TierAggregate> {
  const out = {} as Record<DriverTier["id"], TierAggregate>;
  for (const d of drives) {
    let total = 0;
    for (const h of holes) total += approachByTier(h, drives)[d.id];
    out[d.id] = { total, avg: +(total / holes.length).toFixed(1) };
  }
  return out;
}

export function penaltyHoles(guides: HoleGuide[]): number[] {
  return guides.filter((g) => g.flag === "penalty").map((g) => g.hole);
}

export function opportunityHoles(guides: HoleGuide[]): number[] {
  return guides.filter((g) => g.flag === "opportunity").map((g) => g.hole);
}
