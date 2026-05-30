import Link from "next/link";
import { getOddsMatrix, getMajorsOddsMatrix } from "@/lib/data/odds";
import {
  getEdgeMatrix,
  EDGE_MARKETS,
  EDGE_MARKET_LABEL,
  type EdgeMarket,
  type EdgeMatrix,
  type EdgeRow,
} from "@/lib/data/edge";
import {
  MARKET_LABEL,
  type OddsMarket,
  type OddsMatrix,
  type OddsRow,
} from "@/lib/data/odds-types";
import { americanToDecimal, impliedProbability } from "@/lib/hedge";
import { PageHeader } from "@/components/edge/PageHeader";

// Small live/demo status pill reused by both odds mastheads.
function StatusPill({ live, on, off }: { live: boolean; on: string; off: string }) {
  return (
    <span
      className="num uppercase"
      style={{
        fontSize: 9,
        letterSpacing: 1,
        padding: "3px 8px",
        borderRadius: 4,
        color: live ? "#7fd49a" : "#a8b3ac",
        background: live ? "rgba(127,212,154,0.13)" : "rgba(168,179,172,0.1)",
        border: live ? "1px solid rgba(127,212,154,0.3)" : "1px solid rgba(168,179,172,0.25)",
      }}
    >
      {live ? on : off}
    </span>
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Live Odds · Greenside",
};

type Props = { searchParams?: { market?: string; view?: string } };

const MARKETS: OddsMarket[] = ["winner", "top_10", "top_5", "top_20"];

export default async function OddsPage({ searchParams }: Props) {
  if (searchParams?.view === "edge") {
    const em = (EDGE_MARKETS.includes(searchParams?.market as EdgeMarket)
      ? searchParams!.market
      : "winner") as EdgeMarket;
    const edge = await getEdgeMatrix(em);
    return (
      <div className="px-5 lg:px-8 py-6 space-y-5 max-w-6xl mx-auto">
        <EdgeHeader edge={edge} />
        <ViewToggle view="edge" market={edge.market} />
        <EdgeMarketTabs active={edge.market} />
        <EdgeTable edge={edge} />
        <EdgeFootnote edge={edge} />
      </div>
    );
  }

  if (searchParams?.view === "majors") {
    const matrix = await getMajorsOddsMatrix();
    return (
      <div className="px-5 lg:px-8 py-6 space-y-5 max-w-6xl mx-auto">
        <MajorsHeader matrix={matrix} />
        <ViewToggle view="majors" market="winner" />
        {matrix.rows.length > 0 ? (
          <OddsBoard matrix={matrix} />
        ) : (
          <div
            className="rounded-[14px] border border-line p-6 text-center text-text-dim bg-surface-1"
            style={{ fontSize: 13 }}
          >
            No live major futures right now
            {matrix.source === "demo" && (
              <> — set <code className="text-text">THE_ODDS_API_KEY</code> to pull them.</>
            )}
          </div>
        )}
        <Footnote matrix={matrix} />
      </div>
    );
  }

  const market = (MARKETS.includes(searchParams?.market as OddsMarket)
    ? searchParams!.market
    : "winner") as OddsMarket;
  const matrix = await getOddsMatrix(market);

  return (
    <div className="px-5 lg:px-8 py-6 space-y-5 max-w-6xl mx-auto">
      <Header matrix={matrix} />
      <ViewToggle view="shop" market={market} />
      <MarketTabs active={market} />
      <OddsBoard matrix={matrix} />
      <Footnote matrix={matrix} />
    </div>
  );
}

// Slim board: best available price + which book, DataGolf's fair line, and
// the edge — no per-sportsbook column spread. Used by the current-event view
// (DataGolf, with fair/EV) and the upcoming-majors view (futures, edge in ¢).
function OddsBoard({ matrix }: { matrix: OddsMatrix }) {
  const hasFair = matrix.rows.some((r) => r.fairOdds != null);
  return (
    <>
      <section className="hidden md:block rounded-[14px] border border-line overflow-hidden bg-surface-1">
        <table className="w-full" style={{ fontSize: 13 }}>
          <thead>
            <tr style={{ background: "rgba(0,0,0,0.18)" }}>
              <Th>Player</Th>
              <Th center>Best price</Th>
              <Th center>Book</Th>
              {hasFair && <Th center>DG fair</Th>}
              <Th center>{hasFair ? "EV" : "Edge"}</Th>
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((r, i) => (
              <SlimRow key={r.player} row={r} hasFair={hasFair} isLast={i === matrix.rows.length - 1} />
            ))}
          </tbody>
        </table>
      </section>

      <section className="md:hidden space-y-2">
        {matrix.rows.map((r) => (
          <SlimCard key={r.player} row={r} />
        ))}
      </section>
    </>
  );
}

