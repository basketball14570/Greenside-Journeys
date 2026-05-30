// Live PGA leaderboard via ESPN's public scoreboard API. No key required;
// the endpoint is the same one ESPN's own scoreboard.com uses. CORS is
// open for browsers — we call it client-side.

import { holeParStrict } from "@/lib/data/course-pars";

const ENDPOINT =
  "https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard";

export type HoleScore = {
  hole: number;          // 1..18
  strokes: number | null; // null = not played
  par: number | null;     // best-effort; null if ESPN omitted
};

export type RoundLine = {
  period: number;          // 1..4
  strokes: number | null;  // total strokes for the round
  toPar: string | null;    // pre-formatted "E", "-3", "+2"
  thru: number | null;     // holes completed (1-18, null = not started)
  complete: boolean;
  holes: HoleScore[];      // hole-by-hole data when ESPN exposes it
};

export type LeaderboardPlayer = {
  id: string;
  name: string;
  shortName: string;
  countryFlag: string;
  // Player identity assets from ESPN: circular headshot URL and the flag
  // image URL. Null when ESPN doesn't carry them; the UI falls back to
  // initials / no flag.
  headshot: string | null;
  flagHref: string | null;
  posDisplay: string;        // "T3" / "12" / "CUT"
  posNum: number | null;
  totalToPar: string | null; // "+1" / "E" / "-7" — overall to par
  totalScoreNum: number | null;
  isCut: boolean;
  currentRound: number;      // 1..4 derived from event status
  todayLine: RoundLine | null;
  rounds: RoundLine[];
  teeTime: string | null;
  statusText: string;
};

export type LeaderboardSnapshot = {
  event: {
    id: string;
    name: string;
    shortName: string;
    state: "pre" | "in" | "post" | string;
    statusDetail: string;
    period: number;            // current active round
    course: string | null;
    coursePar: number | null;
    holePars: number[];        // per-hole par, index 0 = hole 1 ([] if absent)
    location: string | null;
  } | null;
  players: LeaderboardPlayer[];
  fetchedAt: string;
};

