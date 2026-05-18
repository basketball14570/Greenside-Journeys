// Compact URL encoding for a single bet leg, shared as a standalone
// social card. The parlay-share encoder (lib/share/parlay.ts) handles
// the full ticket case; this one is the "trash-talk" surface for a
// single bet that's looking good — bigger hero, less stake noise.

import type { SharedLegStatus } from "@/lib/share/parlay";

export type SharedSingleLeg = {
  player: string;
  market: string;
  // Free-text live state surfaced as the hero on the share card.
  // Examples: "1st in 3-ball · -3 thru 12", "2 UP on Cantlay",
  // "T7 · 1 clear of top 10", "5 birdies thru 11".
  hero: string;
  status: SharedLegStatus;
  americanOdds?: number;
  stake?: number;
  toWin?: number;
  event?: string;
};

export function encodeLeg(p: SharedSingleLeg): string {
  const json = JSON.stringify(p);
  if (typeof window === "undefined") {
    return Buffer.from(json, "utf-8").toString("base64url");
  }
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeLeg(s: string): SharedSingleLeg | null {
  try {
    const padded = s + "=".repeat((4 - (s.length % 4)) % 4);
    const std = padded.replace(/-/g, "+").replace(/_/g, "/");
    let json: string;
    if (typeof window === "undefined") {
      json = Buffer.from(std, "base64").toString("utf-8");
    } else {
      json = decodeURIComponent(escape(atob(std)));
    }
    const parsed = JSON.parse(json) as SharedSingleLeg;
    if (!parsed.player || !parsed.market) return null;
    return parsed;
  } catch {
    return null;
  }
}
