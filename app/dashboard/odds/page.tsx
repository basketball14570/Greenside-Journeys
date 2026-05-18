import Link from "next/link";
import { getOddsMatrix } from "@/lib/data/odds";
import {
  BOOK_LABEL,
  MARKET_LABEL,
  type BookCode,
  type OddsMarket,
  type OddsMatrix,
  type OddsRow,
} from "@/lib/data/odds-types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Live Odds · Greenside",
};

type Props = { searchParams?: { market?: string } };

const MARKETS: OddsMarket[] = ["winner", "top_10", "top_5", "top_20", "top_40"];

export default async function OddsPage({ searchParams }: Props) {
  const market = (MARKETS.includes(searchParams?.market as OddsMarket)
    ? searchParams!.market
    : "winner") as OddsMarket;
  const matrix = await getOddsMatrix(market);

  // Collect the book columns actually present so we don't render empty
  // ones. Order is fixed (DK/FD/MGM first) so the table layout is
  // stable when prices arrive or drop from a particular book.
  const PREFERRED_ORDER: BookCode[] = [
    "DK", "FD", "MGM", "CZR", "ESPN", "HR", "BetRivers", "PB",
  ];
  const seen = new Set<BookCode>();
  matrix.rows.forEach((r) =>
    (Object.keys(r.books) as BookCode[]).forEach((b) => seen.add(b)),
  );
  const cols = PREFERRED_ORDER.filter((b) => seen.has(b));

  return (
    <div className="px-5 lg:px-8 py-6 space-y-5 max-w-6xl mx-auto">
      <Header matrix={matrix} />
      <MarketTabs active={market} />
      <Legend cols={cols} />

      {/* Desktop matrix */}
      <section className="hidden md:block rounded-[14px] border border-line overflow-hidden bg-surface-1">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: 13 }}>
            <thead>
              <tr style={{ background: "rgba(0,0,0,0.18)" }}>
                <Th>Player</Th>
                {cols.map((c) => (
                  <Th key={c} center>
                    {c}
                  </Th>
                ))}
                <Th center>Best</Th>
                <Th center>Edge</Th>
              </tr>
            </thead>
            <tbody>
              {matrix.rows.map((r, i) => (
                <DesktopRow key={r.player} row={r} cols={cols} isLast={i === matrix.rows.length - 1} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Mobile cards */}
      <section className="md:hidden space-y-2">
        {matrix.rows.map((r) => (
          <MobileCard key={r.player} row={r} cols={cols} />
        ))}
      </section>

      <Footnote matrix={matrix} />
    </div>
  );
}

// ─── Header + tabs ─────────────────────────────────────────────────

function Header({ matrix }: { matrix: OddsMatrix }) {
  const isLive = matrix.source === "the-odds-api";
  return (
    <header className="space-y-2">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
        >
          ● Line shop
        </span>
        <span
          className="num uppercase"
          style={{
            fontSize: 9,
            letterSpacing: 1,
            padding: "2px 7px",
            borderRadius: 4,
            color: isLive ? "#7fd49a" : "#a8b3ac",
            background: isLive ? "rgba(127,212,154,0.13)" : "rgba(168,179,172,0.1)",
            border: isLive
              ? "1px solid rgba(127,212,154,0.3)"
              : "1px solid rgba(168,179,172,0.25)",
          }}
        >
          {isLive ? "Live" : "Demo"}
        </span>
      </div>
      <h1
        className="serif-italic"
        style={{ fontSize: "clamp(26px, 5vw, 36px)", letterSpacing: -0.4 }}
      >
        <em>{matrix.event}</em>
      </h1>
      <p className="text-text-dim max-w-2xl" style={{ fontSize: 14, lineHeight: 1.5 }}>
        Every book&apos;s price on the same bet, side by side. Green cells flag
        the best available price on each row. The Edge column shows how far the
        best book is off the consensus — that&apos;s your line-shop profit per
        bet placed at the top.
      </p>
    </header>
  );
}

