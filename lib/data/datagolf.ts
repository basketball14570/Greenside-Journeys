// DataGolf API client.
// Docs: https://datagolf.com/api-access
// We use DataGolf for: live tournament leaderboard, player strokes-gained-by-course-type,
// historical wave splits, and pre-tournament projections.

const BASE = "https://feeds.datagolf.com";

function key() {
  const k = process.env.DATAGOLF_API_KEY;
  if (!k) throw new Error("DATAGOLF_API_KEY not set");
  return k;
}

export type DGLeaderboardRow = {
  player_name: string;
  position: number | null;
  current_score: number | null;
  thru: number | null;
  round: number;
  // Wave is derived from tee time; DataGolf exposes tee_time on the live endpoint.
  tee_time: string | null;
};

export async function getLiveLeaderboard(tourCode = "pga"): Promise<DGLeaderboardRow[]> {
  const url = `${BASE}/preds/in-play?tour=${tourCode}&file_format=json&key=${key()}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`DataGolf live failed: ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

// Live cut projection from the same /preds/in-play feed: each player's
// make-cut probability plus the projected cut line. The in-play payload
// carries far more than getLiveLeaderboard exposes; this reads the cut
// fields. Probabilities are normalized to 0..1. When DataGolf doesn't
// surface an explicit cut line we derive one as the worst (highest) score
// still projected to make the cut.
export type DGCutPlayer = {
  name: string;
  makeCut: number; // 0..1
  scoreToPar: number | null;
  thru: number | null;
};
export type DGCutProjection = {
  cutLine: number | null; // to-par
  lastUpdate: string | null;
  round: number | null;
  players: DGCutPlayer[];
};

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace("+", ""));
  return Number.isFinite(n) ? n : null;
}
function normProb(v: unknown): number {
  const n = toNum(v);
  if (n === null) return 0;
  const p = n > 1 ? n / 100 : n; // accept 0..1 or 0..100
  return Math.min(1, Math.max(0, p));
}

