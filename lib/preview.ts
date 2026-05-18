// Tournament preview generator — composes a structured preview from the
// course profile, the active condition snapshot, the player pool, and any
// historical bet exposure. Pure compute, no IO.

import { COURSE_PROFILES, type CourseProfile } from "@/lib/demo-course-profiles";
import { COURSES, type CourseSnapshot } from "@/lib/demo-courses";
import { PLAYERS, PLAYER_LIST, type PlayerProfile } from "@/lib/demo-players";
import {
  getForecast,
  expectedWindDragForTournament,
  type Forecast,
} from "@/lib/weather/forecast";

export type FitPlayer = {
  player: PlayerProfile;
  archetypeFit: number;       // sg/round at the matching archetype, or 0
  windAdjusted: number;       // archetype fit minus expected wind penalty
  rationale: string;
};

export type AngleNote = {
  kind: "wave" | "wind" | "history" | "design";
  title: string;
  body: string;
};

export type TournamentPreview = {
  slug: string;
  tournament: string;
  course: CourseProfile;
  snapshot: CourseSnapshot;
  headline: string;
  weather: string;
  fitPlayers: FitPlayer[];
  fades: FitPlayer[];
  angles: AngleNote[];
  hedgeCandidates: { player: string; rationale: string }[];
  historyNotes: string[];
  forecast: Forecast | null;
};

function expectedWindPenalty(
  player: PlayerProfile,
  snapshot: CourseSnapshot,
  forecast: Forecast | null,
) {
  // Use the live forecast's 24h average if available — otherwise fall back
  // to the snapshot's instantaneous wind. This keeps the preview rendering
  // deterministically even when the upstream feed is offline.
  if (forecast) {
    return expectedWindDragForTournament(player.windSensitivity, forecast);
  }
  const overBaseline = Math.max(0, snapshot.wind - 5);
  return +(player.windSensitivity * (overBaseline / 10) * 4).toFixed(2);
}

function rankFit(
  course: CourseProfile,
  snapshot: CourseSnapshot,
  forecast: Forecast | null,
): FitPlayer[] {
  return PLAYER_LIST.map((player) => {
    const match = player.fit.find((f) => f.archetype === course.archetype);
    const archetypeFit = match?.sgPerRound ?? 0;
    const penalty = expectedWindPenalty(player, snapshot, forecast);
    const windAdjusted = +(archetypeFit * 4 - penalty).toFixed(2);
    const rationale =
      archetypeFit > 0
        ? `${match!.rounds} rounds at ${course.archetype}, ${match!.sgPerRound.toFixed(2)} sg/rd · wind drag −${penalty.toFixed(2)}u/4rds`
        : `No prior ${course.archetype} reps logged · wind drag −${penalty.toFixed(2)}u/4rds`;
    return { player, archetypeFit, windAdjusted, rationale };
  }).sort((a, b) => b.windAdjusted - a.windAdjusted);
}

