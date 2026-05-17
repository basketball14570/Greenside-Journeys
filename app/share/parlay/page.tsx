import Link from "next/link";
import type { Metadata } from "next";
import { decodeShared, type SharedLegStatus } from "@/lib/share/parlay";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Nav";

// Public share page for a parlay snapshot. The actual data is encoded
// in the `d` query param so this route doesn't need DB access — anyone
// with the URL can preview the parlay, and Twitter/iMessage/Discord
// scrape the og:image off this page to render rich previews.
//
// Why two routes (share + api/og/parlay): scrapers ingest HTML, not
// PNGs. The HTML page owns the meta tags; the og:image points to the
// PNG-generating edge route. Same `d` blob drives both.

type Props = { searchParams: { d?: string } };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const d = searchParams.d ?? "";
  const data = d ? decodeShared(d) : null;
  const title = data
    ? `${data.legs.length}-leg parlay · ${headlineFor(data.status, data.payout, data.stake)} · Greenside`
    : "Greenside · golf bet intelligence";
  const description = data
    ? `Tracked live on Greenside${data.event ? ` · ${data.event}` : ""}. Forward your DK / FD / PrizePicks slips, grade them against the live ESPN scoreboard.`
    : "Forward your DK / FD / PrizePicks slips and grade them against the live ESPN scoreboard.";
  const og = `/api/og/parlay${d ? `?d=${encodeURIComponent(d)}` : ""}`;
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

export default function SharedParlayPage({ searchParams }: Props) {
  const d = searchParams.d ?? "";
  const data = d ? decodeShared(d) : null;

  return (
    <main className="min-h-screen bg-bg text-text">
      <MarketingNav />

      <section className="max-w-3xl mx-auto px-6 lg:px-12 py-16">
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 11, letterSpacing: 1.6, color: "#f5c558" }}
        >
          ● Shared parlay
        </span>

        {data ? (
          <SharedView data={data} />
        ) : (
          <Missing />
        )}

        <div
          className="mt-12 rounded-[16px] border border-line p-6 lg:p-7 bg-surface-1/60"
        >
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
            <em>Live-graded golf parlays</em>, in one dashboard.
          </h2>
          <p className="text-text-dim mb-5" style={{ fontSize: 15, lineHeight: 1.55 }}>
            Greenside reads the live ESPN leaderboard every 15 minutes and
            grades each leg — winner outrights, top-N, round props,
            head-to-heads, make/miss cut. Forward your DK / FD / PrizePicks
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

function SharedView({ data }: { data: NonNullable<ReturnType<typeof decodeShared>> }) {
  const wonCount = data.legs.filter((l) => l.status === "won").length;
  const liveCount = data.legs.filter((l) => l.status === "live").length;
  const headline = headlineFor(data.status, data.payout, data.stake);
  return (
    <>
      <h1
        className="serif-italic mt-3 mb-2"
        style={{
          fontSize: 56,
          letterSpacing: -0.8,
          lineHeight: 1,
          fontStyle: "italic",
          color: headlineColor(data.status),
        }}
      >
        {headline}
      </h1>
      <div className="text-text-dim mt-2 mb-8" style={{ fontSize: 14 }}>
        {data.legs.length}-leg parlay · ${data.stake.toLocaleString()} stake
        {data.event ? ` · ${data.event}` : ""} · {wonCount}/{data.legs.length} won
        {liveCount > 0 ? ` · ${liveCount} live` : ""}
      </div>

      <ul className="space-y-2">
        {data.legs.map((l, i) => {
          const p = LEG_PALETTE[l.status] ?? LEG_PALETTE.pending;
          const detail = l.line ? `${l.market} ${l.line}` : l.market;
          return (
            <li
              key={i}
              className="rounded-[12px] border border-line bg-surface-1 px-4 py-3 flex items-center gap-3"
            >
              <span
                className="num uppercase shrink-0 text-center"
                style={{
                  fontSize: 10.5,
                  letterSpacing: 0.9,
                  color: p.fg,
                  background: p.bg,
                  padding: "4px 10px",
                  borderRadius: 4,
                  border: `1px solid ${p.fg}33`,
                  minWidth: 56,
                }}
              >
                {p.label}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-text font-medium truncate" style={{ fontSize: 15 }}>
                  {l.player}
                </div>
                <div className="text-text-dim mt-0.5" style={{ fontSize: 12.5 }}>
                  {detail}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
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
  won:     { fg: "#7fd49a", bg: "rgba(127,212,154,0.18)", label: "Won" },
  lost:    { fg: "#e87c7c", bg: "rgba(232,124,124,0.18)", label: "Lost" },
  live:    { fg: "#f5c558", bg: "rgba(245,197,88,0.18)",  label: "Live" },
  pending: { fg: "#a8b3ac", bg: "rgba(168,179,172,0.14)", label: "Pre" },
  void:    { fg: "#7cc0e8", bg: "rgba(124,192,232,0.14)", label: "Void" },
};

function headlineFor(status: SharedLegStatus, payout: number, stake: number): string {
  if (status === "won") return `+$${money(payout - stake)}`;
  if (status === "lost") return `−$${money(stake)}`;
  return `$${money(payout)} to win`;
}

function headlineColor(status: SharedLegStatus): string {
  if (status === "won") return "#7fd49a";
  if (status === "lost") return "#e87c7c";
  return "#f0ebe0";
}

function money(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Math.abs(n).toLocaleString("en-US", {
    maximumFractionDigits: Math.abs(n) >= 1000 ? 0 : 2,
  });
}
