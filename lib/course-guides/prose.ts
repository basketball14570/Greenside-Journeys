import { z } from "zod";
import { claude, WRITING_MODEL } from "@/lib/claude";
import type { DriverTier, HoleGuide } from "./types";
import type { TierAggregate } from "./generate";

// The narrative layer. Given the computed numbers (which are exact and
// must NOT be invented), Claude writes the prose fields in Greenside's
// house voice. Returns null on any failure so the cron skips publishing
// rather than shipping a broken/half guide.

const GUIDE_MODEL = WRITING_MODEL;

const ToneEnum = z.enum(["fit", "fade", "prop", "general"]);

const ProseSchema = z.object({
  headline: z.string(),
  tldr: z.string(),
  skillStack: z.array(z.string()).min(3).max(6),
  tiers: z
    .array(
      z.object({
        id: z.enum(["elite", "mid", "bottom"]),
        description: z.string(),
        keyToSuccess: z.string(),
        expectedScore: z.string(),
      }),
    )
    .length(3),
  holes: z
    .array(
      z.object({
        hole: z.number(),
        strategy: z.string(),
        keyInsight: z.string().optional(),
      }),
    )
    .min(18),
  bettingAngles: z
    .array(z.object({ title: z.string(), body: z.string(), tone: ToneEnum }))
    .min(3)
    .max(6),
  verdict: z.string(),
});

export type GuideProse = z.infer<typeof ProseSchema>;

export type ProseContext = {
  tournament: string;
  courseName: string;
  location: string;
  par: number;
  yards: number;
  designer: string;
  greens: string;
  fairways: string;
  tierDrives: { id: DriverTier["id"]; range: string; driveYds: number }[];
  aggregates: Record<DriverTier["id"], TierAggregate>;
  holes: HoleGuide[]; // computed: par, yards, approachYds, flag
};

const SYSTEM = `You are the lead golf-betting analyst for Greenside, writing a weekly course guide.
Voice: sharp, confident, betting-literate; concrete over flowery. Mirror this house style:
- headline: one punchy line capturing the course's identity (e.g. "An iron-play course masquerading as a bombers' track.").
- tldr: 3-4 sentences a bettor can act on.
- per-hole strategy: 1-2 sentences, specific to the hole's par/yardage/approach; call out penalty stretches and scoring holes.
- bettingAngles: actionable leans tagged fit (back) / fade / prop / general.

HARD RULES:
- The numbers provided (approach yardages, per-round totals/averages, par, yardage, flags) are EXACT. Reference them; never invent or contradict them.
- Do not fabricate player names, records, or stats not given. Examples of player fits may be omitted.
- Return ONLY a JSON object, no prose or markdown fences, matching exactly:
{
  "headline": string,
  "tldr": string,
  "skillStack": [string, ...],            // 4-5 skills, highest impact first
  "tiers": [ { "id": "elite"|"mid"|"bottom", "description": string, "keyToSuccess": string, "expectedScore": string }, ... 3 ],
  "holes": [ { "hole": number, "strategy": string, "keyInsight"?: string }, ... all 18 ],
  "bettingAngles": [ { "title": string, "body": string, "tone": "fit"|"fade"|"prop"|"general" }, ... 3-5 ],
  "verdict": string
}`;

export async function generateProse(ctx: ProseContext): Promise<GuideProse | null> {
  try {
    const res = await claude().messages.create({
      model: GUIDE_MODEL,
      max_tokens: 4096,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Write the ${ctx.tournament} guide for ${ctx.courseName} (${ctx.location}). Par ${ctx.par}, ${ctx.yards} yards, ${ctx.greens} greens, ${ctx.fairways} fairways, designed by ${ctx.designer}.

Driver tiers (drive distance): ${ctx.tierDrives.map((t) => `${t.id} ${t.range}`).join(", ")}.
Per-round approach work — elite: ${ctx.aggregates.elite.total} yds total (${ctx.aggregates.elite.avg}/shot); mid: ${ctx.aggregates.mid.total} (${ctx.aggregates.mid.avg}); bottom: ${ctx.aggregates.bottom.total} (${ctx.aggregates.bottom.avg}).

Holes (hole | par | yards | approach elite/mid/bottom | flag):
${ctx.holes
  .map(
    (h) =>
      `${h.hole} | par ${h.par} | ${h.yards}y | ${h.approachYds.elite}/${h.approachYds.mid}/${h.approachYds.bottom} | ${h.flag ?? "neutral"}`,
  )
  .join("\n")}

Return the JSON object now.`,
        },
      ],
    });
    const block = res.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return null;
    const raw = block.text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
    const parsed = ProseSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
