import type { CourseGuide, DriverTier } from "./types";
import {
  generateHoleGuides,
  tierAggregates,
  penaltyHoles,
  opportunityHoles,
  type GenHole,
  type TierDrive,
} from "./generate";
import { generateProse } from "./prose";
import type { CourseProfile } from "@/lib/data/course-profiles";
import type { PgaEvent } from "@/lib/data/pga-schedule";

// Driver-distance tiers used across all auto-generated guides — labels and
// ranges paired with the representative drive used for the approach math.
const TIER_META: { id: DriverTier["id"]; label: string; range: string; driveYds: number }[] = [
  { id: "elite", label: "Elite drivers", range: "310+ yards", driveYds: 315 },
  { id: "mid", label: "Mid-tier drivers", range: "295.1–310 yards", driveYds: 302 },
  { id: "bottom", label: "Shorter drivers", range: "≤ 295 yards", driveYds: 290 },
];

const TIER_DRIVES: TierDrive[] = TIER_META.map((t) => ({ id: t.id, driveYds: t.driveYds }));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDates(startISO: string, endISO: string): string {
  const s = new Date(startISO + "T00:00:00Z");
  const e = new Date(endISO + "T00:00:00Z");
  const m = MONTHS[s.getUTCMonth()];
  const m2 = MONTHS[e.getUTCMonth()];
  const span =
    s.getUTCMonth() === e.getUTCMonth()
      ? `${m} ${s.getUTCDate()}–${e.getUTCDate()}`
      : `${m} ${s.getUTCDate()}–${m2} ${e.getUTCDate()}`;
  return `${span}, ${e.getUTCFullYear()}`;
}

export function slugifyCourse(courseName: string): string {
  return courseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Assemble a full CourseGuide for an event from its structural profile.
// `holes` lets the caller override profile.holes with ESPN-sourced data.
// Returns null if the prose model fails — we never publish a half guide.
export async function buildGuide(
  event: PgaEvent,
  profile: CourseProfile,
  holes: GenHole[] = profile.holes,
): Promise<CourseGuide | null> {
  const holeGuides = generateHoleGuides(holes, TIER_DRIVES);
  const agg = tierAggregates(holes, TIER_DRIVES);

  const prose = await generateProse({
    tournament: event.name,
    courseName: profile.courseName,
    location: event.city,
    par: profile.par,
    yards: profile.yards,
    designer: profile.designer,
    greens: profile.greens,
    fairways: profile.fairways,
    tierDrives: TIER_META.map((t) => ({ id: t.id, range: t.range, driveYds: t.driveYds })),
    aggregates: agg,
    holes: holeGuides,
  });
  if (!prose) return null;

  // Merge prose strategy/keyInsight into the computed holes.
  const proseByHole = new Map(prose.holes.map((h) => [h.hole, h]));
  const holesOut = holeGuides.map((g) => {
    const p = proseByHole.get(g.hole);
    return { ...g, strategy: p?.strategy ?? "", keyInsight: p?.keyInsight };
  });

  const tiers = TIER_META.map((meta) => {
    const p = prose.tiers.find((t) => t.id === meta.id);
    return {
      id: meta.id,
      label: meta.label,
      range: meta.range,
      description: p?.description ?? "",
      examples: [],
      expectedScore: p?.expectedScore ?? "",
      avgApproachYds: agg[meta.id].avg,
      totalApproachYds: agg[meta.id].total,
      keyToSuccess: p?.keyToSuccess ?? "",
    };
  });

  return {
    slug: slugifyCourse(profile.courseName),
    publishedAt: new Date().toISOString(),
    tournamentStartsAt: `${event.startDate}T13:00:00Z`,
    tournament: event.name,
    dates: formatDates(event.startDate, event.endDate),
    courseName: profile.courseName,
    location: event.city,
    designer: profile.designer,
    established: profile.established,
    par: profile.par,
    yards: profile.yards,
    courseRating: profile.courseRating,
    slope: profile.slope,
    greens: profile.greens,
    fairways: profile.fairways,
    difficultyRank: profile.difficultyRank,
    waterOnHoles: profile.waterOnHoles,
    headline: prose.headline,
    tldr: prose.tldr,
    skillStack: prose.skillStack,
    tiers,
    holes: holesOut,
    penaltyHoles: penaltyHoles(holesOut),
    opportunityHoles: opportunityHoles(holesOut),
    bettingAngles: prose.bettingAngles,
    verdict: prose.verdict,
  };
}
