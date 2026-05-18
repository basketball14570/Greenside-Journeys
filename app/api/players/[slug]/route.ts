import { NextResponse } from "next/server";
import { getPlayerProfile, datagolfEnabled } from "@/lib/data/datagolf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// JSON player profile — DataGolf-backed when DATAGOLF_API_KEY is set,
// otherwise the demo fixtures. Cached for 10 minutes at the edge.
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  const profile = await getPlayerProfile(params.slug);
  if (!profile) {
    return NextResponse.json(
      { error: `No player profile for '${params.slug}'` },
      { status: 404 },
    );
  }
  return NextResponse.json(
    {
      schema_version: "1.0",
      source: datagolfEnabled() ? "datagolf" : "demo",
      generated_at: new Date().toISOString(),
      player: profile,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
      },
    },
  );
}
