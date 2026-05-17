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
