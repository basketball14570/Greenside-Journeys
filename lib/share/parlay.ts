// Compact URL encoding for a parlay snapshot that gets shared as a
// link. Same shape goes into both /api/og/parlay (the rendered image)
// and /share/parlay (the public HTML page that carries the og:image
// meta tag). Base64-url over JSON keeps the URL legible for ~8 legs.

export type SharedLegStatus = "won" | "lost" | "live" | "pending" | "void";

export type SharedLeg = {
  player: string;
  market: string;
  line?: string;
  status: SharedLegStatus;
};

export type SharedParlay = {
  legs: SharedLeg[];
  stake: number;
  payout: number;
  status: SharedLegStatus;
  event?: string;
};

export function encodeShared(p: SharedParlay): string {
  const json = JSON.stringify(p);
  if (typeof window === "undefined") {
    return Buffer.from(json, "utf-8").toString("base64url");
  }
  // Browser: btoa + url-safe swap
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeShared(s: string): SharedParlay | null {
  try {
    const padded = s + "=".repeat((4 - (s.length % 4)) % 4);
    const std = padded.replace(/-/g, "+").replace(/_/g, "/");
    let json: string;
    if (typeof window === "undefined") {
      json = Buffer.from(std, "base64").toString("utf-8");
    } else {
      json = decodeURIComponent(escape(atob(std)));
    }
    const parsed = JSON.parse(json) as SharedParlay;
    if (!Array.isArray(parsed.legs)) return null;
    return parsed;
  } catch {
    return null;
  }
}
