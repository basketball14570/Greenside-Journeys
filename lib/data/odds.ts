// The Odds API client — sportsbook odds for golf markets.
// Docs: https://the-odds-api.com/liveapi/guides/v4/

const BASE = "https://api.the-odds-api.com/v4";

function key() {
  const k = process.env.THE_ODDS_API_KEY;
  if (!k) throw new Error("THE_ODDS_API_KEY not set");
  return k;
}

export type GolfOutright = {
  bookmaker: string;
  player: string;
  market: "outright" | "top_5" | "top_10" | "top_20";
  americanOdds: number;
  lastUpdate: string;
};

export async function getGolfOutrights(eventKey: string): Promise<GolfOutright[]> {
  const url = `${BASE}/sports/golf_pga_championship_winner/odds?regions=us&markets=outrights&oddsFormat=american&apiKey=${key()}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Odds API failed: ${res.status}`);
  const json = await res.json();
  // Flattens the nested books/markets into one row per (book, player, market).
  // Real implementation will branch by `eventKey` to hit the right sport_key.
  const rows: GolfOutright[] = [];
  for (const event of json) {
    for (const book of event.bookmakers ?? []) {
      for (const m of book.markets ?? []) {
        for (const o of m.outcomes ?? []) {
          rows.push({
            bookmaker: book.key,
            player: o.name,
            market: "outright",
            americanOdds: o.price,
            lastUpdate: book.last_update,
          });
        }
      }
    }
  }
  return rows;
}