export async function getLiveCutProjection(tourCode = "pga"): Promise<DGCutProjection> {
  const url = `${BASE}/preds/in-play?tour=${tourCode}&file_format=json&key=${key()}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`DataGolf in-play failed: ${res.status}`);
  const json = await res.json();
  const rows: Record<string, unknown>[] = json.data ?? [];
  const players: DGCutPlayer[] = rows.map((r) => ({
    name: String(r.player_name ?? ""),
    makeCut: normProb(r.make_cut),
    scoreToPar: toNum(r.current_score),
    thru: toNum(r.thru),
  }));

  const info = (json.info ?? {}) as Record<string, unknown>;
  let cutLine = toNum(info.cut_line ?? (json as Record<string, unknown>).cut_line);
  if (cutLine === null) {
    const projectedIn = players.filter((p) => p.makeCut >= 0.5 && p.scoreToPar !== null);
    cutLine = projectedIn.length
      ? Math.max(...projectedIn.map((p) => p.scoreToPar as number))
      : null;
  }
  return {
    cutLine,
    lastUpdate: (info.last_updated as string) ?? null,
    round: toNum(info.current_round),
    players,
  };
}

// Live tournament stats — refreshed every few minutes during play.
// Returns per-player accuracy (driving accuracy / FH%), GIR%, SG by
// category, distance, scrambling, and proximity. Used by the Live tab
// to surface shot-quality metrics next to each player on a ticket, and
// by the leaderboard rows to show why someone is moving.
//
// Defaults to "event_avg" so a single number per stat covers the entire
// tournament-to-date. Pass round=1..4 to scope to one round.
export type DGLiveStatRow = {
  player_name: string;
  dg_id: number | null;
  round: string | number;
  // Stats requested; missing ones come back as null. All percentages
  // are returned as 0..100 by DataGolf.
  sg_total?: number | null;
  sg_ott?: number | null;
  sg_app?: number | null;
  sg_arg?: number | null;
  sg_putt?: number | null;
  sg_t2g?: number | null;
  accuracy?: number | null;   // driving accuracy = fairways hit %
  gir?: number | null;        // greens in regulation %
  scrambling?: number | null; // up-and-down %
  distance?: number | null;   // avg driving distance (yds)
  prox_fw?: number | null;    // approach proximity from fairway (ft)
  prox_rgh?: number | null;   // approach proximity from rough (ft)
};

export type DGLiveStatsResponse = {
  event_name: string | null;
  last_updated: string | null;
  stat_round: string | null;
  // The actual array of rows.
  live_stats: DGLiveStatRow[];
};

const DEFAULT_LIVE_STATS = [
  "sg_total",
  "sg_ott",
  "sg_app",
  "sg_arg",
  "sg_putt",
  "accuracy",
  "gir",
  "scrambling",
  "distance",
] as const;

export async function getLiveTournamentStats(
  opts: {
    stats?: readonly string[];
    round?: "event_avg" | 1 | 2 | 3 | 4;
    tour?: "pga" | "euro" | "kft" | "alt";
    display?: "value" | "rank";
  } = {},
): Promise<DGLiveStatsResponse> {
  const stats = (opts.stats ?? DEFAULT_LIVE_STATS).join(",");
  const round = opts.round ?? "event_avg";
  const display = opts.display ?? "value";
  const tour = opts.tour ?? "pga";
  const url = `${BASE}/preds/live-tournament-stats?stats=${stats}&round=${round}&display=${display}&tour=${tour}&file_format=json&key=${key()}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`DataGolf live-stats failed: ${res.status}`);
  const json = await res.json();
  // accuracy / gir / scrambling come back as fractions (0..1). We keep
  // them raw here and let the UI turn them into "hit / attempts" counts
  // against holes played (e.g. 4/5 GIR), which is the tracking view.
  return {
    event_name: json.event_name ?? null,
    last_updated: json.last_updated ?? null,
    stat_round: json.stat_round ?? null,
    live_stats: json.live_stats ?? [],
  };
}

export type DGPlayerSkill = {
  player_name: string;
  // strokes-gained per round attributable to the dimension
  sg_total: number;
  sg_ott: number;
  sg_app: number;
  sg_arg: number;
  sg_putt: number;
  // wind sensitivity: strokes lost per round per mph above 10mph
  // (derived in our own model layer; DataGolf gives the raw rounds)
  wind_sensitivity?: number;
};

