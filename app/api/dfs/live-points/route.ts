import { NextResponse, type NextRequest } from "next/server";
import { fetchLeaderboard } from "@/lib/espn-leaderboard";
import { holeParStrict } from "@/lib/data/course-pars";
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

    // Showdown is a single-round contest. If the caller didn't pin a round,
    // default to the latest round any golfer has started — otherwise we'd sum
    // every round's points, which massively inflates Showdown scores and breaks
    // the field ranking. Classic stays cumulative (all rounds) by design.
    let effectiveRound = onlyRound;
    if (effectiveRound === null && fmt === "showdown") {
      const periods = snap.players.flatMap((p) => p.rounds.map((r) => r.period));
      effectiveRound = periods.length ? Math.max(...periods) : null;
    }
    const pickRounds = (p: (typeof snap.players)[number]) =>
      effectiveRound ? p.rounds.filter((r) => r.period === effectiveRound) : p.rounds;

    // Per-hole par, in priority order:
    //  1. ESPN's own per-hole pars (rarely present on the free feed)
    //  2. the course's published scorecard (lib/data/course-pars.ts) — exact
    //  3. field-derived pars (modal stroke per hole) — last resort only
    // Field-derived par UNDERcounts par-5s (the field's modal score on a par-5
    // is often 4, a birdie), so it must rank below the real scorecard or live
    // points come out low. The course pars fix that.
    const courseName = snap.event?.course ?? null;
    const coursePars: number[] = [];
    for (let h = 1; h <= 18; h++) {
      const p = holeParStrict(courseName, h);
      if (p) coursePars[h - 1] = p;
    }
    const derived = deriveHolePars(snap.players.flatMap(pickRounds));
    const holePars = mergeHolePars(
      mergeHolePars(snap.event?.holePars ?? [], coursePars),
      derived,
    );

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
        round: effectiveRound,
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