// EV per $1 staked at the best price, using DataGolf's fair odds as the true
// probability. null when the row has no fair line (e.g. majors futures).
function evPercent(row: OddsRow): number | null {
  if (row.fairOdds == null) return null;
  return (impliedProbability(row.fairOdds) * americanToDecimal(row.bestOdds) - 1) * 100;
}

function SlimRow({ row, hasFair, isLast }: { row: OddsRow; hasFair: boolean; isLast: boolean }) {
  const ev = evPercent(row);
  return (
    <tr
      style={{
        borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.06)",
        background: ev != null && ev > 0 ? "rgba(127,212,154,0.05)" : "rgba(0,0,0,0.05)",
      }}
    >
      <td className="px-3 py-2.5 text-text font-medium">{row.player}</td>
      <td className="px-3 py-2.5 text-center num font-semibold" style={{ color: "#7fd49a" }}>
        {fmtOdds(row.bestOdds)}
      </td>
      <td className="px-3 py-2.5 text-center num text-text-dim" style={{ fontSize: 12 }}>
        {row.bestBook}
      </td>
      {hasFair && (
        <td className="px-3 py-2.5 text-center num text-text-dim">
          {row.fairOdds != null ? fmtOdds(row.fairOdds) : "—"}
        </td>
      )}
      <td className="px-3 py-2.5 text-center">
        {ev != null ? (
          <span
            className="num font-semibold"
            style={{
              fontSize: 12.5,
              color: evColor(ev),
              background: `${evColor(ev)}1a`,
              border: `1px solid ${evColor(ev)}33`,
              padding: "2px 8px",
              borderRadius: 4,
            }}
          >
            {ev >= 0 ? "+" : ""}{ev.toFixed(1)}%
          </span>
        ) : (
          <EdgePill cents={row.edgeCents} />
        )}
      </td>
    </tr>
  );
}