function MarketTabs({ active }: { active: OddsMarket }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {MARKETS.map((m) => {
        const isActive = m === active;
        return (
          <Link
            key={m}
            href={`/dashboard/odds?market=${m}`}
            className="num font-semibold uppercase transition"
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 11,
              letterSpacing: 0.6,
              color: isActive ? "#f0ebe0" : "#a8b3ac",
              background: isActive ? "#1e4030" : "rgba(255,255,255,0.04)",
              border: isActive
                ? "1px solid rgba(127,212,154,0.3)"
                : "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {MARKET_LABEL[m]}
          </Link>
        );
      })}
    </div>
  );
}

function Legend({ cols }: { cols: BookCode[] }) {
  return (
    <div
      className="num text-text-muted flex items-center gap-3 flex-wrap"
      style={{ fontSize: 10.5, letterSpacing: 0.4 }}
    >
      <span>{cols.length} books tracked:</span>
      {cols.map((c) => (
        <span key={c}>
          <span className="text-text font-semibold">{c}</span>{" "}
          <span className="text-text-muted">{BOOK_LABEL[c]}</span>
        </span>
      ))}
    </div>
  );
}

// ─── Desktop row ───────────────────────────────────────────────────

function DesktopRow({
  row,
  cols,
  isLast,
}: {
  row: OddsRow;
  cols: BookCode[];
  isLast: boolean;
}) {
  return (
    <tr
      style={{
        borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.05)",
      }}
    >
      <td className="px-3 py-2.5 text-text font-medium">{row.player}</td>
      {cols.map((c) => {
        const odds = row.books[c];
        const isBest = c === row.bestBook && odds !== undefined;
        return (
          <td key={c} className="px-3 py-2.5 text-center">
            {odds === undefined ? (
              <span className="num text-text-muted" style={{ fontSize: 12 }}>
                —
              </span>
            ) : (
              <OddsCell odds={odds} isBest={isBest} />
            )}
          </td>
        );
      })}
      <td className="px-3 py-2.5 text-center">
        <span
          className="num font-semibold"
          style={{
            fontSize: 12,
            color: "#7fd49a",
            padding: "2px 8px",
            borderRadius: 4,
            background: "rgba(127,212,154,0.12)",
            border: "1px solid rgba(127,212,154,0.3)",
          }}
        >
          {row.bestBook}
        </span>
      </td>
      <td className="px-3 py-2.5 text-center">
        <EdgePill cents={row.edgeCents} />
      </td>
    </tr>
  );
}

function OddsCell({ odds, isBest }: { odds: number; isBest: boolean }) {
  return (
    <span
      className="num"
      style={{
        fontSize: 13,
        fontWeight: isBest ? 700 : 500,
        color: isBest ? "#7fd49a" : "#f0ebe0",
        background: isBest ? "rgba(127,212,154,0.13)" : "transparent",
        padding: isBest ? "3px 9px" : "0",
        borderRadius: isBest ? 4 : 0,
        border: isBest ? "1px solid rgba(127,212,154,0.3)" : "none",
        letterSpacing: -0.1,
      }}
    >
      {isBest && "★ "}
      {fmtOdds(odds)}
    </span>
  );
}

function EdgePill({ cents }: { cents: number }) {
  // Edge is always non-negative — best price by definition meets or
  // beats consensus. A 0¢ row means every book is in lockstep.
  const tone = cents >= 50 ? "high" : cents >= 20 ? "mid" : "low";
  const color = tone === "high" ? "#7fd49a" : tone === "mid" ? "#f5c558" : "#a8b3ac";
  return (
    <span
      className="num font-semibold"
      style={{
        fontSize: 12,
        color,
        background: `${color}1a`,
        border: `1px solid ${color}33`,
        padding: "2px 8px",
        borderRadius: 4,
      }}
    >
      +{cents}¢
    </span>
  );
}

