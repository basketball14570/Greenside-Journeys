import { NextResponse } from "next/server";
import { buildPreviewAsync } from "@/lib/preview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public, cacheable JSON view of a tournament preview. Powers:
// - The "Export JSON" / share button on /dashboard/preview/[slug]
// - Newsletter / Discord / X-thread syndication (curl this URL into your
//   sender of choice)
// - Affiliates who want to embed our previews without scraping the HTML.
//
// No auth required; same data as the public preview page.
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  const preview = await buildPreviewAsync(params.slug);
  if (!preview) {
    return NextResponse.json(
      {
        error: `No preview for slug '${params.slug}'`,
        available: ["quail-hollow", "pebble-beach", "torrey-pines-south"],
      },
      { status: 404 },
    );
  }
  // Flatten to a stable wire format separate from internal types so
  // downstream consumers don't break when the internal shape evolves.
  const payload = {
    schema_version: "1.0",
    generated_at: new Date().toISOString(),
    tournament: preview.tournament,
    course: {
      slug: preview.slug,
      name: preview.snapshot.name,
      location: preview.snapshot.location,
      archetype: preview.course.archetype,
      yards: preview.course.yards,
      par: preview.course.par,
      designer: preview.course.designer,
    },
    headline: preview.headline,
    weather: preview.weather,
    forecast: preview.forecast
      ? {
          source: preview.forecast.source,
          next_24h: preview.forecast.next24,
        }
      : null,
    top_fits: preview.fitPlayers.map((f) => ({
      player: f.player.name,
      slug: f.player.slug,
      archetype_sg_per_round: f.archetypeFit,
      wind_adjusted_4_round_edge: f.windAdjusted,
      rationale: f.rationale,
    })),
    fades: preview.fades.map((f) => ({
      player: f.player.name,
      slug: f.player.slug,
      wind_adjusted_4_round_edge: f.windAdjusted,
      rationale: f.rationale,
    })),
    angles: preview.angles,
    hedge_candidates: preview.hedgeCandidates,
    history_notes: preview.historyNotes,
  };
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
    },
  });
}
