import { getOddsMatrix } from "@/lib/data/odds";
import { getPreTournamentProjections, type DgProjection } from "@/lib/data/datagolf";
import { DEMO_PROJECTIONS } from "@/lib/data/demo-projections";
import { americanToDecimal, impliedProbability } from "@/lib/hedge";
import type { BookCode } from "@/lib/data/odds-types";

// Markets where the DataGolf model gives us a matching probability to price
// against. (top_40 has no model field, so it's excluded from the edge view.)
export const EDGE_MARKETS = ["winner", "top_5", "top_10", "top_20"] as const;
export type EdgeMarket = (typeof EDGE_MARKETS)[number];

export const EDGE_MARKET_LABEL: Record<EdgeMarket, string> = {
  winner: "Winner",
  top_5: "Top 5",
  top_10: "Top 10",
  top_20: "Top 20",
};

export type EdgeRow = {
  player: string;
  modelProb: number; // 0..1, DataGolf
  bestOdds: number; // American, best book
  bestBook: BookCode;
  impliedProb: number; // 0..1, from best price (includes vig)
  edgePts: number; // (modelProb - impliedProb) * 100, percentage points
  evPct: number; // expected value per $1 staked, as a percent
};

export type EdgeMatrix = {
  event: string;
  market: EdgeMarket;
  oddsSource: "the-odds-api" | "datagolf" | "demo";
  modelSource: "datagolf" | "demo";
  lastUpdate: string | null;
  rows: EdgeRow[]; // sorted by EV desc
  matched: number; // players matched between odds and model
};

function modelProbFor(p: DgProjection, market: EdgeMarket): number {
  switch (market) {
    case "winner":
      return p.win;
    case "top_5":
      return p.top5;
    case "top_10":
      return p.top10;
    case "top_20":
      return p.top20;
  }
}

// Both the odds feed and DataGolf serve "First Last"; normalize for matching.
function norm(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/ß/g, "ss")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function getEdgeMatrix(market: EdgeMarket): Promise<EdgeMatrix> {
  const [matrix, liveProj] = await Promise.all([
    getOddsMatrix(market),
    getPreTournamentProjections(),
  ]);

  const proj = liveProj ?? DEMO_PROJECTIONS;
  const modelSource: "datagolf" | "demo" = liveProj ? "datagolf" : "demo";

  const byName = new Map<string, DgProjection>();
  for (const p of proj) byName.set(norm(p.player_name), p);

  const rows: EdgeRow[] = [];
  for (const r of matrix.rows) {
    const p = byName.get(norm(r.player));
    if (!p) continue;
    const modelProb = modelProbFor(p, market);
    if (modelProb == null || modelProb <= 0) continue;

    const decimal = americanToDecimal(r.bestOdds);
    const evPct = (modelProb * decimal - 1) * 100;
    const impliedProb = impliedProbability(r.bestOdds);
    const edgePts = (modelProb - impliedProb) * 100;

    rows.push({
      player: r.player,
      modelProb,
      bestOdds: r.bestOdds,
      bestBook: r.bestBook,
      impliedProb,
      edgePts,
      evPct,
    });
  }

  rows.sort((a, b) => b.evPct - a.evPct);

  return {
    event: matrix.event,
    market,
    oddsSource: matrix.source,
    modelSource,
    lastUpdate: matrix.lastUpdate,
    rows,
    matched: rows.length,
  };
}