function SlimCard({ row }: { row: OddsRow }) {
  const ev = evPercent(row);
  return (
    <article
      className="rounded-[12px] border-2 p-3 flex items-center justify-between gap-2"
      style={{
        borderColor: ev != null && ev > 0 ? "rgba(127,212,154,0.35)" : "rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.18)",
      }}
    >
      <div className="min-w-0">
        <div className="text-text font-semibold truncate" style={{ fontSize: 14.5 }}>
          {row.player}
        </div>
        {row.fairOdds != null && (
          <div className="num text-text-muted" style={{ fontSize: 11 }}>
            DG fair {fmtOdds(row.fairOdds)}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
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
          {fmtOdds(row.bestOdds)} {row.bestBook}
        </span>
        {ev != null ? (
          <span
            className="num font-semibold"
            style={{
              fontSize: 12.5,
              color: evColor(ev),
              background: `${evColor(ev)}1a`,
              border: `1px solid ${evColor(ev)}33`,
              padding: "2px 8px",
              borderRadius: 4,
            }}
          >
            {ev >= 0 ? "+" : ""}{ev.toFixed(1)}%
          </span>
        ) : (
          <EdgePill cents={row.edgeCents} />
        )}
      </div>
    </article>
  );
}

// ─── Header + tabs ─────────────────────────────────────────────────

function MajorsHeader({ matrix }: { matrix: OddsMatrix }) {
  const isLive = matrix.source === "the-odds-api" && matrix.rows.length > 0;
  return (
    <PageHeader
      kicker="Upcoming majors"
      title={matrix.event}
      right={<StatusPill live={isLive} on="Live futures" off="No live futures" />}
      subtitle={
        <>
          Outright winner futures for the next major championship, priced across
          the books. These run year-round — the weekly board on{" "}
          <strong className="text-text">Line shop</strong> tracks whatever tour
          event is current.
        </>
      }
    />
  );
}

function Header({ matrix }: { matrix: OddsMatrix }) {
  const isLive = matrix.source !== "demo";
  return (
    <PageHeader
      kicker="Line shop"
      title={matrix.event}
      live={isLive}
      right={<StatusPill live={isLive} on="Live" off="Demo" />}
      subtitle={
        <>
          The best available price on each player and the book offering it,
          next to DataGolf&apos;s model fair line. <strong className="text-text">EV</strong>{" "}
          is your expected return per $1 at that price —{" "}
          <span style={{ color: "#7fd49a" }}>green is +EV</span>. Covers whatever
          tour event is current.
        </>
      }
    />
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

// ─── View toggle (Line shop ↔ Model edge) ──────────────────────────

function ViewToggle({ view, market }: { view: "shop" | "edge" | "majors"; market: string }) {
  const edgeMarket = (EDGE_MARKETS as readonly string[]).includes(market)
    ? market
    : "winner";
  const tabs: { key: "shop" | "edge" | "majors"; label: string; href: string }[] = [
    { key: "shop", label: "Line shop", href: `/dashboard/odds?market=${market}` },
    {
      key: "edge",
      label: "Model edge",
      href: `/dashboard/odds?view=edge&market=${edgeMarket}`,
    },
    { key: "majors", label: "Upcoming majors", href: `/dashboard/odds?view=majors` },
  ];
  return (
    <div className="flex gap-1.5">
      {tabs.map((t) => {
        const isActive = t.key === view;
        return (
          <Link
            key={t.key}
            href={t.href}
            className="num font-semibold uppercase transition"
            style={{
              padding: "7px 14px",
              borderRadius: 7,
              fontSize: 11,
              letterSpacing: 0.6,
              color: isActive ? "#1a1408" : "#a8b3ac",
              background: isActive ? "#f5c558" : "rgba(255,255,255,0.04)",
              border: isActive
                ? "1px solid #f5c558"
                : "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

// ─── Model edge view ───────────────────────────────────────────────

function fmtPct(prob: number): string {
  return `${(prob * 100).toFixed(1)}%`;
}

function fmtSignedPct(pts: number): string {
  return `${pts >= 0 ? "+" : ""}${pts.toFixed(1)}%`;
}

function EdgeHeader({ edge }: { edge: EdgeMatrix }) {
  const liveOdds = edge.oddsSource !== "demo";
  const liveModel = edge.modelSource === "datagolf";
  return (
    <header className="space-y-2">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
        >
          ● Model edge
        </span>
        <Badge ok={liveOdds} label={liveOdds ? "Live odds" : "Demo odds"} />
        <Badge ok={liveModel} label={liveModel ? "DataGolf model" : "Demo model"} />
      </div>
      <h1
        className="serif-italic"
        style={{ fontSize: "clamp(26px, 5vw, 36px)", letterSpacing: -0.4 }}
      >
        <em>{edge.event}</em>
      </h1>
      <p className="text-text-dim max-w-2xl" style={{ fontSize: 14, lineHeight: 1.5 }}>
        The DataGolf model&apos;s probability against the best price on the
        board. <strong className="text-text">EV%</strong> is your expected
        return per $1 staked at that price — anything green is a positive-EV bet
        the market is mispricing. Sorted best-EV first.
      </p>
    </header>
  );
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className="num uppercase"
      style={{
        fontSize: 9,
        letterSpacing: 1,
        padding: "2px 7px",
        borderRadius: 4,
        color: ok ? "#7fd49a" : "#a8b3ac",
        background: ok ? "rgba(127,212,154,0.13)" : "rgba(168,179,172,0.1)",
        border: ok
          ? "1px solid rgba(127,212,154,0.3)"
          : "1px solid rgba(168,179,172,0.25)",
      }}
    >
      {label}
    </span>
  );
}

function EdgeMarketTabs({ active }: { active: EdgeMarket }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {EDGE_MARKETS.map((m) => {
        const isActive = m === active;
        return (
          <Link
            key={m}
            href={`/dashboard/odds?view=edge&market=${m}`}
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
            {EDGE_MARKET_LABEL[m]}
          </Link>
        );
      })}
    </div>
  );
}

function evColor(evPct: number): string {
  if (evPct >= 5) return "#7fd49a";
  if (evPct > 0) return "#cfe8b0";
  if (evPct > -5) return "#a8b3ac";
  return "#e57373";
}

function EdgeTable({ edge }: { edge: EdgeMatrix }) {
  if (edge.rows.length === 0) {
    return (
      <div
        className="rounded-[14px] border border-line p-6 text-center text-text-dim bg-surface-1"
        style={{ fontSize: 13 }}
      >
        No players matched between the odds board and the model for this market.
      </div>
    );
  }
  return (
    <>
      {/* Desktop */}
      <section className="hidden md:block rounded-[14px] border border-line overflow-hidden bg-surface-1">
        <table className="w-full" style={{ fontSize: 13 }}>
          <thead>
            <tr style={{ background: "rgba(0,0,0,0.18)" }}>
              <Th>Player</Th>
              <Th center>Model</Th>
              <Th center>Best price</Th>
              <Th center>Implied</Th>
              <Th center>Edge</Th>
              <Th center>EV</Th>
            </tr>
          </thead>
          <tbody>
            {edge.rows.map((r, i) => (
              <tr
                key={r.player}
                style={{
                  borderBottom:
                    i === edge.rows.length - 1 ? "none" : "1px solid rgba(255,255,255,0.06)",
                  background: r.evPct > 0 ? "rgba(127,212,154,0.05)" : "rgba(0,0,0,0.05)",
                }}
              >
                <td className="px-3 py-2.5 text-text font-medium">{r.player}</td>
                <td className="px-3 py-2.5 text-center num">{fmtPct(r.modelProb)}</td>
                <td className="px-3 py-2.5 text-center num">
                  <span className="font-semibold">{fmtOdds(r.bestOdds)}</span>{" "}
                  <span className="text-text-muted" style={{ fontSize: 11 }}>
                    {r.bestBook}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center num text-text-dim">
                  {fmtPct(r.impliedProb)}
                </td>
                <td className="px-3 py-2.5 text-center num" style={{ color: evColor(r.edgePts) }}>
                  {fmtSignedPct(r.edgePts)}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span
                    className="num font-semibold"
                    style={{
                      fontSize: 12.5,
                      color: evColor(r.evPct),
                      background: `${evColor(r.evPct)}1a`,
                      border: `1px solid ${evColor(r.evPct)}33`,
                      padding: "2px 8px",
                      borderRadius: 4,
                    }}
                  >
                    {fmtSignedPct(r.evPct)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Mobile */}
      <section className="md:hidden space-y-2">
        {edge.rows.map((r) => (
          <article
            key={r.player}
            className="rounded-[12px] border-2 p-3 space-y-2"
            style={{
              borderColor: r.evPct > 0 ? "rgba(127,212,154,0.35)" : "rgba(255,255,255,0.08)",
              background: "rgba(0,0,0,0.18)",
            }}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-text font-semibold" style={{ fontSize: 14.5 }}>
                {r.player}
              </span>
              <span
                className="num font-semibold"
                style={{
                  fontSize: 13,
                  color: evColor(r.evPct),
                  background: `${evColor(r.evPct)}1a`,
                  border: `1px solid ${evColor(r.evPct)}33`,
                  padding: "2px 8px",
                  borderRadius: 4,
                }}
              >
                EV {fmtSignedPct(r.evPct)}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <MiniStat label="Model" value={fmtPct(r.modelProb)} />
              <MiniStat label="Best" value={`${fmtOdds(r.bestOdds)} ${r.bestBook}`} />
              <MiniStat label="Implied" value={fmtPct(r.impliedProb)} />
              <MiniStat label="Edge" value={fmtSignedPct(r.edgePts)} color={evColor(r.edgePts)} />
            </div>
          </article>
        ))}
      </section>
    </>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div
      className="rounded-[6px] px-2 py-1.5 text-center"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div
        className="num uppercase text-text-muted"
        style={{ fontSize: 9, letterSpacing: 0.5 }}
      >
        {label}
      </div>
      <div className="num" style={{ fontSize: 12, fontWeight: 600, color: color ?? "#f0ebe0" }}>
        {value}
      </div>
    </div>
  );
}

function EdgeFootnote({ edge }: { edge: EdgeMatrix }) {
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
          <strong className="text-text">Model</strong>: DataGolf&apos;s
          probability for this market.{" "}
          <strong className="text-text">Implied</strong>: the probability baked
          into the best price (vig included).{" "}
          <strong className="text-text">Edge</strong>: model minus implied.{" "}
          <strong className="text-text">EV</strong>: expected return per $1
          staked — <span style={{ color: "#7fd49a" }}>positive is +EV</span>.
          {" "}Matched {edge.matched} players.
        </p>
      </div>
      {(edge.oddsSource === "demo" || edge.modelSource === "demo") && (
        <div
          className="rounded-[12px] border p-4"
          style={{
            background: "rgba(245,197,88,0.06)",
            borderColor: "rgba(245,197,88,0.25)",
            fontSize: 12.5,
            lineHeight: 1.5,
          }}
        >
          <div
            className="num font-semibold uppercase mb-1.5"
            style={{ fontSize: 10, letterSpacing: 1.2, color: "#f5c558" }}
          >
            ● Demo inputs
          </div>
          <p className="text-text-dim">
            {edge.oddsSource === "demo" && (
              <>Odds are demo until <code className="text-text">THE_ODDS_API_KEY</code> is set. </>
            )}
            {edge.modelSource === "demo" && (
              <>Model probabilities are demo until <code className="text-text">DATAGOLF_API_KEY</code> is set. </>
            )}
            EV is computed correctly from whatever inputs are live — but treat
            demo edges as illustrative.
          </p>
        </div>
      )}
    </footer>
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
          <strong className="text-text">Best price</strong>: the book with the
          highest payout on this player, and which book.{" "}
          <strong className="text-text">DG fair</strong>: DataGolf&apos;s model
          line. <strong className="text-text">EV</strong>: expected return per
          $1 at the best price —{" "}
          <span style={{ color: "#7fd49a" }}>positive is +EV</span>. The
          Upcoming-majors tab has no model line, so it shows the line-shop edge
          in cents instead.
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
            Live odds light up the moment DataGolf&apos;s betting-tools feed is
            available (<code className="text-text">DATAGOLF_API_KEY</code> with
            the odds add-on). Pricing here is plausible but illustrative until
            then.
          </p>
        </div>
      )}
    </footer>
  );
}
