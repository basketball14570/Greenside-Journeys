import Link from "next/link";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Nav";
import { getActiveEvent, statusOf } from "@/lib/data/pga-schedule";
import { FEATURED_PARLAY } from "@/lib/data/featured-parlay";

export default function MarketingHome() {
  const event = getActiveEvent();
  const status = event ? statusOf(event) : null;
  const eyebrow = event
    ? status === "live"
      ? `Live · ${event.course} · grading every leg in your slip`
      : status === "upcoming"
        ? `This week · ${event.name} · ${event.course}`
        : `Just finished · ${event.name}`
    : "Off-season · gearing up for 2027";

  return (
    <main className="min-h-screen bg-bg text-text">
      <MarketingNav />

      {/* ─── Hero ─────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute pointer-events-none rounded-full"
          style={{
            top: -140,
            right: -140,
            width: 520,
            height: 520,
            background:
              "radial-gradient(circle, rgba(245,197,88,0.16) 0%, transparent 65%)",
          }}
        />
        <div className="relative max-w-5xl mx-auto px-6 lg:px-12 py-20 lg:py-28">
          <span
            className="num font-semibold uppercase"
            style={{ fontSize: 11, letterSpacing: 1.6, color: "#f5c558" }}
          >
            ● {eyebrow}
          </span>
          <h1
            className="serif-italic mt-5 mb-6 text-text"
            style={{
              fontSize: 72,
              lineHeight: 1.02,
              letterSpacing: -1,
              fontStyle: "normal",
            }}
          >
            <em>Greenside</em> is the bet
            <br />
            tracker you need
            <br />
            for tournaments.
          </h1>
          <p
            className="text-text-dim mb-8 max-w-2xl"
            style={{ fontSize: 19, lineHeight: 1.5 }}
          >
            Upload your bets and we&apos;ll grade them against a live scoreboard
            so you can track them all in one spot. No bouncing from app to app
            or having to pull up the leaderboard.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded font-semibold"
              style={{ background: "#8ee68e", color: "#06140c", fontSize: 15 }}
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Parlay of the week teaser ────────────────────── */}
      <section className="border-t border-line">
        <div className="max-w-5xl mx-auto px-6 lg:px-12 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <div
                className="num font-semibold uppercase mb-2"
                style={{ fontSize: 11, letterSpacing: 1.6, color: "#f5c558" }}
              >
                ● Parlay of the week · graded live
              </div>
              <h2
                className="serif-italic"
                style={{ fontSize: 40, letterSpacing: -0.5, lineHeight: 1.1, fontStyle: "normal" }}
              >
                <em>{FEATURED_PARLAY.legs.length} legs we&apos;re tracking this week.</em>
              </h2>
            </div>
            <Link
              href="/parlay"
              className="px-5 py-2.5 rounded font-semibold"
              style={{ background: "#8ee68e", color: "#06140c", fontSize: 14 }}
            >
              Watch it live →
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-text-dim" style={{ fontSize: 14 }}>
            <span>
              {FEATURED_PARLAY.book} · {FEATURED_PARLAY.event}
            </span>
            <span>
              <span className="num text-text-muted">Entry</span>{" "}
              <span className="num text-text font-semibold">${FEATURED_PARLAY.entry}</span>
            </span>
            <span>
              <span className="num text-text-muted">Pays</span>{" "}
              <span className="num font-semibold" style={{ color: "#8ee68e" }}>
                ${FEATURED_PARLAY.payout.toLocaleString()}
              </span>
            </span>
            <span className="num text-text-muted">
              {FEATURED_PARLAY.legs.map((l) => l.player.split(" ").pop()).join(" · ")}
            </span>
          </div>
        </div>
      </section>

      {/* ─── How it works ────────────────────── */}
      <section className="border-t border-line">
        <div className="max-w-5xl mx-auto px-6 lg:px-12 py-16">
          <div
            className="num font-semibold uppercase mb-3"
            style={{ fontSize: 11, letterSpacing: 1.6, color: "#7fd49a" }}
          >
            ● How it works
          </div>
          <h2
            className="serif-italic mb-10"
            style={{ fontSize: 40, letterSpacing: -0.5, lineHeight: 1.1, fontStyle: "normal" }}
          >
            <em>Three steps. That&apos;s it.</em>
          </h2>

          <ol className="grid sm:grid-cols-3 gap-5">
            <Beat
              n="1"
              title="Upload your slip."
              body="Email a confirmation, drop a screenshot, or paste from the book. Every leg lands in your Tickets queue."
            />
            <Beat
              n="2"
              title="We grade live."
              body="The leaderboard updates every minute. Each leg flips green or red the moment it settles."
            />
            <Beat
              n="3"
              title="Watch one screen."
              body="Live PnL, open exposure, and the cut line in one place — no app-switching."
            />
          </ol>
        </div>
      </section>

      {/* ─── Pricing ─────────────────────────────────── */}
      <section className="border-t border-line">
        <div className="max-w-5xl mx-auto px-6 lg:px-12 py-20">
          <div
            className="num font-semibold uppercase mb-3"
            style={{ fontSize: 11, letterSpacing: 1.6, color: "#f5c558" }}
          >
            ● Pricing
          </div>
          <h2
            className="serif-italic mb-3"
            style={{ fontSize: 40, letterSpacing: -0.5, lineHeight: 1.1, fontStyle: "normal" }}
          >
            <em>Free during beta.</em>
            <br />
            Paid tiers when the product earns it.
          </h2>
          <p
            className="text-text-dim max-w-2xl mb-12"
            style={{ fontSize: 15, lineHeight: 1.55 }}
          >
            Greenside is in open beta — every feature on this page is free
            while we&apos;re shipping. Paid tiers below are what we&apos;ll
            charge for once live grading, ownership data, and the AI parlay
            coach have been battle-tested across a full season. Lock in
            beta-pricing by signing up now; existing accounts keep their
            grandfathered rate forever.
          </p>

          <div className="grid sm:grid-cols-3 gap-5">
            <Tier
              name="Free"
              price="$0"
              cadence="forever"
              tagline="Track your bets. See the leaderboard."
              cta="Get started"
              ctaHref="/login"
              features={[
                "Email-forward bet ingestion (DK · FD · PP · UD · CZR · MGM)",
                "Screenshot upload via Claude vision OCR",
                "Live leaderboard with exposure overlay",
                "Settled-bet history + P&L analytics",
              ]}
              accent="#a8b3ac"
            />
            <Tier
              name="Pro"
              price="$14.99"
              cadence="per month"
              tagline="The product the serious golf bettor uses every Saturday."
              cta="Start free trial"
              ctaHref="/login"
              highlighted
              features={[
                "Everything in Free",
                "Personalized wave / wind / hedge push alerts",
                "Per-player wind sensitivity model",
                "Ask Greenside AI — unlimited questions",
                "Wave-aware DFS optimizer (DraftKings)",
                "DFS ownership database — 696 records, 14 events",
                "Hedge calculator — live cross-book prices",
              ]}
              accent="#7fd49a"
            />
            <Tier
              name="Sharp"
              price="$24"
              cadence="per month"
              tagline="For bettors running real bankrolls who want every edge."
              cta="Start free trial"
              ctaHref="/login"
              features={[
                "Everything in Pro",
                "Line shopping across 8 books — best-price flag on every market",
                "Custom alert thresholds per market + course",
                "Pre-tournament prep reports (auto-generated)",
                "Backtest harness for your own bet hypotheses",
                "Priority support · founder DMs",
              ]}
              accent="#f5c558"
            />
          </div>

          <div className="mt-8 flex items-baseline gap-4 flex-wrap">
            <Link
              href="/pricing"
              className="num font-semibold"
              style={{ fontSize: 13, color: "#7fd49a", letterSpacing: 0.5 }}
            >
              See full pricing + FAQ →
            </Link>
            <span className="text-text-muted" style={{ fontSize: 12 }}>
              7-day free trial on Pro · cancel anytime · no card required to
              start
            </span>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─────────────────────────────────────── */}
      <section className="border-t border-line bg-surface-1/30">
        <div className="max-w-3xl mx-auto px-6 lg:px-12 py-20">
          <div
            className="num font-semibold uppercase mb-3"
            style={{ fontSize: 11, letterSpacing: 1.6, color: "#7fd49a" }}
          >
            ● Common questions
          </div>
          <h2
            className="serif-italic mb-10"
            style={{ fontSize: 40, letterSpacing: -0.5, lineHeight: 1.1, fontStyle: "normal" }}
          >
            <em>The stuff people ask</em>
            <br />
            before signing up.
          </h2>

          <div className="space-y-3">
            <Faq
              q="Do I have to give you my sportsbook passwords?"
              a="No. Ever. Bet data comes in through email forwarding (the recommended path) or screenshot upload. Credential-based scraping gets users banned and violates every book's terms — we'd never put you in that position."
            />
            <Faq
              q="Is this legal?"
              a="Yes. Greenside is an analytics product. We don't accept wagers, don't process payments for bets, and don't take a cut of your wins or losses. You bet on licensed sportsbooks; we help you understand and optimize those bets. 21+, for entertainment only."
            />
            <Faq
              q="What sportsbooks do you support?"
              a="DraftKings, FanDuel, PrizePicks, Underdog, Caesars, and BetMGM today — via email forwarding and screenshot upload. Native share-sheet integration ships with the mobile app."
            />
            <Faq
              q="How does the conditions-alert engine work?"
              a="Every 10 minutes during tournament hours we pull weather for each course and diff against the previous snapshot. If wind or precip crosses a threshold, we use each player's fitted wind-sensitivity coefficient (from five years of DataGolf round data) to compute the EV shift on every bet you own. You get a push notification only for bets that actually moved."
            />
            <Faq
              q="Are you taking affiliate kickbacks from sportsbooks?"
              a="No. Zero affiliate links anywhere in the product. Our pricing page exists because that's how we keep the lights on without selling your data or steering you toward the book that pays us most."
            />
            <Faq
              q="Can I cancel anytime?"
              a="Yes. Monthly plans cancel at the end of the billing cycle, no questions. Annual plans get a prorated refund within the first 30 days. Pro comes with a 7-day free trial — no card required to start."
            />
          </div>

          <div className="mt-8" style={{ fontSize: 13 }}>
            <Link
              href="/pricing#faq"
              className="num font-semibold"
              style={{ color: "#7fd49a", letterSpacing: 0.5 }}
            >
              More questions on the pricing page →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer note ─────────────────────────────── */}
      <section className="border-t border-line">
        <div className="max-w-3xl mx-auto px-6 lg:px-12 py-16">
          <p className="text-text-dim" style={{ fontSize: 15, lineHeight: 1.6 }}>
            <span
              className="num font-semibold uppercase"
              style={{ fontSize: 11, letterSpacing: 1.4, color: "#a8b3ac" }}
            >
              Why this exists ·
            </span>{" "}
            Most golf bet trackers are spreadsheets with a UI on top. They tell
            you what you bet; they don&apos;t tell you what to do about it when
            the wind picks up at 3 PM and your three outrights all tee off in
            the PM wave. Greenside is the tracker that grades, alerts, and
            reasons about your portfolio in the same place — because the
            difference between a +2u and a −2u week is usually one decision
            you didn&apos;t have time to make.
          </p>
          <p className="text-text-muted mt-6" style={{ fontSize: 12 }}>
            Analytics product. Not a sportsbook, not an affiliate. 21+. If
            gambling is becoming a problem, call 1-800-GAMBLER.
          </p>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}