export async function getPlayerSkills(): Promise<DGPlayerSkill[]> {
  const url = `${BASE}/preds/skill-ratings?display=value&file_format=json&key=${key()}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`DataGolf skills failed: ${res.status}`);
  const json = await res.json();
  return json.players ?? [];
}

// Field + tee times. Populated by DataGolf once the tour releases the
// pairings — typically Tuesday afternoon for a Thursday tournament.
// `r1_teetime` / `r2_teetime` are returned as "HH:MM" local strings;
// `am_pm` flips between "am" and "pm" so we can bucket players into
// Wave 1 (Thu AM / Fri PM) or Wave 2 (Thu PM / Fri AM) without parsing
// the time string when we just need the wave.
export type DGFieldPlayer = {
  player_name: string;        // "Last, First"
  dg_id: number | null;
  am_pm?: "am" | "pm" | null;
  r1_teetime?: string | null;
  r2_teetime?: string | null;
  course?: string | null;     // multi-course events (Pebble, etc)
  start_hole?: number | null;
  status?: string | null;     // "WD", "DQ", "Out" when applicable
};

export type DGFieldUpdates = {
  event_name: string | null;
  current_round: number | null;
  last_updated: string | null;
  field: DGFieldPlayer[];
};

export async function getFieldUpdates(
  tour: "pga" | "euro" | "kft" | "alt" = "pga",
): Promise<DGFieldUpdates> {
  const url = `${BASE}/field-updates?tour=${tour}&file_format=json&key=${key()}`;
  // Cache 30 minutes — the field changes infrequently once published, but
  // late WDs do happen so we don't want stale data through the day.
  const res = await fetch(url, { next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`DataGolf field-updates failed: ${res.status}`);
  const json = await res.json();
  return {
    event_name: json.event_name ?? null,
    current_round: json.current_round ?? null,
    last_updated: json.last_updated ?? null,
    field: json.field ?? [],
  };
}

// ── Fallback-aware layer ─────────────────────────────────────────
//
// The functions below differ from the originals: they return null when
// DATAGOLF_API_KEY is missing or when the upstream errors, instead of
// throwing. This lets callers default to demo fixtures without
// special-casing the env check at every call site.

import { PLAYERS, type PlayerProfile, type RecentRound } from "@/lib/demo-players";

const SAFE_CACHE = new Map<string, { at: number; data: unknown }>();
const SAFE_TTL_MS = 10 * 60 * 1000;

export function datagolfEnabled(): boolean {
  return !!process.env.DATAGOLF_API_KEY;
}

async function safeFetch<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  if (!datagolfEnabled()) return null;
  const cacheKey = `${path}?${new URLSearchParams(params).toString()}`;
  const cached = SAFE_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.at < SAFE_TTL_MS) return cached.data as T;

  const search = new URLSearchParams({
    ...params,
    key: process.env.DATAGOLF_API_KEY!,
    file_format: "json",
  });
  try {
    const res = await fetch(`${BASE}${path}?${search}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as T;
    SAFE_CACHE.set(cacheKey, { at: Date.now(), data });
    return data;
  } catch {
    return null;
  }
}

type DgRankRow = {
  dg_id: number;
  player_name: string;
  primary_tour?: string;
  country?: string;
};

type DgRoundRecord = {
  event_name: string;
  year: number;
  player_name: string;
  fin_text?: string;
  round: number;
  sg_total?: number;
  sg_ott?: number;
  sg_app?: number;
  sg_arg?: number;
  sg_putt?: number;
  wind_mph?: number;
};

function nameToSlug(name: string): string {
  const [last, first] = name.split(",").map((s) => s.trim());
  const full = [first, last].filter(Boolean).join(" ");
  return full.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
}

function flipName(commaName: string): string {
  const [last, first] = commaName.split(",").map((s) => s.trim());
  return [first, last].filter(Boolean).join(" ");
}

function leastSquaresSlope(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return NaN;
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    num += dx * (ys[i] - meanY);
    den += dx * dx;
  }
  return den === 0 ? NaN : num / den;
}