function buildAngles(course: CourseProfile, snapshot: CourseSnapshot): AngleNote[] {
  const out: AngleNote[] = [];
  const waveGap = Math.abs(snapshot.amSg - snapshot.pmSg);
  if (waveGap >= 0.5) {
    const better = snapshot.amSg > snapshot.pmSg ? "AM" : "PM";
    out.push({
      kind: "wave",
      title: `${better}-wave bias of ${waveGap.toFixed(1)} strokes`,
      body: `Scoring split favors the ${better} wave by ${waveGap.toFixed(
        1,
      )} strokes — meaningful enough to skew 18-hole and tournament leaders. Match-betting against opposite-wave players is a cleaner expression than outrights.`,
    });
  }
  if (snapshot.wind >= 14) {
    out.push({
      kind: "wind",
      title: `${snapshot.wind} mph sustained, gusts to ${snapshot.gust}`,
      body: `Strong wind compresses the field — favor coastal/links specialists over bombers without a wind résumé. Approach-game leans gain edge over driving-distance leans this week.`,
    });
  } else if (snapshot.wind <= 8 && snapshot.precipChance < 30) {
    out.push({
      kind: "wind",
      title: "Soft conditions, scoring open",
      body: `Calm wind and dry forecast lets the long, accurate bombers play their own game. Outright prices on top-15 OWGR are sharper than usual; props on birdies / 3+ birdie holes have positive expectation.`,
    });
  }
  const hardestHole = [...course.holes].sort(
    (a, b) => b.scoringAvg - a.scoringAvg,
  )[0];
  const easiestHole = [...course.holes].sort(
    (a, b) => a.scoringAvg - b.scoringAvg,
  )[0];
  out.push({
    kind: "design",
    title: `Pivot holes: #${hardestHole.hole} and #${easiestHole.hole}`,
    body: `#${hardestHole.hole} (${hardestHole.par}, ${hardestHole.yards}y, ${hardestHole.windExposure}) plays ${hardestHole.scoringAvg >= 0 ? "+" : ""}${hardestHole.scoringAvg.toFixed(2)} vs par. #${easiestHole.hole} (${easiestHole.par}, ${easiestHole.yards}y) plays ${easiestHole.scoringAvg.toFixed(2)} — birdie-or-better prop targets concentrate here.`,
  });
  const lastYear = course.history[0];
  if (lastYear) {
    out.push({
      kind: "history",
      title: `Last year: ${lastYear.fieldAvgScore.toFixed(2)} field avg, cut at ${lastYear.cutLine}`,
      body: `Five-year wind average is ${(
        course.history.reduce((s, y) => s + y.windAvgMph, 0) /
        course.history.length
      ).toFixed(1)} mph; this week is ${snapshot.wind} mph. Adjust the typical winning total accordingly.`,
    });
  }
  return out;
}

function buildHedgeCandidates(fit: FitPlayer[]): TournamentPreview["hedgeCandidates"] {
  return fit
    .filter((f) => f.player.exposure.openBets.some((b) => b.market.toLowerCase().includes("top") || b.market.toLowerCase().includes("win")))
    .slice(0, 3)
    .map((f) => {
      const bet = f.player.exposure.openBets.find((b) =>
        b.market.toLowerCase().includes("top") || b.market.toLowerCase().includes("win"),
      )!;
      return {
        player: f.player.name,
        rationale: `Open ${bet.market} at ${bet.line} (${bet.book}, ${bet.stake}u). Cross-book live miss-the-cut or outside-top-N hedges available — see Hedge Lab.`,
      };
    });
}

function buildHistoryNotes(course: CourseProfile, snapshot: CourseSnapshot): string[] {
  const notes: string[] = [];
  if (course.waveSplit.sampleRounds > 0) {
    const dir =
      course.waveSplit.amAvg < course.waveSplit.pmAvg ? "AM" : "PM";
    const diff = Math.abs(course.waveSplit.amAvg - course.waveSplit.pmAvg);
    notes.push(
      `Historical wave split: ${dir} wave averages ${diff.toFixed(2)} better across ${course.waveSplit.sampleRounds} rounds.`,
    );
  }
  const winds = course.history.map((h) => h.windAvgMph);
  const minW = Math.min(...winds);
  const maxW = Math.max(...winds);
  notes.push(
    `Wind history (5 yr): ${minW}–${maxW} mph. This week's ${snapshot.wind} sits ${
      snapshot.wind > maxW ? "above" : snapshot.wind < minW ? "below" : "inside"
    } that envelope.`,
  );
  notes.push(
    `Designer note: ${course.designer} (${course.established}). ${course.blurb}`,
  );
  return notes;
}

// Synchronous version — uses the snapshot's wind only, no live forecast.
// Called by SSG and any sync renderer (older AI tool handlers, etc.).
export function buildPreview(courseSlug: string): TournamentPreview | null {
  return buildPreviewWith(courseSlug, null);
}

