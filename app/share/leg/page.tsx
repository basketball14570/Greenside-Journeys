import Link from "next/link";
import type { Metadata } from "next";
import { decodeLeg, type SharedSingleLeg } from "@/lib/share/leg";
import type { SharedLegStatus } from "@/lib/share/parlay";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Nav";

// Public share page for a single bet leg. Counterpart to /share/parlay
// but built for one-bet brag posts ("Hovland 2 UP on Cantlay") rather
// than full ticket recaps. Same encode/decode pattern via `?d=` so the
// route stays stateless and the same `d` blob feeds /api/og/leg.

type Props = { searchParams: { d?: string } };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const d = searchParams.d ?? "";
  const data = d ? decodeLeg(d) : null;
  const title = data
    ? `${data.player} · ${data.hero} · Greenside`
    : "Greenside · golf bet intelligence";
  const description = data
    ? `${data.market}${data.event ? ` · ${data.event}` : ""}. Tracked live on Greenside.`
    : "Forward your DK / FD / PrizePicks slips and grade them against the live ESPN scoreboard.";
  const og = `/api/og/leg${d ? `?d=${encodeURIComponent(d)}` : ""}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: og, width: 1200, height: 630 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [og],
    },
  };
}

export default function SharedLegPage({ searchParams }: Props) {
  const d = searchParams.d ?? "";
  const data = d ? decodeLeg(d) : null;

  return (
    <main className="min-h-screen bg-bg text-text">
      <MarketingNav />

      <section className="max-w-3xl mx-auto px-6 lg:px-12 py-16">
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 11, letterSpacing: 1.6, color: "#f5c558" }}
        >
          ● Shared leg
        </span>

        {data ? <SharedView data={data} /> : <Missing />}

        <div className="mt-12 rounded-[16px] border border-line p-6 lg:p-7 bg-surface-1/60">
          <div
            className="num font-semibold uppercase mb-2"
            style={{ fontSize: 11, letterSpacing: 1.4, color: "#7fd49a" }}
          >
            ● What is this
          </div>
          <h2
            className="serif-italic mb-3"
            style={{ fontSize: 26, letterSpacing: -0.3, lineHeight: 1.1, fontStyle: "normal" }}
          >
            <em>Live-graded golf bets</em>, hole by hole.
          </h2>
          <p className="text-text-dim mb-5" style={{ fontSize: 15, lineHeight: 1.55 }}>
            Greenside reads the live ESPN leaderboard every 15 minutes and grades
            each leg — winner outrights, top-N, round props, head-to-heads,
            3-balls, make / miss cut. Forward your DK / FD / PrizePicks
            confirmations and we&apos;ll do the rest.
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-5 py-2.5 rounded font-semibold"
            style={{ background: "#8ee68e", color: "#06140c", fontSize: 14 }}
          >
            Try Greenside →
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}

function SharedView({ data }: { data: SharedSingleLeg }) {
  const p = LEG_PALETTE[data.status] ?? LEG_PALETTE.pending;
  return (
    <>
      <h1
        className="serif-italic mt-3 mb-2"
        style={{
          fontSize: 56,
          letterSpacing: -0.8,
          lineHeight: 1,
          fontStyle: "italic",
          color: p.fg,
        }}
      >
        {data.player}
      </h1>
      <div
        className="text-text-dim mt-2 mb-6"
        style={{ fontSize: 14, lineHeight: 1.5 }}
      >
        {data.market}
        {data.event ? ` · ${data.event}` : ""}
        {data.americanOdds
          ? ` · ${data.americanOdds > 0 ? "+" : ""}${data.americanOdds}`
          : ""}
      </div>

      <div
        className="rounded-[16px] px-5 py-4 inline-flex items-baseline gap-3"
        style={{
          background: p.bg,
          border: `1px solid ${p.fg}55`,
        }}
      >
        <span
          className="num uppercase"
          style={{
            fontSize: 11,
            letterSpacing: 1.4,
            color: p.fg,
            fontWeight: 700,
          }}
        >
          {p.label}
        </span>
        <span
          className="serif-italic"
          style={{
            fontSize: 28,
            letterSpacing: -0.4,
            fontStyle: "italic",
            color: p.fg,
            fontWeight: 600,
          }}
        >
          {data.hero}
        </span>
      </div>

      {data.stake && data.toWin && (
        <div
          className="mt-5 num text-text-muted"
          style={{ fontSize: 12.5, letterSpacing: 0.5 }}
        >
          {data.stake}u → {data.toWin}u
        </div>
      )}
    </>
  );
}

function Missing() {
  return (
    <h1
      className="serif-italic mt-3"
      style={{ fontSize: 36, letterSpacing: -0.4, lineHeight: 1.1, fontStyle: "normal" }}
    >
      <em>This share link is incomplete.</em>
    </h1>
  );
}

const LEG_PALETTE: Record<SharedLegStatus, { fg: string; bg: string; label: string }> = {
  won:     { fg: "#7fd49a", bg: "rgba(127,212,154,0.18)", label: "Cashed" },
  lost:    { fg: "#e87c7c", bg: "rgba(232,124,124,0.18)", label: "Lost" },
  live:    { fg: "#f5c558", bg: "rgba(245,197,88,0.18)",  label: "Live" },
  pending: { fg: "#a8b3ac", bg: "rgba(168,179,172,0.14)", label: "Pre" },
  void:    { fg: "#7cc0e8", bg: "rgba(124,192,232,0.14)", label: "Void" },
};
