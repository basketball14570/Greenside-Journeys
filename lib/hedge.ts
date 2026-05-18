// Hedge math. Pure functions — no IO. Used by the /dashboard/hedge UI and
// by the Ask Greenside compute_hedge tool handler.

// American odds → decimal multiplier (returned amount per $1 risked, INCLUDING stake)
export function americanToDecimal(odds: number): number {
  if (odds > 0) return odds / 100 + 1;
  return 100 / Math.abs(odds) + 1;
}

// American odds → implied probability (0-1)
export function impliedProbability(odds: number): number {
  if (odds > 0) return 100 / (odds + 100);
  return Math.abs(odds) / (Math.abs(odds) + 100);
}

export type HedgeScenario = {
  // What the user stakes on the hedge side
  hedgeStake: number;
  // Net profit if the original bet WINS (hedge stake is the cost)
  profitIfOriginalWins: number;
  // Net profit if the HEDGE bet wins (original stake is the cost)
  profitIfHedgeWins: number;
  // Worst-case (minimum of the two) — what you guarantee
  guaranteed: number;
};

// Optimal hedge sizing: pick hedgeStake so the two outcomes are equal.
// Result is the "locked profit" — same payout regardless of which side wins.
export function optimalEqualizeHedge(
  originalStake: number,
  originalAmericanOdds: number,
  hedgeAmericanOdds: number,
): HedgeScenario {
  const origMultiplier = americanToDecimal(originalAmericanOdds);
  const hedgeMultiplier = americanToDecimal(hedgeAmericanOdds);
  // Original payout (including stake returned) if original wins:
  const origPayout = originalStake * origMultiplier;
  // Solve hedgeStake such that:
  //   origPayout - originalStake - hedgeStake == hedgeStake * hedgeMultiplier - hedgeStake - originalStake
  // → origPayout - hedgeStake == hedgeStake * hedgeMultiplier - hedgeStake
  // → origPayout == hedgeStake * hedgeMultiplier
  // → hedgeStake = origPayout / hedgeMultiplier
  const hedgeStake = origPayout / hedgeMultiplier;

  const profitIfOriginalWins = origPayout - originalStake - hedgeStake;
  const profitIfHedgeWins =
    hedgeStake * hedgeMultiplier - hedgeStake - originalStake;
  const guaranteed = Math.min(profitIfOriginalWins, profitIfHedgeWins);

  return {
    hedgeStake: +hedgeStake.toFixed(2),
    profitIfOriginalWins: +profitIfOriginalWins.toFixed(2),
    profitIfHedgeWins: +profitIfHedgeWins.toFixed(2),
    guaranteed: +guaranteed.toFixed(2),
  };
}

// Custom stake (user picked a specific hedge amount)
export function hedgeAtStake(
  originalStake: number,
  originalAmericanOdds: number,
  hedgeAmericanOdds: number,
  hedgeStake: number,
): HedgeScenario {
  const origMultiplier = americanToDecimal(originalAmericanOdds);
  const hedgeMultiplier = americanToDecimal(hedgeAmericanOdds);
  const profitIfOriginalWins =
    originalStake * origMultiplier - originalStake - hedgeStake;
  const profitIfHedgeWins =
    hedgeStake * hedgeMultiplier - hedgeStake - originalStake;
  return {
    hedgeStake: +hedgeStake.toFixed(2),
    profitIfOriginalWins: +profitIfOriginalWins.toFixed(2),
    profitIfHedgeWins: +profitIfHedgeWins.toFixed(2),
    guaranteed: +Math.min(profitIfOriginalWins, profitIfHedgeWins).toFixed(2),
  };
}
