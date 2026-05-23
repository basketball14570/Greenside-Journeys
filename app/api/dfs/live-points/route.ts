import { NextResponse, type NextRequest } from "next/server";
import { fetchLeaderboard } from "@/lib/espn-leaderboard";
import { SCORING_FORMATS, type ScoringFormat } from "@/lib/dfs/scoring";
import {
  playerLivePoints,
  parCoverage,
  fillHolePars,
  deriveHolePars,
  mergeHolePars,
} from "@/lib/dfs/live-points";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Live per-golfer fantasy points, recomputed from ESPN's hole-by-hole feed
// with the chosen scoring format. `parCoverage` reports how many played
// holes were actually scoreable (had a par) — if that ratio is low, ESPN
// isn't giving us hole pars for this event and the points can't be trusted.
// ?format=classic|showdown  &round=N (showdown: score only that round)
export async function GET(req: NextRequest) {
  const fmt = (req.nextUrl.searchParams.get("format") ?? "classic") as ScoringFormat;
  const config = SCORING_FORMATS[fmt] ?? SCORING_FORMATS.classic;
  const roundParam = req.nextUrl.searchParams.get("round");
  const onlyRound = roundParam ? Number(roundParam) : null;

  try {
    const snap = await fetchLeaderboard();
    const isFinal = snap.event?.state === "post";
    const pickRounds = (p: (typeof snap.players)[number]) =>
      onlyRound ? p.rounds.filter((r) => r.period === onlyRound) : p.rounds;

    // Per-hole par: prefer ESPN's course pars, fall back to pars derived from
    // the whole field's scores (modal stroke per hole). This is what lets us
    // score live points even when the feed carries no par.
    const derived = deriveHolePars(snap.players.flatMap(pickRounds));
    const holePars = mergeHolePars(snap.event?.holePars ?? [], derived);

    let withStrokes = 0;
    let scoreable = 0;

    const players = snap.players.map((p) => {
      const rounds = fillHolePars(pickRounds(p), holePars);
      const cov = parCoverage(rounds);
      withStrokes += cov.holesWithStrokes;
      scoreable += cov.holesScoreable;
      return {
        name: p.name,
        posNum: p.posNum,
        isCut: p.isCut,
        thru: p.todayLine?.thru ?? null,
        points: playerLivePoints(rounds, config, isFinal ? p.posNum : null),
      };
    });

    return NextResponse.json(
      {
        source: "espn",
        format: fmt,
        event: snap.event?.name ?? null,
        state: snap.event?.state ?? null,
        // 1.0 means every played hole was scoreable; well below 1 means the
        // feed lacks hole pars and recomputed points are unreliable.
        parCoverage: withStrokes ? +(scoreable / withStrokes).toFixed(3) : null,
        players,
      },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
    );
  } catch (e) {
    return NextResponse.json(
      { source: "error", error: (e as Error).message, players: [] },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}
