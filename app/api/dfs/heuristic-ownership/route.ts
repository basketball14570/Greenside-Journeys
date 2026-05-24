import { NextResponse } from "next/server";
import { computeHeuristicProjection } from "@/lib/dfs/heuristic-projection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// This week's heuristic ownership projection (salary + value + DataGolf form
// signal). The vs-Actual tab fetches this so it scores against the same
// numbers the projection page renders.
export async function GET() {
  try {
    const result = await computeHeuristicProjection();
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (e) {
    return NextResponse.json(
      { event: "", source: "v1.1", projections: [], error: (e as Error).message },
      { status: 500 },
    );
  }
}
