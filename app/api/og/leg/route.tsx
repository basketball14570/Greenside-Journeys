import { ImageResponse } from "next/og";
import { decodeLeg } from "@/lib/share/leg";
import type { SharedLegStatus } from "@/lib/share/parlay";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// 1200x630 share card for a single bet leg. Built for the brag — the
// player name and current live state are the hero; stake / payout sit
// on the bottom strip so they don't compete for attention.

const W = 1200;
const H = 630;

const PALETTE: Record<SharedLegStatus, { fg: string; bg: string; label: string; accent: string }> = {
  won:     { fg: "#7fd49a", bg: "rgba(127,212,154,0.18)", label: "CASHED",  accent: "rgba(127,212,154,0.18)" },
  lost:    { fg: "#e87c7c", bg: "rgba(232,124,124,0.18)", label: "LOST",    accent: "rgba(232,124,124,0.10)" },
  live:    { fg: "#f5c558", bg: "rgba(245,197,88,0.18)",  label: "LIVE",    accent: "rgba(245,197,88,0.12)" },
  pending: { fg: "#a8b3ac", bg: "rgba(168,179,172,0.14)", label: "PRE",     accent: "rgba(168,179,172,0.06)" },
  void:    { fg: "#7cc0e8", bg: "rgba(124,192,232,0.14)", label: "VOID",    accent: "rgba(124,192,232,0.08)" },
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const d = url.searchParams.get("d");
  const data = d ? decodeLeg(d) : null;

  if (!data) {
    return new ImageResponse(<FallbackCard />, { width: W, height: H });
  }

  const p = PALETTE[data.status] ?? PALETTE.pending;
  // Player headline scales to the length so "Rasmus Hojgaard" stays
  // readable next to "Reed".
  const playerSize = data.player.length > 18 ? 76 : data.player.length > 12 ? 92 : 108;

  const oddsLabel = data.americanOdds
    ? `${data.americanOdds > 0 ? "+" : ""}${data.americanOdds}`
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          background: `radial-gradient(ellipse at 30% 0%, ${p.accent}, transparent 65%), #0a1f14`,
          padding: 56,
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#f0ebe0",
          position: "relative",
        }}
      >
        {/* Top brand row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <BrandDot />
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 4,
                color: "#7fd49a",
                textTransform: "uppercase",
              }}
            >
              Greenside
            </span>
          </div>
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: 1.6,
              color: p.fg,
              background: p.bg,
              padding: "6px 14px",
              borderRadius: 6,
              border: `1px solid ${p.fg}55`,
              textTransform: "uppercase",
            }}
          >
            {p.label}
          </span>
        </div>

        {/* Player + market */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 60,
            gap: 12,
          }}
        >
          <span
            style={{
              fontSize: 18,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#a8b3ac",
              fontWeight: 600,
            }}
          >
            {data.event ?? "PGA Tour"} · {data.market}
          </span>
          <span
            style={{
              fontSize: playerSize,
              fontWeight: 700,
              letterSpacing: -2,
              color: "#f0ebe0",
              lineHeight: 0.95,
            }}
          >
            {data.player}
          </span>
        </div>

        {/* Hero state */}
        <div
          style={{
            display: "flex",
            marginTop: 36,
            padding: "20px 26px",
            background: p.bg,
            border: `1px solid ${p.fg}55`,
            borderRadius: 14,
            alignSelf: "flex-start",
            maxWidth: "100%",
          }}
        >
          <span
            style={{
              fontSize: heroSizeFor(data.hero),
              fontWeight: 700,
              letterSpacing: -1,
              color: p.fg,
              fontStyle: "italic",
              lineHeight: 1,
            }}
          >
            {data.hero}
          </span>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "auto",
            paddingTop: 22,
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <span style={{ fontSize: 18, color: "#a8b3ac", letterSpacing: 0.5 }}>
            {oddsLabel ? `${oddsLabel} · ` : ""}
            {data.stake && data.toWin
              ? `${money(data.stake)}u → ${money(data.toWin)}u`
              : "Tracked live on Greenside"}
          </span>
          <span style={{ fontSize: 18, color: "#7fd49a", letterSpacing: 1, fontWeight: 700 }}>
            greensidejourneys.com
          </span>
        </div>
      </div>
    ),
    { width: W, height: H },
  );
}

// Slim down the hero font when the live-state string gets long. Match
// labels like "2 UP on Cantlay" or "1st in 3-ball · -3 thru 12" vary
// from 6–35 chars.
function heroSizeFor(s: string): number {
  if (s.length > 32) return 36;
  if (s.length > 22) return 44;
  if (s.length > 14) return 56;
  return 64;
}

function BrandDot() {
  return (
    <div
      style={{
        display: "flex",
        width: 36,
        height: 36,
        borderRadius: 8,
        background: "linear-gradient(135deg, #7fd49a 0%, #4a9b6c 100%)",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 22,
        fontWeight: 800,
        color: "#0a1f14",
      }}
    >
      G
    </div>
  );
}

function FallbackCard() {
  return (
    <div
      style={{
        width: W,
        height: H,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a1f14",
        color: "#f0ebe0",
        fontFamily: "system-ui, -apple-system, sans-serif",
        gap: 16,
      }}
    >
      <BrandDot />
      <span style={{ fontSize: 32, fontWeight: 600, letterSpacing: 4, color: "#7fd49a" }}>
        GREENSIDE
      </span>
      <span style={{ fontSize: 22, color: "#a8b3ac" }}>
        Live-tracked golf bets · share-able tickets
      </span>
    </div>
  );
}

function money(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1000) return abs.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return abs.toLocaleString("en-US", { maximumFractionDigits: 2 });
}
