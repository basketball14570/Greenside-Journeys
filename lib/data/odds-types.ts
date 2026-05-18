// Shared types for the odds-matrix surface — kept in their own file so
// both the demo builder and the live API client can import without
// pulling each other's runtime code along.

export type BookCode =
  | "DK"          // DraftKings
  | "FD"          // FanDuel
  | "MGM"         // BetMGM
  | "CZR"         // Caesars
  | "ESPN"        // ESPN BET
  | "HR"          // Hard Rock
  | "BetRivers"
  | "PB"          // PointsBet
  | "Pinnacle"
  | "Fanatics";

export const BOOK_LABEL: Record<BookCode, string> = {
  DK: "DraftKings",
  FD: "FanDuel",
  MGM: "BetMGM",
  CZR: "Caesars",
  ESPN: "ESPN BET",
  HR: "Hard Rock",
  BetRivers: "BetRivers",
  PB: "PointsBet",
  Pinnacle: "Pinnacle",
  Fanatics: "Fanatics",
};

export type OddsMarket = "winner" | "top_5" | "top_10" | "top_20" | "top_40";

export const MARKET_LABEL: Record<OddsMarket, string> = {
  winner: "Tournament Winner",
  top_5: "Top 5",
  top_10: "Top 10",
  top_20: "Top 20",
  top_40: "Top 40",
};

export type OddsRow = {
  player: string;
  market: OddsMarket;
  books: Partial<Record<BookCode, number>>;
  bestBook: BookCode;
  bestOdds: number;
  consensusOdds: number;
  // Cents of edge — best price minus consensus. 30 means the best book is
  // 30¢ off the field.
  edgeCents: number;
};

export type OddsMatrix = {
  event: string;
  market: OddsMarket;
  lastUpdate: string | null;
  source: "the-odds-api" | "demo";
  rows: OddsRow[];
};
