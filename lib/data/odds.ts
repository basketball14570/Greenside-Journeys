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

// ── Fallback-aware layer ───────────────────────────────────────────
//
// Same approach as the DataGolf wrapper: when THE_ODDS_API_KEY isn't
// set, every helper returns null and the caller falls back to demo
// pricing. 5-minute in-memory cache prevents hammering the upstream.

const ODDS_CACHE = new Map<string, { at: number; data: unknown }>();
const ODDS_TTL_MS = 5 * 60 * 1000;

export function oddsApiEnabled(): boolean {
  return !!process.env.THE_ODDS_API_KEY;
}

async function safeOddsFetch<T>(url: string): Promise<T | null> {
  if (!oddsApiEnabled()) return null;
  const cached = ODDS_CACHE.get(url);
  if (cached && Date.now() - cached.at < ODDS_TTL_MS) return cached.data as T;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as T;
    ODDS_CACHE.set(url, { at: Date.now(), data });
    return data;
  } catch {
    return null;
  }
}

export type HedgeQuote = {
  book: string;
  americanOdds: number;
  label: string;
  source: "the-odds-api" | "demo";
  lastUpdate: string | null;
};

// Best opposite-side prices for the named player across all books.
// Returns null when the key is absent or the upstream is empty.
export async function getPlayerHedgeQuotes(
  playerName: string,
): Promise<HedgeQuote[] | null> {
  if (!oddsApiEnabled()) return null;
  // Sport-key discovery: try each major championship's outright market in
  // order. The Odds API only exposes a sport_key when an event is active,
  // so we walk the candidates and stop on the first hit.
  const candidates = [
    "golf_pga_championship_winner",
    "golf_masters_tournament_winner",
    "golf_us_open_winner",
    "golf_the_open_championship_winner",
  ];
  const player = playerName.toLowerCase();
  for (const sportKey of candidates) {
    const url = `${BASE}/sports/${sportKey}/odds?regions=us&markets=outrights&oddsFormat=american&apiKey=${process.env.THE_ODDS_API_KEY}`;
    const events = await safeOddsFetch<any[]>(url);
    if (!events?.length) continue;
    const matches: HedgeQuote[] = [];
    for (const event of events) {
      for (const book of event.bookmakers ?? []) {
        for (const m of book.markets ?? []) {
          for (const o of m.outcomes ?? []) {
            if (typeof o.name !== "string") continue;
            if (!o.name.toLowerCase().includes(player)) continue;
            matches.push({
              book: bookCode(book.key),
              americanOdds: o.price,
              label: `Field vs ${o.name.split(" ").pop()}`,
              source: "the-odds-api",
              lastUpdate: book.last_update ?? null,
            });
          }
        }
      }
    }
    if (matches.length) return matches.slice(0, 8);
  }
  return null;
}

function bookCode(key: string): string {
  const map: Record<string, string> = {
    draftkings: "DK",
    fanduel: "FD",
    betmgm: "MGM",
    williamhill_us: "WH",
    caesars: "CZR",
    pointsbetus: "PB",
    barstool: "BSY",
    foxbet: "FOX",
    espnbet: "ESPN",
    hardrockbet: "HR",
    betrivers: "BetRivers",
    pinnacle: "Pinnacle",
    fanatics: "Fanatics",
  };
  return map[key] ?? key.toUpperCase().slice(0, 3);
}

// ── Odds matrix surface (for /dashboard/odds) ───────────────────────
//
// Returns a player-by-book matrix for the named market. Falls back to
// demo when the key isn't set so the comparison page is always
// renderable. We collapse The Odds API's nested books → markets →
// outcomes shape into one row per player.

import type {
  BookCode as MatrixBookCode,
  OddsMarket,
  OddsMatrix,
  OddsRow,
} from "./odds-types";
import { buildDemoOddsMatrix } from "./demo-odds";

const MARKET_TO_SPORTKEY: Record<OddsMarket, string[]> = {
  // The Odds API exposes outright winners per championship. We walk the
  // candidates in order — only one will be active mid-season.
  winner: [
    "golf_pga_championship_winner",
    "golf_masters_tournament_winner",
    "golf_us_open_winner",
    "golf_the_open_championship_winner",
  ],
  top_5: [],
  top_10: [],
  top_20: [],
  top_40: [],
};

export async function getOddsMatrix(market: OddsMarket = "winner"): Promise<OddsMatrix> {
  if (!oddsApiEnabled()) return buildDemoOddsMatrix(market);

  const sportKeys = MARKET_TO_SPORTKEY[market] ?? [];
  for (const sportKey of sportKeys) {
    const url = `${BASE}/sports/${sportKey}/odds?regions=us&markets=outrights&oddsFormat=american&apiKey=${process.env.THE_ODDS_API_KEY}`;
    const events = await safeOddsFetch<any[]>(url);
    if (!events?.length) continue;
    const rows = collapseToRows(events, market);
    if (rows.length) {
      return {
        event: events[0].sport_title ?? "PGA Tour",
        market,
        lastUpdate: rows[0]?.bestBook ? new Date().toISOString() : null,
        source: "the-odds-api",
        rows,
      };
    }
  }
  // Live key set but no active event matched — surface demo with a
  // source label so the UI can show the right pre-tournament message.
  return buildDemoOddsMatrix(market);
}

function collapseToRows(events: any[], market: OddsMarket): OddsRow[] {
  // player name → { book → odds }
  const matrix = new Map<string, Partial<Record<MatrixBookCode, number>>>();
  for (const event of events) {
    for (const book of event.bookmakers ?? []) {
      const code = bookCode(book.key) as MatrixBookCode;
      for (const m of book.markets ?? []) {
        for (const o of m.outcomes ?? []) {
          if (typeof o.name !== "string" || typeof o.price !== "number") continue;
          const row = matrix.get(o.name) ?? {};
          row[code] = o.price;
          matrix.set(o.name, row);
        }
      }
    }
  }
  const out: OddsRow[] = [];
  for (const [player, books] of matrix) {
    const entries = Object.entries(books) as Array<[MatrixBookCode, number]>;
    if (entries.length < 2) continue; // need ≥2 books to compare
    const best = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
    const consensus = medianOdds(entries.map((e) => e[1]));
    const edgeCents = best[1] > 0 ? best[1] - consensus : consensus - best[1];
    out.push({
      player,
      market,
      books,
      bestBook: best[0],
      bestOdds: best[1],
      consensusOdds: consensus,
      edgeCents,
    });
  }
  // Sort by best odds — favorites first.
  out.sort((a, b) => oddsToImpliedProb(b.bestOdds) - oddsToImpliedProb(a.bestOdds));
  return out;
}

function medianOdds(xs: number[]): number {
  const sorted = [...xs].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : Math.round((sorted[m - 1] + sorted[m]) / 2);
}

// American → implied probability (0..1), for sorting "favorites first".
function oddsToImpliedProb(american: number): number {
  if (american > 0) return 100 / (american + 100);
  return Math.abs(american) / (Math.abs(american) + 100);
}
