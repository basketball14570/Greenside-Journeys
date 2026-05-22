// Fairways-hit / greens-in-regulation tracking + grading. ESPN's free
// feed has no FIR/GIR, but DataGolf's live stats expose per-player rates;
// here we turn those rates into "hit / attempts" counts against the holes
// a player has actually played, and grade FH/GIR over/under props off
// them. Shared by the live page (display + on-screen grading) and the
// settlement cron (server-side settlement) so both agree.

import { holeParFor } from "@/lib/data/course-pars";
import type { RoundLine } from "@/lib/espn-leaderboard";
import type { Decision, OpenBet } from "@/lib/grading";

// The subset of DataGolf's live-stat row we need. Rates arrive as
// fractions (0..1); we tolerate 0..100 too.
export type ShotRates = {
  accuracy?: number | null;   // driving accuracy = fairways hit %
  gir?: number | null;        // greens in regulation %
  scrambling?: number | null; // up-and-down %
};

export type ShotCounts = {
  fh: string | null;  // fairways hit / driving holes played, e.g. "4/5"
  gir: string | null; // greens in regulation / holes played
  scr: string | null; // up-and-downs / greens missed
  // Numeric counts behind the strings, for grading FH/GIR prop bets.
  fhHit: number | null;
  girHit: number | null;
  drivingPlayed: number;
  played: number;
  roundComplete: boolean;
};

// Match a bet's player name to a DataGolf / leaderboard row. DataGolf
// serves "Last, First" while sportsbooks send "First Last" — flip and
// normalize both before comparing.
export function normShotName(name: string): string {
  const flipped = name.includes(",")
    ? name.split(",").map((s) => s.trim()).reverse().join(" ")
    : name;
  return flipped
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .replace(/æ/g, "ae")
    .replace(/ß/g, "ss")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function asFraction(v: number | null | undefined): number | null {
  if (v == null) return null;
  return v > 1.5 ? v / 100 : v;
}

export function deriveShotCounts(
  rates: ShotRates | null,
  round: RoundLine | null | undefined,
  courseName: string | null | undefined,
): ShotCounts | null {
  if (!rates || !round) return null;
  const playedHoles = round.holes.filter(
    (h) => h.strokes !== null && h.strokes > 0,
  );
  const played = playedHoles.length || round.thru || 0;
  if (!played) return null;

  const drivingPlayed =
    playedHoles.length > 0
      ? playedHoles.filter((h) => (h.par ?? holeParFor(courseName, h.hole)) >= 4).length
      : 0;

  const girFrac = asFraction(rates.gir);
  const accFrac = asFraction(rates.accuracy);
  const scrFrac = asFraction(rates.scrambling);

  const girCount = girFrac != null ? Math.round(girFrac * played) : null;
  const greensMissed = girCount != null ? played - girCount : null;
  const fhHit =
    accFrac != null && drivingPlayed > 0 ? Math.round(accFrac * drivingPlayed) : null;

  const fh = fhHit != null ? `${fhHit}/${drivingPlayed}` : null;
  const gir = girCount != null ? `${girCount}/${played}` : null;
  const scr =
    scrFrac != null && greensMissed != null && greensMissed > 0
      ? `${Math.round(scrFrac * greensMissed)}/${greensMissed}`
      : null;

  return {
    fh,
    gir,
    scr,
    fhHit,
    girHit: girCount,
    drivingPlayed,
    played,
    roundComplete: round.complete || round.thru === 18,
  };
}

// Grade a fairways-hit / greens-in-regulation OVER/UNDER prop from the
// DataGolf-derived counts. Returns null when the market isn't an FH/GIR
// prop or no count is available yet (caller falls back to the base
// grader's "settle manually" message).
export function gradeShotProp(ob: OpenBet, shots: ShotCounts): Decision | null {
  const m = ob.market.toLowerCase();
  const isFairway = m.includes("fairway");
  const isGir = m.includes("green") || /\bgir\b/.test(m);
  if (!isFairway && !isGir) return null;

  const observed = isFairway ? shots.fhHit : shots.girHit;
  if (observed == null) return null;

  const lineMatch = ob.line.match(/(\d+(?:\.\d+)?)/);
  if (!lineMatch) return null;
  const line = parseFloat(lineMatch[1]);
  const side: "over" | "under" =
    /^u/i.test(ob.line.trim()) || /\b(under|lower)\b/.test(m) ? "under" : "over";

  const unit = isFairway ? "fairways" : "GIR";
  const played = isFairway ? shots.drivingPlayed : shots.played;
  const isFinal = shots.roundComplete;
  const standing = String(observed);
  const r = ob.round ? `R${ob.round} ` : "";

  if (side === "over") {
    if (observed > line)
      return { bet: ob, status: "won", reason: `${r}${observed} ${unit} > ${line}`, observedValue: observed, standing, standingNote: unit };
    if (isFinal)
      return { bet: ob, status: "lost", reason: `${r}final ${observed} ${unit} ≤ ${line}`, observedValue: observed, standing, standingNote: unit };
    return { bet: ob, status: "live", reason: `${r}${observed} ${unit} thru ${played}`, observedValue: observed, standing, standingNote: unit };
  }
  if (observed > line)
    return { bet: ob, status: "lost", reason: `${r}${observed} ${unit} over ${line}`, observedValue: observed, standing, standingNote: unit };
  if (isFinal)
    return { bet: ob, status: "won", reason: `${r}final ${observed} ${unit} < ${line}`, observedValue: observed, standing, standingNote: unit };
  return { bet: ob, status: "live", reason: `${r}${observed} ${unit} thru ${played}`, observedValue: observed, standing, standingNote: unit };
}
