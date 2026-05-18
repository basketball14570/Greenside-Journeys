import { ImageResponse } from "next/og";
import { decodeShared, type SharedLeg, type SharedLegStatus } from "@/lib/share/parlay";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// 1200x630 share card for a parlay snapshot. Read from /share/parlay?d=...
// or directly with the same param so the same encoded blob drives both
// the public landing page's og:image and a manually-pasted preview.

const W = 1200;
const H = 630;

const PALETTE: Record<SharedLegStatus, { fg: string; bg: string; label: string }> = {
  won:     { fg: "#7fd49a", bg: "rgba(127,212,154,0.18)", label: "WON" },
  lost:    { fg: "#e87c7c", bg: "rgba(232,124,124,0.18)", label: "LOST" },
  live:    { fg: "#f5c558", bg: "rgba(245,197,88,0.18)",  label: "LIVE" },
  pending: { fg: "#a8b3ac", bg: "rgba(168,179,172,0.14)", label: "PRE" },
  void:    { fg: "#7cc0e8", bg: "rgba(124,192,232,0.14)", label: "VOID" },
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const d = url.searchParams.get("d");
  const data = d ? decodeShared(d) : null;

  if (!data) {
    return new ImageResponse(<FallbackCard />, { width: W, height: H });
  }

  const headline = data.status === "won"
    ? `+$${money(data.payout - data.stake)}`
    : data.status === "lost"
      ? `−$${money(data.stake)}`
      : `$${money(data.payout)} to win`;

  const headColor = data.status === "won"
    ? "#7fd49a"
    : data.status === "lost"
      ? "#e87c7c"
      : "#f0ebe0";

  // Tighten the headline as it gets longer so a $124,800 stays readable.
  const headSize = headline.length > 16 ? 96 : headline.length > 12 ? 116 : 144;

  const wonCount = data.legs.filter((l) => l.status === "won").length;
  const liveCount = data.legs.filter((l) => l.status === "live").length;
  const totalCount = data.legs.length;

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          background: "#0a1f14",
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
              fontSize: 16,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#a8b3ac",
              fontWeight: 600,
            }}
          >
            {data.event ?? "Live parlay"}
          </span>
        </div>

        {/* Headline payout */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
            marginTop: 36,
            marginBottom: 28,
          }}
        >
          <span
            style={{
              fontSize: 16,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#a8b3ac",
              marginBottom: 10,
              fontWeight: 600,
            }}
          >
            {totalCount}-leg parlay · {`$${money(data.stake)}`} stake
          </span>
          <span
            style={{
              fontSize: headSize,
              fontWeight: 600,
              letterSpacing: -2,
              color: headColor,
              fontStyle: "italic",
              lineHeight: 0.95,
            }}
          >
            {headline}
          </span>
        </div>

        {/* Legs */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            flex: 1,
          }}
        >
          {data.legs.slice(0, 5).map((l, i) => (
            <LegRow key={i} leg={l} />
          ))}
          {data.legs.length > 5 && (
            <div
              style={{
                fontSize: 16,
                color: "#a8b3ac",
                marginTop: 6,
                fontWeight: 600,
              }}
            >
              + {data.legs.length - 5} more leg{data.legs.length - 5 === 1 ? "" : "s"}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 18,
            paddingTop: 18,
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <span style={{ fontSize: 18, color: "#a8b3ac", letterSpacing: 0.5 }}>
            {wonCount}/{totalCount} won · {liveCount} live
          </span>
          <span style={{ fontSize: 18, color: "#7fd49a", letterSpacing: 1, fontWeight: 700 }}>
            greensideedge.com
          </span>
        </div>
      </div>
    ),
    { width: W, height: H },
  );
}

function LegRow({ leg }: { leg: SharedLeg }) {
  const p = PALETTE[leg.status] ?? PALETTE.pending;
  const market = leg.line ? `${leg.market} ${leg.line}` : leg.market;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 10,
        padding: "12px 18px",
        gap: 14,
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 1.6,
          color: p.fg,
          background: p.bg,
          padding: "4px 10px",
          borderRadius: 4,
          border: `1px solid ${p.fg}33`,
          width: 64,
          textAlign: "center",
        }}
      >
        {p.label}
      </span>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 22, color: "#f0ebe0", fontWeight: 600 }}>
          {leg.player}
        </span>
        <span style={{ fontSize: 15, color: "#a8b3ac", marginTop: 2 }}>
          {market}
        </span>
        {leg.detail && (
          <span
            style={{
              fontSize: 14,
              color: p.fg,
              marginTop: 2,
              fontWeight: 600,
              letterSpacing: 0.3,
            }}
          >
            {leg.detail}
          </span>
        )}
      </div>
    </div>
  );
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
        Golf bet intelligence · live grading · ownership data
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
