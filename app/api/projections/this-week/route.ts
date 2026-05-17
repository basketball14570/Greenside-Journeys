import { NextResponse } from "next/server";
import { datagolfEnabled, getPreTournamentProjections } from "@/lib/data/datagolf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// "This week's edge" — top players by win% from DataGolf's
// pre-tournament model. Surfaces a graceful demo fallback when
// DataGolf isn't configured so the dashboard tile is never empty.

const DEMO_PROJECTIONS = [
  { player_name: "Scottie Scheffler", win: 0.18, top5: 0.42, top10: 0.58, top20: 0.78, makeCut: 0.94 },
  { player_name: "Rory McIlroy", win: 0.11, top5: 0.32, top10: 0.5, top20: 0.71, makeCut: 0.91 },
  { player_name: "Xander Schauffele", win: 0.08, top5: 0.26, top10: 0.43, top20: 0.66, makeCut: 0.89 },
  { player_name: "Ludvig Aberg", win: 0.075, top5: 0.24, top10: 0.41, top20: 0.64, makeCut: 0.88 },
  { player_name: "Collin Morikawa", win: 0.06, top5: 0.21, top10: 0.37, top20: 0.6, makeCut: 0.86 },
  { player_name: "Patrick Cantlay", win: 0.05, top5: 0.18, top10: 0.33, top20: 0.55, makeCut: 0.84 },
  { player_name: "Viktor Hovland", win: 0.045, top5: 0.16, top10: 0.3, top20: 0.52, makeCut: 0.82 },
  { player_name: "Hideki Matsuyama", win: 0.04, top5: 0.15, top10: 0.28, top20: 0.49, makeCut: 0.8 },
  { player_name: "Russell Henley", win: 0.035, top5: 0.13, top10: 0.25, top20: 0.46, makeCut: 0.78 },
  { player_name: "Justin Thomas", win: 0.033, top5: 0.12, top10: 0.24, top20: 0.45, makeCut: 0.77 },
];

export async function GET() {
  if (!datagolfEnabled()) {
    return NextResponse.json(
      {
        source: "demo",
        message: "Set DATAGOLF_API_KEY to see live projections",
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
        message: "DataGolf request failed; using demo fallback",
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
