import { NextResponse } from "next/server";
import { datagolfEnabled, getPreTournamentProjections } from "@/lib/data/datagolf";
import { DEMO_PROJECTIONS } from "@/lib/data/demo-projections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

// "This week's edge" — top players by win% from DataGolf's
// pre-tournament model. Falls back to the shared CJ CUP Byron Nelson
// demo field when DATAGOLF_API_KEY is missing or upstream fails.

export async function GET() {
  if (!datagolfEnabled()) {
    return NextResponse.json(
      {
        source: "demo",
        message: "CJ Cup field · connect DataGolf for live refresh",
        projections: DEMO_PROJECTIONS,
      },
      {
        headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
      },
    );
  }
  const live = await getPreTournamentProjections();
  if (!live) {
    return NextResponse.json(
      {
        source: "demo",
        message: "CJ Cup field · live refresh momentarily unavailable",
        projections: DEMO_PROJECTIONS,
      },
      { status: 200 },
    );
  }
  return NextResponse.json(
    {
      source: "datagolf",
      projections: live.slice(0, 25),
    },
    {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" },
    },
  );
}