function norm(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function fmtToPar(n: number | null | undefined): string | null {
  if (n === null || n === undefined || Number.isNaN(n)) return null;
  if (n === 0) return "E";
  return n > 0 ? `+${n}` : `${n}`;
}

function parseScore(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return v;
  const s = String(v).trim();
  if (s === "E" || s === "e") return 0;
  const n = Number(s.replace("+", ""));
  return Number.isNaN(n) ? null : n;
}

function coursePar(event: any): number | null {
  const comp = event?.competitions?.[0];
  const candidates = [
    comp?.course?.par,
    comp?.par,
    Array.isArray(comp?.courses) ? comp.courses[0]?.totalPar : undefined,
    Array.isArray(comp?.courses) ? comp.courses[0]?.par : undefined,
    event?.course?.par,
  ];
  for (const v of candidates) {
    const n = Number(v);
    if (!Number.isNaN(n) && n > 50 && n < 80) return n;
  }
  const holes = comp?.course?.holes || comp?.courses?.[0]?.holes;
  if (Array.isArray(holes) && holes.length === 18) {
    const sum = holes.reduce((a: number, h: any) => a + (Number(h.par) || 0), 0);
    if (sum > 50 && sum < 80) return sum;
  }
  return null;
}

// Per-hole par for the course (index 0 = hole 1). Static for the event, so
// it backfills hole pars that ESPN omits from individual player linescores.
function extractHolePars(courseRec: any): number[] {
  const holes = courseRec?.holes;
  if (!Array.isArray(holes)) return [];
  const pars: number[] = [];
  holes.forEach((h: any, idx: number) => {
    const num = Number(h?.number ?? h?.period ?? idx + 1);
    const par = Number(h?.par);
    if (num >= 1 && num <= 18 && Number.isFinite(par)) pars[num - 1] = par;
  });
  return pars;
}

function pickEvent(json: any) {
  const events: any[] = json?.events || [];
  if (!events.length) return null;
  const active = events.find((e) => e?.status?.type?.state === "in");
  if (active) return active;
  const pre = events.find((e) => e?.status?.type?.state === "pre");
  return pre || events[0];
}

function normalizeRound(l: any): RoundLine {
  const rawHoles = Array.isArray(l.linescores) ? l.linescores : [];
  const strokesRaw = Number(l.value);
  const strokes = Number.isFinite(strokesRaw) && strokesRaw > 0 ? strokesRaw : null;
  const holesPlayed = rawHoles.filter(
    (h: any) => h?.value !== null && h?.value !== undefined,
  ).length;
  const complete = rawHoles.length >= 18 && strokes !== null;
  // Don't surface a toPar string until the player has actually played holes.
  const hasPlay = strokes !== null || holesPlayed > 0;
  // Capture per-hole detail when ESPN exposes it. `period` here is the
  // hole number (1..18) on each linescore entry inside a round.
  const holes: HoleScore[] = rawHoles.map((h: any, idx: number) => {
    const v = h?.value;
    const par = h?.par ?? h?.parDisplay;
    return {
      hole: Number(h?.period) || idx + 1,
      strokes:
        v === null || v === undefined ? null : Number.isFinite(Number(v)) ? Number(v) : null,
      par: par !== null && par !== undefined && Number.isFinite(Number(par)) ? Number(par) : null,
    };
  });
  return {
    period: Number(l.period) || 0,
    strokes,
    toPar: hasPlay && typeof l.displayValue === "string" ? l.displayValue : null,
    thru: complete ? 18 : holesPlayed > 0 ? holesPlayed : null,
    complete,
    holes,
  };
}

function normalizePlayer(c: any, eventRound: number, par: number | null): LeaderboardPlayer {
  const ath = c.athlete || {};
  const linescores: RoundLine[] = (c.linescores || []).map(normalizeRound);
  const totalToParRaw = parseScore(c.score);
  const status = c.status?.type?.description || c.status?.description || "";
  const posDisplay = c.status?.position?.displayName || "";
  // ESPN exposes the cut/WD/DQ state in two places that don't always agree:
  // the status text and the position display. Trust either signal — the
  // regex catches "Missed Cut", "Cut", "WD/Withdrawn", "DQ", "Did Not Start",
  // "Disqualified"; the position string catches the bare "CUT" / "WD" / "DQ"
  // / "MC" labels ESPN shows on the leaderboard after the cut applies.
  const isCutStatus = /cut|wd|withdrawn|dq|did not|disqualif/i.test(status);
  const isCutPos = /^(cut|mc|wd|dq)$/i.test(posDisplay.trim());
  const isCut = isCutStatus || isCutPos;
  // Today = the linescore for the event's current round, strictly.
  // No fallback to prior rounds — if the player hasn't teed off today,
  // todayLine stays null and the UI shows "—" plus the tee time.
  const todayLine =
    linescores.find((l) => l.period === eventRound) ?? null;

  // Patch toPar if ESPN didn't pre-format it
  if (todayLine && todayLine.toPar === null && todayLine.strokes !== null && par) {
    todayLine.toPar = fmtToPar(todayLine.strokes - par);
  }

  const athId = ath.id || c.id;
  // ESPN ships a headshot href for most tour players; fall back to the
  // golf headshot CDN pattern by athlete id when it's absent.
  const headshot: string | null =
    ath.headshot?.href ||
    (athId ? `https://a.espncdn.com/i/headshots/golf/players/full/${athId}.png` : null);

  return {
    id: athId,
    name: ath.displayName || ath.fullName || ath.shortName || "Unknown",
    shortName: ath.shortName || "",
    countryFlag: ath.flag?.alt || ath.flag?.href || "",
    headshot,
    flagHref: ath.flag?.href || null,
    posDisplay,
    posNum: c.status?.position?.id ? Number(c.status.position.id) : null,
    totalToPar:
      typeof c.score === "string" && (c.score === "E" || /^[+-]?\d+$/.test(c.score))
        ? c.score
        : fmtToPar(totalToParRaw),
    totalScoreNum: totalToParRaw,
    isCut,
    currentRound: eventRound,
    todayLine,
    rounds: linescores,
    // ESPN sometimes returns the tee time on different paths depending on
    // the event state (pre-round vs mid-round). Walk the most common
    // locations so we don't drop the data once a round has started.
    teeTime:
      c.status?.teeTime ||
      c.status?.startTime ||
      c.status?.type?.teeTime ||
      c.startDate ||
      c.startTime ||
      null,
    statusText: status,
  };
}

function addComputedPositions(players: LeaderboardPlayer[]): LeaderboardPlayer[] {
  // ESPN's own posDisplay is usually populated, but it can drift mid-update.
  // We re-rank by total to par as a fallback.
  const active = players
    .filter((p) => !p.isCut && p.totalScoreNum !== null)
    .sort(
      (a, b) =>
        (a.totalScoreNum ?? 0) - (b.totalScoreNum ?? 0) ||
        a.name.localeCompare(b.name),
    );
  let prevScore: number | null = null;
  let prevRank = 0;
  active.forEach((p, idx) => {
    const rank = p.totalScoreNum === prevScore ? prevRank : idx + 1;
    prevScore = p.totalScoreNum;
    prevRank = rank;
    const tied = active.some(
      (q) => q !== p && q.totalScoreNum === p.totalScoreNum,
    );
    if (!p.posDisplay) p.posDisplay = `${tied ? "T" : ""}${rank}`;
    if (p.posNum === null) p.posNum = rank;
  });
  players
    .filter((p) => p.isCut)
    .forEach((p) => {
      if (!p.posDisplay) p.posDisplay = "CUT";
    });
  return players;
}

export async function fetchLeaderboard(signal?: AbortSignal): Promise<LeaderboardSnapshot> {
  const res = await fetch(`${ENDPOINT}?_=${Date.now()}`, { cache: "no-store", signal });
  if (!res.ok) throw new Error(`ESPN ${res.status}`);
  const json = await res.json();
  const snap = buildSnapshot(json);
  // The scoreboard endpoint drops teeTime once a round goes live, but the
  // summary endpoint keeps the pairings/tee-time data. If most players are
  // missing a teeTime we still have the active round in flight, so fetch
  // summary in parallel and backfill.
  if (snap.event && needsTeeTimeBackfill(snap.players)) {
    try {
      await backfillTeeTimes(snap, signal);
    } catch {
      // Soft fail — main snapshot is still valid, just without tee times.
    }
  }
  return snap;
}

function needsTeeTimeBackfill(players: LeaderboardPlayer[]): boolean {
  if (players.length === 0) return false;
  const missing = players.filter((p) => !p.teeTime && !p.isCut).length;
  return missing / players.length > 0.5;
}

async function backfillTeeTimes(
  snap: LeaderboardSnapshot,
  signal?: AbortSignal,
): Promise<void> {
  // Client-only: hits our own /api/leaderboard/tee-times route which
  // proxies DataGolf's in-play feed (DataGolf keeps tee times populated
  // through the live round, unlike ESPN's scoreboard endpoint which nulls
  // them out as soon as the round goes "in").
  if (typeof window === "undefined") return;

  const res = await fetch(`/api/leaderboard/tee-times?_=${Date.now()}`, {
    cache: "no-store",
    signal,
  });
  if (!res.ok) return;
  const json: { byName?: Record<string, string>; source?: string; count?: number } =
    await res.json();
  const byName = json.byName ?? {};

  const norm = (s: string) =>
    s.toLowerCase().normalize("NFKD").replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();

  for (const p of snap.players) {
    if (p.teeTime) continue;
    const t = byName[norm(p.name)];
    if (t) p.teeTime = t;
  }
}

function buildSnapshot(json: any): LeaderboardSnapshot {
  const event = pickEvent(json);
  if (!event) {
    return {
      event: null,
      players: [],
      fetchedAt: new Date().toISOString(),
    };
  }
  const comp = event?.competitions?.[0];
  const par = coursePar(event);
  const period = Number(
    comp?.status?.period || comp?.status?.type?.period || event?.status?.period || 1,
  );
  const competitors: any[] = comp?.competitors || [];
  const players = competitors.map((c: any) => normalizePlayer(c, period, par));
  addComputedPositions(players);

  const courseRec = Array.isArray(comp?.courses) ? comp.courses[0] : comp?.course;
  return {
    event: {
      id: event.id,
      name: event.name,
      shortName: event.shortName || event.name,
      state: event.status?.type?.state || "pre",
      statusDetail:
        event.status?.type?.detail || event.status?.type?.description || "",
      period,
      course: courseRec?.name || null,
      coursePar: par,
      holePars: extractHolePars(courseRec),
      location:
        comp?.venue?.fullName ||
        comp?.venue?.address?.city ||
        event?.location ||
        null,
    },
    players,
    fetchedAt: new Date().toISOString(),
  };
}

// Player tracking — pick subset out of a snapshot.
//
// Each TrackedPlayer can list aliases to disambiguate (e.g. force "Nicolai
// Hojgaard" to NOT match "Rasmus Hojgaard"). `excludes` rules out collisions
// on lastname-only fallback matching.
// Hole-by-hole scoring stats derived from RoundLine.holes. Course
// hole-pars come from lib/data/course-pars.ts since ESPN's free feed
// usually omits per-hole par. Returns null when no holes have been
// played yet.

export type RoundStats = {
  played: number;          // holes played
  strokes: number;
  birdiesOrBetter: number; // birdie + eagle + albatross
  birdies: number;         // exactly -1
  eagles: number;          // -2 or better
  pars: number;
  bogeys: number;
  doublesOrWorse: number;
};

export function roundStats(
  round: RoundLine | null | undefined,
  courseName: string | null | undefined,
  holePars?: number[],
): RoundStats | null {
  if (!round || round.holes.length === 0) return null;

  let played = 0;
  let strokes = 0;
  let birdies = 0;
  let eagles = 0;
  let pars = 0;
  let bogeys = 0;
  let doublesOrWorse = 0;

  for (const h of round.holes) {
    if (h.strokes === null || h.strokes <= 0) continue;
    played++;
    strokes += h.strokes;
    // Par precedence: ESPN's per-hole par on the linescore (rare and
    // authoritative when present — captures tournament-day par changes) →
    // the curated scorecard map → ESPN's event-level holePars from the
    // course record → 4. The curated map wins over the snapshot map
    // because ESPN sometimes ships incomplete `courseRec.holes` (all 4s
    // or missing entries), which would otherwise miscount any par on a
    // par-3 as a birdie. Mirrors lib/bets/shot-props.ts.
    const par = h.par ?? holeParStrict(courseName, h.hole) ?? holePars?.[h.hole - 1] ?? 4;
    const diff = h.strokes - par;
    if (diff <= -2) eagles++;
    else if (diff === -1) birdies++;
    else if (diff === 0) pars++;
    else if (diff === 1) bogeys++;
    else doublesOrWorse++;
  }

  return {
    played,
    strokes,
    birdiesOrBetter: birdies + eagles,
    birdies,
    eagles,
    pars,
    bogeys,
    doublesOrWorse,
  };
}

export type TrackedPlayer = {
  key: string;             // stable id for React keys
  display: string;         // what to show in the UI
  aliases: string[];       // accepted name spellings (full names ideally)
  excludes?: string[];     // names that must NOT match — disambiguation
};

export function findTrackedPlayer(
  snapshot: LeaderboardSnapshot,
  tracked: TrackedPlayer,
): LeaderboardPlayer | null {
  const allow = tracked.aliases.map(norm);
  const deny = (tracked.excludes || []).map(norm);
  // 1) Exact full-name match against any alias
  for (const p of snapshot.players) {
    const n = norm(p.name);
    if (deny.includes(n)) continue;
    if (allow.includes(n)) return p;
  }
  // 2) Contains match — but only if ALL deny terms fail
  for (const p of snapshot.players) {
    const n = norm(p.name);
    if (deny.some((d) => n.includes(d))) continue;
    if (allow.some((a) => n.includes(a) || a.includes(n))) return p;
  }
  return null;
}