// Async version — pulls the live forecast and feeds it into the model.
// Used by the AI tool handler and any client that wants a fresh read.
export async function buildPreviewAsync(
  courseSlug: string,
): Promise<TournamentPreview | null> {
  const course = COURSE_PROFILES[courseSlug];
  if (!course) return null;
  let forecast: Forecast | null = null;
  try {
    forecast = await getForecast(courseSlug);
  } catch {
    forecast = null;
  }
  return buildPreviewWith(courseSlug, forecast);
}

function buildPreviewWith(
  courseSlug: string,
  forecast: Forecast | null,
): TournamentPreview | null {
  const course = COURSE_PROFILES[courseSlug];
  const snapshot = COURSES.find((c) => c.id === courseSlug);
  if (!course || !snapshot) return null;
  const fit = rankFit(course, snapshot, forecast);
  const top = fit.slice(0, 5);
  const fades = [...fit].reverse().slice(0, 3);
  const liveWind = forecast?.next24.windMphAvg ?? snapshot.wind;
  const headline =
    liveWind >= 14
      ? `Wind-shaped week at ${snapshot.location.split(",")[0]} — coastal résumés rule.`
      : snapshot.precipChance >= 50
        ? `Soft, wet setup — receptive greens and short hitters benefit.`
        : `${course.archetype} test — fit matters more than form.`;
  const weather = forecast
    ? `Live forecast: ${forecast.next24.windMphAvg} mph avg wind (peak ${forecast.next24.windMphMax}, gusts ${forecast.next24.gustMphMax}), ${forecast.next24.precipChanceMax}% peak precip in next 24h. Source: ${forecast.source}.`
    : `${snapshot.wind} mph sustained from ${snapshot.windDirLabel}, gusting to ${snapshot.gust}. ${snapshot.temperatureF}°F, ${snapshot.humidity}% humidity, ${snapshot.precipChance}% precip.`;
  return {
    slug: courseSlug,
    tournament: snapshot.tournament,
    course,
    snapshot,
    headline,
    weather,
    fitPlayers: top,
    fades,
    angles: buildAngles(course, snapshot),
    hedgeCandidates: buildHedgeCandidates(fit),
    historyNotes: buildHistoryNotes(course, snapshot),
    forecast,
  };
}

export function listPreviewable() {
  return COURSES.filter((c) => COURSE_PROFILES[c.id]).map((c) => ({
    slug: c.id,
    tournament: c.tournament,
    course: c.name,
    location: c.location,
    status: c.status,
    round: c.round,
  }));
}

// Markdown rendering — useful for AI-polished output and the future "share preview" feature.
export function previewToMarkdown(p: TournamentPreview): string {
  const lines: string[] = [];
  lines.push(`# ${p.tournament} — Greenside Preview`);
  lines.push("");
  lines.push(`**${p.snapshot.name}** · ${p.snapshot.location} · ${p.course.archetype}`);
  lines.push(`*${p.headline}*`);
  lines.push("");
  lines.push(`## Conditions`);
  lines.push(p.weather);
  lines.push("");
  lines.push(`## Top fits`);
  p.fitPlayers.forEach((f, i) => {
    lines.push(`${i + 1}. **${f.player.name}** — ${f.rationale}`);
  });
  lines.push("");
  lines.push(`## Angles`);
  p.angles.forEach((a) => {
    lines.push(`- **${a.title}** — ${a.body}`);
  });
  if (p.hedgeCandidates.length) {
    lines.push("");
    lines.push(`## Open hedges to watch`);
    p.hedgeCandidates.forEach((h) => lines.push(`- **${h.player}** — ${h.rationale}`));
  }
  lines.push("");
  lines.push(`## History`);
  p.historyNotes.forEach((n) => lines.push(`- ${n}`));
  return lines.join("\n");
}
