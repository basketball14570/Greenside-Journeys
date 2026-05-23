import { NextResponse, type NextRequest } from "next/server";
import { getLiveCutProjection, datagolfEnabled } from "@/lib/data/datagolf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Live make-cut probabilities + projected cut line for the active event,
// from DataGolf's in-play model. The cut-sweat UI parses the user's
// entries CSV client-side and joins it to this. Returns 200 with an empty
// player list when DataGolf isn't configured so the UI can degrade.
export async function GET(req: NextRequest) {
  const tour = req.nextUrl.searchParams.get("tour") ?? "pga";
  if (!datagolfEnabled()) {
    return NextResponse.json(
      { source: "unavailable", reason: "DATAGOLF_API_KEY not set", cutLine: null, players: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    const proj = await getLiveCutProjection(tour);
    return NextResponse.json(
      { source: "datagolf", ...proj },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
    );
  } catch (e) {
    return NextResponse.json(
      { source: "error", error: (e as Error).message, cutLine: null, players: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
