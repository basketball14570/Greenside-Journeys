import { NextResponse, type NextRequest } from "next/server";
import { fetchLeaderboard } from "@/lib/espn-leaderboard";
import { resolveCourseName, holeParStrict } from "@/lib/data/course-pars";
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
// ?format=classic|showdown|showdown_r4  &round=N (showdown: score only that round)
export async function GET(req: NextRequest) {
  const fmt = (req.nextUrl.searchParams.get("format") ?? "classic") as ScoringFormat;
  const config = SCORING_FORMATS[fmt] ?? SCORING_FORMATS.classic;
  const roundParam = req.nextUrl.searchParams.get("round");
  const onlyRound = roundParam ? Number(roundParam) : null;

  try {
    const snap = await fetchLeaderboard();
    const isFinal = snap.event?.state === "post";
    // Both Showdown variants are single-round. R4 Showdown also carries
    // finishing-position points — and since R4 *is* the tournament finish, we
    // apply them from the current standing (the "if it ended now" view), not
    // only once the event is officially final.
    const isShowdown = fmt === "showdown" || fmt === "showdown_r4";

    // Showdown is a single-round contest. If the caller didn't pin a round,
    // default R4 Showdown to round 4, and plain Showdown to the latest round
    // any golfer has started — otherwise we'd sum every round's points, which
    // massively inflates Showdown scores and breaks the field ranking. Classic
    // stays cumulative (all rounds) by design.
    let effectiveRound = onlyRound;
    if (effectiveRound === null && isShowdown) {
      if (fmt === "showdown_r4") {
        effectiveRound = 4;
      } else {
        const periods = snap.players.flatMap((p) => p.rounds.map((r) => r.period));
        effectiveRound = periods.length ? Math.max(...periods) : null;
      }
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
    // Resolve the course from BOTH the course field and the event name —
    // ESPN often leaves `course` blank, but the event-name alias (e.g. "byron
    // nelson" → TPC Craig Ranch) still finds the right scorecard.
    const courseName = resolveCourseName(snap.event?.course, snap.event?.name);
    const coursePars: number[] = [];
    let realParHoles = 0;
    for (let h = 1; h <= 18; h++) {
      const p = holeParStrict(courseName, h);
      if (p) {
        coursePars[h - 1] = p;
        realParHoles++;
      }
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
        points: playerLivePoints(
          rounds,
          config,
          isFinal || fmt === "showdown_r4" ? p.posNum : null,
        ),
      };
    });

    return NextResponse.json(
      {
        source: "espn",
        format: fmt,
        round: effectiveRound,
        event: snap.event?.name ?? null,
        course: courseName,
        // How many of the 18 holes have a REAL scorecard par (vs field-derived).
        // 18 means scoring is exact; below 18 means some holes fell back to the
        // unreliable field-derived par and recomputed points may be off.
        realParHoles,
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