function Beat({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <li className="rounded-[14px] border border-line bg-surface-1/40 p-5">
      <span
        className="serif-italic block mb-2"
        style={{
          fontSize: 28,
          letterSpacing: -0.4,
          fontStyle: "italic",
          color: "#7fd49a",
          lineHeight: 1,
        }}
      >
        {n}
      </span>
      <div
        className="text-text font-medium mb-1"
        style={{ fontSize: 17, lineHeight: 1.3 }}
      >
        {title}
      </div>
      <p className="text-text-dim" style={{ fontSize: 14.5, lineHeight: 1.55 }}>
        {body}
      </p>
    </li>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details
      className="rounded-[12px] border border-line bg-bg overflow-hidden group"
      style={{ transition: "border-color 0.15s" }}
    >
      <summary
        className="cursor-pointer list-none flex items-baseline gap-3 px-5 py-4 hover:bg-surface-2 transition-colors"
        style={{ fontSize: 15.5, lineHeight: 1.4 }}
      >
        <span
          className="num shrink-0 group-open:rotate-90 transition-transform"
          style={{
            display: "inline-block",
            fontSize: 11,
            color: "#7fd49a",
            width: 10,
          }}
        >
          ▸
        </span>
        <span className="text-text font-medium flex-1">{q}</span>
      </summary>
      <div
        className="px-5 pb-5 pt-1 text-text-dim"
        style={{ fontSize: 14.5, lineHeight: 1.6, paddingLeft: 38 }}
      >
        {a}
      </div>
    </details>
  );
}