// Single source of truth for "give me this player's full profile" —
// returns DataGolf-backed data when the key is set, otherwise the demo
// fixtures. Same PlayerProfile shape either way.
export async function getPlayerProfile(slug: string): Promise<PlayerProfile | null> {
  const demo = PLAYERS[slug];
  if (!datagolfEnabled()) return demo ?? null;

  const rankings = await safeFetch<{ rankings: DgRankRow[] }>("/preds/get-dg-rankings");
  const dgPlayer = rankings?.rankings.find((r) => nameToSlug(r.player_name) === slug);
  if (!dgPlayer) return demo ?? null;

  const history = await safeFetch<{ rounds: DgRoundRecord[] }>(
    "/historical-raw-data/rounds",
    { tour: "pga" },
  );
  const myRounds = (history?.rounds ?? [])
    .filter((r) => r.player_name === dgPlayer.player_name)
    .sort((a, b) => b.year - a.year)
    .slice(0, 12);
  if (!myRounds.length) return demo ?? null;

  const recent: RecentRound[] = myRounds.slice(0, 5).map((r) => ({
    event: r.event_name,
    date: `${r.year}`,
    finish: r.fin_text ?? "",
    sgTotal: r.sg_total ?? 0,
    sgOtt: r.sg_ott ?? 0,
    sgApp: r.sg_app ?? 0,
    sgArg: r.sg_arg ?? 0,
    sgPutt: r.sg_putt ?? 0,
    windMph: r.wind_mph ?? 0,
  }));

  const sgBaseline =
    myRounds.reduce((s, r) => s + (r.sg_total ?? 0), 0) / myRounds.length;

  // Re-fit the wind-sensitivity coefficient from the player's own rounds
  // when we have enough data. Otherwise keep the demo value.
  let windSensitivity = demo?.windSensitivity ?? 0.22;
  if (myRounds.length >= 6) {
    const xs = myRounds.map((r) => Math.max(0, (r.wind_mph ?? 0) - 5) / 10);
    const ys = myRounds.map((r) => sgBaseline - (r.sg_total ?? 0));
    const slope = leastSquaresSlope(xs, ys);
    if (Number.isFinite(slope) && slope >= -0.5 && slope <= 1.5) {
      windSensitivity = +slope.toFixed(2);
    }
  }

  return {
    ...demo,
    slug,
    name: flipName(dgPlayer.player_name),
    countryFlag: demo?.countryFlag ?? "",
    worldRank: demo?.worldRank ?? 0,
    age: demo?.age ?? 0,
    windSensitivity,
    windSensitivityRank: demo?.windSensitivityRank ?? "—",
    sgBaseline: +sgBaseline.toFixed(2),
    recent,
    fit: demo?.fit ?? [],
    exposure:
      demo?.exposure ?? {
        lifetimeBets: 0,
        lifetimeNetU: 0,
        winRate: 0,
        openBets: [],
      },
    edge: demo?.edge ?? "",
  };
}

// ─── Pre-tournament projections ─────────────────────────────
// DataGolf's /preds/pre-tournament endpoint returns probabilistic
// finish projections for the current week's PGA event: win, top 5,
// top 10, top 20, make cut. The site updates them as conditions /
// commits change so polling once an hour is generous.

export type DgProjection = {
  player_name: string;        // "Last, First"
  win: number;                // 0..1
  top5: number;
  top10: number;
  top20: number;
  makeCut: number;
};

type DgPreTournamentResponse = {
  baseline?: {
    win: number;
    top_5: number;
    top_10: number;
    top_20: number;
    make_cut: number;
    player_name: string;
  }[];
  baseline_history_fit?: DgPreTournamentResponse["baseline"];
};

// ─── Historical DFS archive ─────────────────────────────────
// Endpoint pattern: /historical-dfs-data/points?tour=pga&year=2026
//   &event_id=33&site=draftkings&file_format=json&key=...
// The user's plan (Scratch Plus) includes this archive.

export type DgDfsEventListEntry = {
  event_id: number;
  event_name: string;
  date?: string; // YYYY-MM-DD if exposed
};

export type DgDfsPlayerRow = {
  player_name: string;
  dg_id?: number;
  salary?: number;
  ownership?: number;     // percent, 0..100
  total_points?: number;  // DFS scoring total
  fin_text?: string;
};

export type DgDfsEventPoints = {
  event_name: string;
  date?: string;
  course?: string;
  players: DgDfsPlayerRow[];
};

