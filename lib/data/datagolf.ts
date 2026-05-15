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
