import { ImageResponse } from "next/og";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// Site-wide og:image for greensidejourneys.com. Rendered fresh on each
// scraper hit so we can tune copy without a redeploy gating it. The
// dimensions match the X / iMessage / LinkedIn large-image preview.

const W = 1200;
const H = 630;

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a1f14",
          padding: 64,
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#f0ebe0",
          position: "relative",
        }}
      >
        {/* Decorative radial in the top-right corner mirroring the
            marketing hero on /. Drawn with a static gradient blob. */}
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -180,
            width: 560,
            height: 560,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(245,197,88,0.20) 0%, transparent 65%)",
            display: "flex",
          }}
        />

        {/* Top: brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <BrandDot />
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 5,
              color: "#7fd49a",
              textTransform: "uppercase",
            }}
          >
            Greenside
          </span>
        </div>

        {/* Middle: italic headline + supporting subhead */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1000 }}>
          <span
            style={{
              fontSize: 17,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#f5c558",
              fontWeight: 700,
            }}
          >
            ● Golf bet intelligence
          </span>
          <span
            style={{
              fontSize: 80,
              fontStyle: "italic",
              fontWeight: 500,
              letterSpacing: -1.5,
              lineHeight: 1,
              color: "#f0ebe0",
            }}
          >
            The bet tracker that
          </span>
          <span
            style={{
              fontSize: 80,
              fontStyle: "italic",
              fontWeight: 500,
              letterSpacing: -1.5,
              lineHeight: 1,
              color: "#f0ebe0",
            }}
          >
            <span style={{ color: "#7fd49a" }}>knows the wind</span> is changing.
          </span>
        </div>

        {/* Bottom: tight value-prop chips + domain */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: 22 }}>
            <Chip n="6" l="markets graded live" />
            <Chip n="15min" l="cron tick" />
            <Chip n="696" l="ownership records" />
          </div>
          <span
            style={{
              fontSize: 22,
              color: "#7fd49a",
              letterSpacing: 1.2,
              fontWeight: 700,
            }}
          >
            greensidejourneys.com
          </span>
        </div>
      </div>
    ),
    { width: W, height: H },
  );
}

function Chip({ n, l }: { n: string; l: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
      <span
        style={{
          fontSize: 36,
          color: "#f0ebe0",
          fontWeight: 600,
          fontStyle: "italic",
          letterSpacing: -0.5,
        }}
      >
        {n}
      </span>
      <span style={{ fontSize: 15, color: "#a8b3ac", letterSpacing: 0.5 }}>
        {l}
      </span>
    </div>
  );
}

function BrandDot() {
  return (
    <div
      style={{
        display: "flex",
        width: 42,
        height: 42,
        borderRadius: 9,
        background: "linear-gradient(135deg, #7fd49a 0%, #4a9b6c 100%)",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 26,
        fontWeight: 800,
        color: "#0a1f14",
      }}
    >
      G
    </div>
  );
}
