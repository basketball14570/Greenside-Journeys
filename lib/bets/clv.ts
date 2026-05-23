// Closing-line value (CLV) math. CLV measures whether you locked a better
// price than the market's closing line — the single most predictive signal
// of long-term betting skill. Scoped here to win-futures, the only golf
// market our odds source (The Odds API outrights) reliably closes.

export function americanToDecimal(a: number): number {
  return a > 0 ? a / 100 + 1 : 100 / -a + 1;
}

export function americanToProb(a: number): number {
  return a > 0 ? 100 / (a + 100) : -a / (-a + 100);
}

// CLV% = your entry decimal odds over the closing decimal odds, minus 1.
// Positive means you beat the close (got a longer price than it closed).
export function clvPercent(entryAmerican: number, closeAmerican: number): number {
  return americanToDecimal(entryAmerican) / americanToDecimal(closeAmerican) - 1;
}

export function beatClose(entryAmerican: number, closeAmerican: number): boolean {
  return americanToDecimal(entryAmerican) > americanToDecimal(closeAmerican);
}

// Map a stored bet's market text to a supported closing market, or null
// when we have no closing source for it (props, matchups, etc.).
export function clvSupportedMarket(market: string): "outright" | null {
  const t = market.toLowerCase();
  if ((t.includes("win") || t.includes("outright")) && !t.includes("top")) return "outright";
  return null;
}

export type ClvRow = { american_odds: number; closing_odds: number | null | undefined };

export type ClvSummary = {
  graded: number; // bets with a captured close
  beat: number; // count that beat the close
  beatRate: number;
  avgClvPct: number;
};

export function clvSummary(rows: ClvRow[]): ClvSummary {
  const withClose = rows.filter(
    (r) => typeof r.closing_odds === "number" && Number.isFinite(r.american_odds),
  ) as { american_odds: number; closing_odds: number }[];
  const graded = withClose.length;
  if (graded === 0) return { graded: 0, beat: 0, beatRate: 0, avgClvPct: 0 };
  let beat = 0;
  let clvSum = 0;
  for (const r of withClose) {
    if (beatClose(r.american_odds, r.closing_odds)) beat++;
    clvSum += clvPercent(r.american_odds, r.closing_odds);
  }
  return { graded, beat, beatRate: beat / graded, avgClvPct: clvSum / graded };
}