// Lists every event DataGolf has DFS data for in the given year. We try
// /historical-dfs-data/event-list first since that's the conventional
// shape; if it 404s we'll surface the error so the caller can fall back
// to iterating known event_ids.
export async function listDfsEvents(
  year: number,
  tour = "pga",
): Promise<DgDfsEventListEntry[] | null> {
  if (!datagolfEnabled()) return null;
  const params = new URLSearchParams({
    tour,
    year: String(year),
    file_format: "json",
    key: process.env.DATAGOLF_API_KEY!,
  });
  try {
    const res = await fetch(
      `${BASE}/historical-dfs-data/event-list?${params}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const json = await res.json();
    return (json.event_list ?? json.events ?? json.data ?? json) as
      | DgDfsEventListEntry[]
      | null;
  } catch {
    return null;
  }
}

// Resolve a DataGolf event_id from an ISO start date (YYYY-MM-DD).
// Used by the projected-ownership endpoint when the local dfs_events
// mirror doesn't have a row yet for the current week — DataGolf
// publishes the schedule months out, so this works even before any
// archive backfill has run for the season.
export type DgScheduleEntry = {
  event_id: number;
  event_name: string;
  start_date: string;
  course?: string;
  tour?: string;
};

export async function getDgSchedule(
  tour: "pga" | "euro" | "kft" | "alt" = "pga",
): Promise<DgScheduleEntry[]> {
  const url = `${BASE}/get-schedule?tour=${tour}&file_format=json&key=${key()}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`DataGolf schedule failed: ${res.status}`);
  const json = await res.json();
  return (json.schedule ?? []) as DgScheduleEntry[];
}

export async function resolveDgEventIdByDate(
  startDateISO: string,
  tour: "pga" | "euro" | "kft" | "alt" = "pga",
): Promise<number | null> {
  try {
    const schedule = await getDgSchedule(tour);
    const ymd = startDateISO.slice(0, 10);
    const match = schedule.find((e) => e.start_date?.slice(0, 10) === ymd);
    return match?.event_id ?? null;
  } catch {
    return null;
  }
}

// Pulls salary + ownership + DFS points for one (tour, year, event_id, site).
export async function getDfsPointsForEvent(
  year: number,
  eventId: number,
  site: "draftkings" | "fanduel" | "yahoo" = "draftkings",
  tour = "pga",
): Promise<DgDfsEventPoints | null> {
  const { data } = await fetchDfsPointsWithStatus(year, eventId, site, tour);
  return data;
}

// Same as getDfsPointsForEvent but also returns the HTTP status so the
// caller can distinguish "no data" (200 + empty array) from "rate-limited"
// (429) from "auth error" (401/403). Used by the backfill sync to throttle
// and report failures.
export async function fetchDfsPointsWithStatus(
  year: number,
  eventId: number,
  site: "draftkings" | "fanduel" | "yahoo" = "draftkings",
  tour = "pga",
): Promise<{ data: DgDfsEventPoints | null; status: number }> {
  if (!datagolfEnabled()) return { data: null, status: 503 };
  const params = new URLSearchParams({
    tour,
    year: String(year),
    event_id: String(eventId),
    site,
    file_format: "json",
    key: process.env.DATAGOLF_API_KEY!,
  });
  try {
    const res = await fetch(
      `${BASE}/historical-dfs-data/points?${params}`,
      { cache: "no-store" },
    );
    if (!res.ok) return { data: null, status: res.status };
    const json = await res.json();
    const players: DgDfsPlayerRow[] =
      json.players ?? json.scores ?? json.data ?? [];
    return {
      data: {
        event_name: json.event_name ?? json.event ?? "",
        date: json.date ?? json.event_date,
        course: json.course ?? json.course_name,
        players,
      },
      status: res.status,
    };
  } catch {
    return { data: null, status: 0 };
  }
}

export async function getPreTournamentProjections(
  tour = "pga",
): Promise<DgProjection[] | null> {
  const data = await safeFetch<DgPreTournamentResponse>("/preds/pre-tournament", {
    tour,
    odds_format: "percent",
  });
  if (!data) return null;
  // Prefer the baseline + history fit model when present (better at
  // course-specific weighting), else fall back to baseline.
  const rows = data.baseline_history_fit ?? data.baseline ?? [];
  return rows
    .map((r) => ({
      player_name: flipName(r.player_name),
      win: r.win,
      top5: r.top_5,
      top10: r.top_10,
      top20: r.top_20,
      makeCut: r.make_cut,
    }))
    .sort((a, b) => b.win - a.win);
}
