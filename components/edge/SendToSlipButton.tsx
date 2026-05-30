"use client";

import { useState } from "react";
import { useBetSlip, type NewLeg } from "@/lib/bet-slip-store";
import type { OddsMarket } from "@/lib/data/odds-types";

// Drops an odds-board row into the user's Greenside slip in one tap.
// Maps the OddsMarket into the matching SlipLeg kind so the slip pages
// and grader already know what to do with it.

function legFor(player: string, market: OddsMarket, americanOdds: number, book: string): NewLeg {
  if (market === "winner") {
    return {
      kind: "winner",
      player,
      stake: 1,
      americanOdds,
      book,
      createdAt: new Date().toISOString() as never,
    } as unknown as NewLeg;
  }
  const n = market === "top_5" ? 5 : market === "top_10" ? 10 : market === "top_20" ? 20 : 40;
  return {
    kind: "top_n",
    n,
    player,
    stake: 1,
    americanOdds,
    book,
    createdAt: new Date().toISOString() as never,
  } as unknown as NewLeg;
}

export function SendToSlipButton({
  player,
  market,
  americanOdds,
  book,
  compact,
}: {
  player: string;
  market: OddsMarket;
  americanOdds: number;
  book: string;
  compact?: boolean;
}) {
  const { addLeg } = useBetSlip();
  const [added, setAdded] = useState(false);
  const onClick = () => {
    addLeg(legFor(player, market, americanOdds, book));
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  };
  return (
    <button
      type="button"
      onClick={onClick}
      title="Add to your Greenside slip"
      aria-label={`Add ${player} ${market} to slip`}
      className="num font-semibold uppercase transition"
      style={{
        fontSize: compact ? 9.5 : 10.5,
        letterSpacing: 0.7,
        padding: compact ? "3px 7px" : "4px 9px",
        borderRadius: 5,
        color: added ? "#06140c" : "#7fd49a",
        background: added ? "#7fd49a" : "rgba(127,212,154,0.10)",
        border: added ? "1px solid #7fd49a" : "1px solid rgba(127,212,154,0.32)",
      }}
    >
      {added ? "✓ In slip" : "+ Slip"}
    </button>
  );
}