function Th({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <th
      className={`num font-semibold uppercase text-text-muted px-3 py-2.5 ${
        center ? "text-center" : "text-left"
      }`}
      style={{
        fontSize: 9.5,
        letterSpacing: 1.1,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {children}
    </th>
  );
}

function fmtOdds(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

// ─── Mobile card ──────────────────────────────────────────────────

function MobileCard({ row, cols }: { row: OddsRow; cols: BookCode[] }) {
  return (
    <article
      className="rounded-[12px] border-2 p-3 space-y-2"
      style={{
        borderColor: row.edgeCents >= 50 ? "rgba(127,212,154,0.35)" : "rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.18)",
      }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-text font-semibold" style={{ fontSize: 14.5 }}>
          {row.player}
        </span>
        <div className="flex items-baseline gap-2 shrink-0">
          <span
            className="num font-semibold"
            style={{
              fontSize: 13,
              color: "#7fd49a",
              padding: "2px 8px",
              borderRadius: 4,
              background: "rgba(127,212,154,0.12)",
              border: "1px solid rgba(127,212,154,0.3)",
            }}
          >
            ★ {fmtOdds(row.bestOdds)} {row.bestBook}
          </span>
          <EdgePill cents={row.edgeCents} />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {cols.map((c) => {
          const odds = row.books[c];
          if (odds === undefined) {
            return (
              <div
                key={c}
                className="rounded-[6px] px-2 py-1.5 text-center"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div
                  className="num uppercase text-text-muted"
                  style={{ fontSize: 9, letterSpacing: 0.5 }}
                >
                  {c}
                </div>
                <div
                  className="num text-text-muted"
                  style={{ fontSize: 11 }}
                >
                  —
                </div>
              </div>
            );
          }
          const isBest = c === row.bestBook;
          return (
            <div
              key={c}
              className="rounded-[6px] px-2 py-1.5 text-center"
              style={{
                background: isBest ? "rgba(127,212,154,0.13)" : "rgba(255,255,255,0.04)",
                border: isBest
                  ? "1px solid rgba(127,212,154,0.3)"
                  : "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div
                className="num uppercase"
                style={{
                  fontSize: 9,
                  letterSpacing: 0.5,
                  color: isBest ? "#7fd49a" : "#a8b3ac",
                }}
              >
                {c}
              </div>
              <div
                className="num"
                style={{
                  fontSize: 12,
                  fontWeight: isBest ? 700 : 500,
                  color: isBest ? "#7fd49a" : "#f0ebe0",
                }}
              >
                {fmtOdds(odds)}
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

// ─── Footnote ──────────────────────────────────────────────────────

function Footnote({ matrix }: { matrix: OddsMatrix }) {
  return (
    <footer className="space-y-3">
      <div
        className="rounded-[12px] border border-line p-4 bg-surface-1"
        style={{ fontSize: 12.5, lineHeight: 1.55 }}
      >
        <div
          className="num font-semibold uppercase text-text-muted mb-1.5"
          style={{ fontSize: 10, letterSpacing: 1.2 }}
        >
          How to read this
        </div>
        <p className="text-text-dim">
          <strong className="text-text">Best</strong>: the book with the highest
          payout on this player.{" "}
          <strong className="text-text">Edge</strong>: how many cents the best
          price beats the consensus (median across all listed books).{" "}
          <span className="text-text-muted">
            Anything ≥ 30¢ is meaningful — the book is leaving real EV on the
            table.
          </span>
        </p>
      </div>
      {matrix.source === "demo" && (
        <div
          className="rounded-[12px] border p-4"
          style={{
            background: "rgba(168,179,172,0.06)",
            borderColor: "rgba(168,179,172,0.25)",
            fontSize: 12.5,
            lineHeight: 1.5,
          }}
        >
          <div
            className="num font-semibold uppercase mb-1.5"
            style={{ fontSize: 10, letterSpacing: 1.2, color: "#a8b3ac" }}
          >
            ● Demo data
          </div>
          <p className="text-text-dim">
            Live odds light up the moment{" "}
            <code className="text-text">THE_ODDS_API_KEY</code> is set on
            Vercel. Pricing is plausible — refreshed against the field for
            illustration — but treat it as a sandbox until the key drops in.
          </p>
        </div>
      )}
    </footer>
  );
}
