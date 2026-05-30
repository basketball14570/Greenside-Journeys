import { z } from "zod";
import { claude, WRITING_MODEL } from "@/lib/claude";
import type { CourseProfile } from "@/lib/data/course-profiles";
import type { GenHole } from "./generate";
import type { PgaEvent } from "@/lib/data/pga-schedule";

// Opus-generated structural profile for courses we haven't hand-authored.
// The weekly guide cron used to SKIP any course missing from
// COURSE_PROFILES (only a couple are hand-built), so most weeks produced
// nothing. This fills the gap: per-hole par/yardage comes from ESPN when
// available (real, authoritative); the descriptive course metadata
// (designer, grass types, rating/slope, difficulty, water holes) comes
// from the model's knowledge of established PGA Tour venues.
//
// Guardrails:
//  - par and yards are RECOMPUTED from the hole table, never trusted from
//    the model's course-level numbers, so the guide can't contradict its
//    own scorecard.
//  - Returns null on any failure or implausible data; the cron then skips
//    rather than publishing a fabricated guide.

const HoleSchema = z.object({
  hole: z.number().int().min(1).max(18),
  par: z.number().int().min(3).max(5),
  yards: z.number().int().min(70).max(700),
  // Par-5 only: assumed elite third-shot (layup) yardage. Optional.
  eliteApproach: z.number().int().min(40).max(260).optional(),
});

const MetaSchema = z.object({
  designer: z.string().min(2).max(120),
  established: z.number().int().min(1850).max(2026),
  courseRating: z.number().min(65).max(82),
  slope: z.number().int().min(100).max(155),
  greens: z.string().min(2).max(60),
  fairways: z.string().min(2).max(60),
  difficultyRank: z.string().min(4).max(120),
  waterOnHoles: z.number().int().min(0).max(18),
  // Holes optional — only used when ESPN didn't supply a complete set.
  holes: z.array(HoleSchema).optional(),
});

const SYSTEM = `You are a golf course researcher building a structured profile for a PGA Tour venue.
Return ONLY a JSON object (no prose, no markdown fences) with this exact shape:
{
  "designer": string,            // course architect(s), e.g. "Pete Dye"
  "established": number,         // year the course opened
  "courseRating": number,        // championship-tee course rating, ~70-78
  "slope": number,               // championship-tee slope, ~120-150
  "greens": string,              // green grass type, e.g. "Bentgrass" or "TifEagle Bermuda"
  "fairways": string,            // fairway grass type, e.g. "Bermudagrass"
  "difficultyRank": string,      // one short phrase, e.g. "A demanding par 70 — precision over power"
  "waterOnHoles": number,        // count of holes with water in play
  "holes": [ { "hole": number, "par": 3|4|5, "yards": number, "eliteApproach"?: number }, ... 18 ]
}

RULES:
- Use the real, published facts for this specific course. If you are not confident about a metadata value, give the best-documented value rather than inventing a precise-looking fake.
- "holes" is REQUIRED ONLY when the user says ESPN hole data is unavailable. When required, give all 18 holes from the tournament scorecard, in order, par 3/4/5 with championship yardage. For each par 5, include "eliteApproach": the typical third-shot wedge yardage after a layup (60-150).
- Do NOT include any commentary, betting analysis, or player references — metadata only.`;

export type GeneratedProfileResult = {
  profile: CourseProfile;
  holesSource: "espn" | "model";
};

export async function generateCourseProfile(
  event: PgaEvent,
  espnHoles: GenHole[] | null,
): Promise<GeneratedProfileResult | null> {
  const haveEspnHoles = !!espnHoles && espnHoles.length === 18;
  try {
    const res = await claude().messages.create({
      model: WRITING_MODEL,
      max_tokens: 2048,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Build the profile for ${event.course} (${event.city}), host of the ${event.name}.
ESPN hole data is ${haveEspnHoles ? "AVAILABLE — omit the \"holes\" array" : "UNAVAILABLE — include the full 18-hole \"holes\" array"}.
Return the JSON object now.`,
        },
      ],
    });
    const block = res.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return null;
    const raw = block.text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
    const parsed = MetaSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    const meta = parsed.data;

    // Resolve holes: ESPN wins; otherwise the model's set must be complete.
    const holes: GenHole[] = haveEspnHoles
      ? (espnHoles as GenHole[])
      : (meta.holes ?? []).map((h) => ({
          hole: h.hole,
          par: h.par as 3 | 4 | 5,
          yards: h.yards,
          ...(h.eliteApproach != null ? { eliteApproach: h.eliteApproach } : {}),
        }));

    // Must be a complete, well-ordered 18.
    if (holes.length !== 18) return null;
    const seen = new Set(holes.map((h) => h.hole));
    if (seen.size !== 18) return null;

    // Recompute par/yards from the hole table so the guide is internally
    // consistent — never inherit a contradictory course-level number.
    const par = holes.reduce((s, h) => s + h.par, 0);
    const yards = holes.reduce((s, h) => s + h.yards, 0);
    if (par < 68 || par > 73 || yards < 6300 || yards > 8000) return null;

    const profile: CourseProfile = {
      courseName: event.course,
      designer: meta.designer,
      established: meta.established,
      par,
      yards,
      courseRating: meta.courseRating,
      slope: meta.slope,
      greens: meta.greens,
      fairways: meta.fairways,
      difficultyRank: meta.difficultyRank,
      waterOnHoles: meta.waterOnHoles,
      holes,
    };
    return { profile, holesSource: haveEspnHoles ? "espn" : "model" };
  } catch {
    return null;
  }
}