function Tier({
  name,
  price,
  cadence,
  tagline,
  cta,
  ctaHref,
  features,
  highlighted = false,
  accent,
}: {
  name: string;
  price: string;
  cadence: string;
  tagline: string;
  cta: string;
  ctaHref: string;
  features: string[];
  highlighted?: boolean;
  accent: string;
}) {
  return (
    <div
      className="rounded-[16px] p-6 lg:p-7 flex flex-col"
      style={{
        background: highlighted ? "rgba(127,212,154,0.04)" : "#0e1814",
        border: `1px solid ${highlighted ? `${accent}66` : "rgba(255,255,255,0.08)"}`,
        boxShadow: highlighted ? `0 0 0 1px ${accent}33, 0 8px 24px rgba(0,0,0,0.25)` : "none",
      }}
    >
      <div
        className="num font-semibold uppercase mb-1.5"
        style={{ fontSize: 11, letterSpacing: 1.4, color: accent }}
      >
        ● {name}
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <span
          className="serif-italic"
          style={{ fontSize: 44, letterSpacing: -0.8, color: "#f0ebe0", fontStyle: "normal" }}
        >
          <em>{price}</em>
        </span>
        <span className="num text-text-muted" style={{ fontSize: 12 }}>
          {cadence}
        </span>
      </div>
      <p
        className="text-text-dim mt-3 mb-5"
        style={{ fontSize: 14, lineHeight: 1.45 }}
      >
        {tagline}
      </p>
      <ul className="space-y-2.5 mb-7 flex-1">
        {features.map((f, i) => (
          <li
            key={i}
            className="flex items-baseline gap-2 text-text"
            style={{ fontSize: 13.5, lineHeight: 1.4 }}
          >
            <span
              className="num shrink-0"
              style={{ color: accent, fontSize: 11, lineHeight: 1.4 }}
            >
              ●
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link
        href={ctaHref}
        className="block text-center px-5 py-2.5 rounded font-semibold"
        style={{
          background: highlighted ? accent : "transparent",
          border: highlighted ? "none" : `1px solid ${accent}66`,
          color: highlighted ? "#06140c" : accent,
          fontSize: 14,
        }}
      >
        {cta}
      </Link>
    </div>
  );
}

