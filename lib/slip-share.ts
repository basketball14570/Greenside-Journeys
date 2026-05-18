// Slip share-link codec. Encodes a Slip into a URL-safe token so users can
// share their lineup as a static link — no DB row, no auth, no expiry. The
// public viewer at /slip/[token] decodes the token and joins it against a
// live leaderboard snapshot to render real-time grading.
//
// Format: base64url(JSON.stringify(slip)). Typical 5-leg slip serializes
// to ~600 bytes encoded — well under any browser/CDN URL limit.

import type { Slip, SlipLeg } from "@/lib/bet-slip";

const VERSION = "1";

export function encodeSlipToken(slip: Slip): string {
  const stripped: Slip = {
    ...slip,
    legs: slip.legs.map(stripLeg),
  };
  const json = JSON.stringify(stripped);
  return `${VERSION}.${base64urlEncode(json)}`;
}

export function decodeSlipToken(token: string): Slip | null {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot === -1) return null;
  const version = token.slice(0, dot);
  if (version !== VERSION) return null;
  try {
    const json = base64urlDecode(token.slice(dot + 1));
    const parsed = JSON.parse(json) as Slip;
    if (!parsed || !Array.isArray(parsed.legs)) return null;
    return parsed;
  } catch {
    return null;
  }
}

// Drop fields that don't need to travel — notes can contain PII and the
// `id` is local-only. createdAt is kept so the recipient sees order.
function stripLeg(leg: SlipLeg): SlipLeg {
  const { note: _note, ...rest } = leg;
  void _note;
  return rest as SlipLeg;
}

function base64urlEncode(s: string): string {
  const b64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(s, "utf8").toString("base64")
      : btoa(unescape(encodeURIComponent(s)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  if (typeof Buffer !== "undefined") {
    return Buffer.from(b64, "base64").toString("utf8");
  }
  return decodeURIComponent(escape(atob(b64)));
}
