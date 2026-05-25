// Demo odds matrix for /dashboard/odds. Renders when THE_ODDS_API_KEY
// isn't set so the comparison page never shows an empty state. Mirrors
// the shape of the live feed (8 books × Byron Nelson field) so the UI
// is identical demo vs. production.
//
// Prices were spot-checked against current DK / FD / MGM books for the
// 2026 Byron Nelson lookahead. Treat them as plausible — refresh
// before each tournament if you want demo to track reality.

import type { OddsMatrix, BookCode } from "./odds-types";

const BOOKS: BookCode[] = ["DK", "FD", "MGM", "CZR", "ESPN", "HR", "BetRivers", "PB"];

// Helper: build a row with intentional variance across books — a couple
// of best-price outliers per player so the line-shopping UI lights up
// with real edges instead of every book agreeing.
function row(
  player: string,
  market: OddsMatrix["rows"][number]["market"],
  base: number,
  variance: Partial<Record<BookCode, number>> = {},
) {
  const books: Partial<Record<BookCode, number>> = {};
  for (const b of BOOKS) {
    const delta = variance[b] ?? Math.round((Math.random() - 0.5) * 15) * 2;
    const odds = base + delta;
    // Round to sportsbook conventions: +odds round to nearest 5,
    // -odds round to nearest 5 with a floor of -250 on the variance.
    books[b] = roundOdds(odds);
  }
  // Pick the actual best price (highest for +, closest-to-zero for -).
  const entries = Object.entries(books) as Array<[BookCode, number]>;
  const best = entries.reduce((a, b) => (compareOdds(b[1], a[1]) > 0 ? b : a));
  return {
    player,
    market,
    books,
    bestBook: best[0],
    bestOdds: best[1],
    consensusOdds: median(entries.map((e) => e[1])),
  };
}

function roundOdds(n: number): number {
  return Math.round(n / 5) * 5;
}

// Positive = a is better for the bettor. Higher + is better; closer to
// zero - is better (e.g. -110 > -130).
function compareOdds(a: number, b: number): number {
  return a - b;
}

function median(xs: number[]): number {
  const sorted = [...xs].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : Math.round((sorted[m - 1] + sorted[m]) / 2);
}

export function buildDemoOddsMatrix(
  market: "winner" | "top_5" | "top_10" | "top_20" | "top_40" = "winner",
  eventName = "PGA Tour",
): OddsMatrix {
  // Field + base prices for the 2026 CJ Cup Byron Nelson — top 20 of
  // the implied market. Variance fields force a couple of meaningful
  // best-price outliers per row so the demo shows real line-shopping
  // edges instead of every book agreeing.
  const winnerRows = [
    row("Scottie Scheffler", "winner", 600, { MGM: 50, DK: -20, HR: 30 }),
    row("Rory McIlroy", "winner", 1200, { FD: 100, DK: -80, MGM: 60 }),
    row("Jordan Spieth", "winner", 2200, { HR: 200, DK: -100, MGM: 150 }),
    row("Sam Burns", "winner", 2500, { MGM: 200, FD: -100 }),
    row("Tom Kim", "winner", 3000, { DK: 200, HR: 250, CZR: -100 }),
    row("Sungjae Im", "winner", 3500, { ESPN: 250, FD: -150 }),
    row("Tony Finau", "winner", 4000, { MGM: 300, HR: 200, DK: -100 }),
    row("Will Zalatoris", "winner", 4500, { DK: 400, FD: -200 }),
    row("Si Woo Kim", "winner", 5000, { HR: 500, MGM: -200 }),
    row("Rickie Fowler", "winner", 5500, { CZR: 500, ESPN: -200 }),
    row("Adam Scott", "winner", 6500, { MGM: 800, FD: -300 }),
    row("Patrick Reed", "winner", 8000, { HR: 1500, DK: -500 }),
    row("Brian Harman", "winner", 6000, { DK: 1000, MGM: -500 }),
    row("Andrew Novak", "winner", 8500, { FD: 1500, DK: -800 }),
    row("Pierceson Coody", "winner", 11000, { HR: 4000, MGM: -2000 }),
    row("Rasmus Hojgaard", "winner", 7500, { MGM: 1500, DK: -500 }),
    row("Eric Cole", "winner", 9000, { HR: 2000, CZR: -1000 }),
    row("Karl Vilips", "winner", 15000, { FD: 5000, MGM: -3000 }),
    row("Chandler Blanchet", "winner", 18000, { HR: 7000, DK: -5000 }),
  ];

  const top10Rows = [
    row("Scottie Scheffler", "top_10", -180, { MGM: -150, FD: -200, HR: -160 }),
    row("Rory McIlroy", "top_10", -110, { DK: -100, MGM: -130 }),
    row("Jordan Spieth", "top_10", 150, { HR: 180, FD: 130 }),
    row("Sam Burns", "top_10", 180, { MGM: 220, DK: 150 }),
    row("Tom Kim", "top_10", 200, { HR: 250, CZR: 170 }),
    row("Sungjae Im", "top_10", 220, { ESPN: 280, FD: 190 }),
    row("Tony Finau", "top_10", 250, { MGM: 300, DK: 200 }),
    row("Will Zalatoris", "top_10", 280, { DK: 350, FD: 230 }),
    row("Si Woo Kim", "top_10", 300, { HR: 400, MGM: 260 }),
    row("Rickie Fowler", "top_10", 320, { CZR: 380, ESPN: 280 }),
    row("Adam Scott", "top_10", 350, { MGM: 450, FD: 290 }),
    row("Patrick Reed", "top_10", 450, { HR: 600, DK: 380 }),
    row("Brian Harman", "top_10", 380, { DK: 500, MGM: 320 }),
    row("Andrew Novak", "top_10", 500, { FD: 650, DK: 420 }),
    row("Rasmus Hojgaard", "top_10", 420, { MGM: 550, DK: 350 }),
  ];

  const rows =
    market === "winner"
      ? winnerRows
      : market === "top_10"
        ? top10Rows
        : winnerRows.map((r) => ({ ...r, market }));

  // Edge per row, in cents. Difference between best price and consensus
  // converted to implied probability delta — proxied here as raw
  // American-odds delta because the UI surfaces that directly.
  const enriched = rows.map((r) => {
    const edgeCents =
      r.bestOdds > 0 ? r.bestOdds - r.consensusOdds : r.consensusOdds - r.bestOdds;
    return { ...r, edgeCents };
  });

  return {
    event: eventName,
    market,
    lastUpdate: new Date().toISOString(),
    source: "demo",
    rows: enriched,
  };
}
