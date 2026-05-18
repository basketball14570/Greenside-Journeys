import Link from "next/link";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Nav";

type Tier = {
  id: string;
  name: string;
  blurb: string;
  monthly: number | null;
  annual: number | null;
  cta: string;
  ctaHref: string;
  featured?: boolean;
  features: { included: boolean; label: string }[];
};

const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    blurb: "Track your bets. See the leaderboard. Try the platform.",
    monthly: 0,
    annual: 0,
    cta: "Get started",
    ctaHref: "/login",
    features: [
      { included: true, label: "Unlimited bet tracking via email forward" },
      { included: true, label: "Screenshot upload — Claude vision OCR" },
      { included: true, label: "Live tournament leaderboard with exposure overlay" },
      { included: true, label: "Basic course conditions display" },
      { included: true, label: "Settled-bet history + P&L analytics" },
      { included: false, label: "Personalized conditions alerts" },
      { included: false, label: "Ask Greenside AI assistant" },
      { included: false, label: "Wave-aware DFS optimizer" },
      { included: false, label: "Hedge calculator with cross-book prices" },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    blurb: "The product the serious golf bettor uses every Saturday.",
    monthly: 14.99,
    annual: 149,
    cta: "Start free trial",
    ctaHref: "/login",
    featured: true,
    features: [
      { included: true, label: "Everything in Free" },
      { included: true, label: "Personalized wave/wind/hedge push alerts" },
      { included: true, label: "Per-player wind sensitivity model" },
      { included: true, label: "Ask Greenside AI — unlimited questions" },
      { included: true, label: "Wave-aware DFS optimizer (DraftKings)" },
      { included: true, label: "Hedge calculator — live cross-book prices" },
      { included: true, label: "Player + course profiles" },
      { included: true, label: "No affiliate prompts in your feed" },
      { included: false, label: "Custom alert thresholds + webhooks" },
    ],
  },
  {
    id: "sharp",
    name: "Sharp",
    blurb: "Power users, syndicates, and people running real bankrolls.",
    monthly: 49,
    annual: 490,
    cta: "Talk to us",
    ctaHref: "mailto:hello@greensideedge.com?subject=Sharp%20tier",
    features: [
      { included: true, label: "Everything in Pro" },
      { included: true, label: "Custom alert thresholds per market + course" },
      { included: true, label: "Webhook API — pipe alerts into Slack / Discord" },
      { included: true, label: "Pre-tournament prep reports (auto-generated)" },
      { included: true, label: "CSV / Sheets export of every bet, alert, lineup" },
      { included: true, label: "Read-only API access for your own tools" },
      { included: true, label: "Priority support · founder DMs" },
      { included: true, label: "Backtest harness for your own bet hypotheses" },
    ],
  },
];

const FAQ = [
  {
    q: "Do I have to give you my sportsbook passwords?",
    a: "No. Ever. We never ask for sportsbook credentials. Bet data comes in through email forwarding (the recommended path) or screenshot upload (the fallback). Credential-based scraping gets users banned and violates every book's terms — we'd never put you in that position.",
  },
  {
    q: "Is this legal?",
    a: "Yes. Greenside is an analytics product. We don't accept wagers, we don't process payments for bets, and we don't take a cut of your wins or losses. You bet on licensed sportsbooks; we help you understand and optimize those bets. 21+, for entertainment purposes only.",
  },
  {
    q: "What sportsbooks do you support?",
    a: "DraftKings, FanDuel, PrizePicks, Underdog, Caesars, and BetMGM today via email forwarding and screenshot upload. We're adding native share-sheet integration (tap 'Share to Greenside' inside the book app) when the mobile app ships.",
  },
  {
    q: "How does the conditions alert engine actually work?",
    a: "Every 10 minutes during tournament hours we pull Tomorrow.io weather for each course. We diff against the previous snapshot. If wind or precip crosses a threshold, we use each player's fitted wind-sensitivity coefficient (from 5 years of DataGolf round data) to compute the EV shift on every bet in your portfolio. You get a push notification only for bets that actually moved.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Monthly plans cancel at the end of the billing cycle, no questions asked. Annual plans get a prorated refund within the first 30 days.",
  },
  {
    q: "Is there a free trial?",
    a: "Pro includes a 7-day free trial. No card required to start.",
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-bg text-text">
      <MarketingNav />

      <section className="relative">
        <div
          className="absolute pointer-events-none rounded-full"
          style={{
            top: -120,
            left: "50%",
            transform: "translateX(-50%)",
            width: 600,
            height: 400,
            background:
              "radial-gradient(circle, rgba(245,197,88,0.12) 0%, transparent 65%)",
          }}
        />
        <div className="relative max-w-3xl mx-auto px-6 lg:px-12 pt-12 pb-12 text-center">
          <span
            className="num font-semibold uppercase"
            style={{
              fontSize: 11,
              letterSpacing: 1.6,
              color: "#f5c558",
            }}
          >
            ● Pricing
          </span>
          <h1
            className="serif-italic mt-3 mb-5"
            style={{
              fontSize: 56,
              lineHeight: 1.05,
              letterSpacing: -0.8,
              fontStyle: "normal",
            }}
          >
            <em>Simple.</em> Tied to the value you get.
          </h1>
          <p
            className="text-text-dim mx-auto"
            style={{ fontSize: 17, lineHeight: 1.55, maxWidth: 600 }}
          >
            Free is real free — not a 14-day trial dressed up. Pro pays for the
            alerts engine, the AI assistant, and the DFS optimizer. Sharp is for
            the bettor running a real bankroll.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 lg:px-12 pb-20 grid lg:grid-cols-3 gap-5">
        {TIERS.map((t) => (
          <TierCard key={t.id} t={t} />
        ))}
      </section>

      {/* Comparison strip */}
      <section className="max-w-5xl mx-auto px-6 lg:px-12 pb-24">
        <h2
          className="serif-italic text-center mb-3"
          style={{ fontSize: 32, letterSpacing: -0.4, fontStyle: "normal" }}
        >
          <em>How we compare</em>
        </h2>
        <p
          className="text-text-dim text-center mx-auto mb-8"
          style={{ fontSize: 14, maxWidth: 520 }}
        >
          Most golf-betting tools do one thing. Greenside is the one platform
          that ties them together — your portfolio, the conditions, the math.
        </p>
        <div className="rounded-[14px] overflow-hidden bg-surface-1 border border-line">
          <div
            className="grid gap-3 px-5 py-3 border-b border-line num font-semibold uppercase text-text-muted"
            style={{
              gridTemplateColumns: "1.6fr repeat(4, 1fr)",
              fontSize: 9.5,
              letterSpacing: 1.1,
              background: "rgba(0,0,0,0.18)",
            }}
          >
            <span>Feature</span>
            <span className="text-center" style={{ color: "#8ee68e" }}>
              Greenside
            </span>
            <span className="text-center">Pikkit</span>
            <span className="text-center">Action Network</span>
            <span className="text-center">DataGolf</span>
          </div>
          {[
            ["Multi-book bet aggregation", true, true, false, false],
            ["Golf-specific intelligence", true, false, true, true],
            ["Live conditions × portfolio alerts", true, false, false, false],
            ["Wave-aware DFS optimizer", true, false, false, false],
            ["AI portfolio assistant", true, false, false, false],
            ["Per-player wind model", true, false, false, true],
            ["Cross-book hedge calculator", true, false, false, false],
          ].map(([label, ...rest], i) => (
            <div
              key={i}
              className="grid gap-3 px-5 py-3 items-center"
              style={{
                gridTemplateColumns: "1.6fr repeat(4, 1fr)",
                borderBottom: i < 6 ? "1px solid rgba(255,255,255,0.06)" : "none",
                fontSize: 13,
              }}
            >
              <span className="text-text">{label as string}</span>
              {(rest as boolean[]).map((val, j) => (
                <span
                  key={j}
                  className="text-center"
                  style={{
                    color: j === 0
                      ? "#8ee68e"
                      : val
                        ? "#a8b3ac"
                        : "#3f4a44",
                    fontSize: 16,
                    fontWeight: j === 0 && val ? 700 : 400,
                  }}
                >
                  {val ? "✓" : "—"}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 lg:px-12 pb-24">
        <h2
          className="serif-italic text-center mb-8"
          style={{ fontSize: 32, letterSpacing: -0.4, fontStyle: "normal" }}
        >
          <em>Frequently asked</em>
        </h2>
        <div className="space-y-3">
          {FAQ.map((f, i) => (
            <details
              key={i}
              className="rounded-[12px] bg-surface-1 border border-line overflow-hidden group"
            >
              <summary
                className="px-5 py-4 cursor-pointer flex items-center justify-between gap-4 text-text font-semibold"
                style={{ fontSize: 14.5 }}
              >
                {f.q}
                <span
                  className="num text-text-muted group-open:rotate-45 transition"
                  style={{ fontSize: 18 }}
                >
                  +
                </span>
              </summary>
              <div
                className="px-5 pb-4 text-text-dim"
                style={{ fontSize: 13.5, lineHeight: 1.55 }}
              >
                {f.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}

function TierCard({ t }: { t: Tier }) {
  return (
    <div
      className="relative rounded-[18px] p-6 lg:p-7 flex flex-col"
      style={{
        background: t.featured
          ? "linear-gradient(165deg, rgba(63,138,82,0.18) 0%, #102619 60%)"
          : "#102619",
        border: t.featured
          ? "1px solid rgba(142,230,142,0.35)"
          : "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {t.featured && (
        <span
          className="absolute -top-2.5 left-6 num font-semibold uppercase"
          style={{
            fontSize: 9.5,
            letterSpacing: 1.2,
            color: "#06140c",
            background: "#8ee68e",
            padding: "3px 9px",
            borderRadius: 99,
          }}
        >
          ★ Most popular
        </span>
      )}

      <span
        className="num font-semibold uppercase text-text-muted"
        style={{ fontSize: 9.5, letterSpacing: 1.2 }}
      >
        {t.name}
      </span>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span
          className="serif-italic"
          style={{
            fontSize: 56,
            lineHeight: 1,
            color: "#f0ebe0",
            fontStyle: "italic",
            letterSpacing: -1,
          }}
        >
          {t.monthly === 0 ? "$0" : `$${t.monthly}`}
        </span>
        {t.monthly !== 0 && (
          <span className="num text-text-dim" style={{ fontSize: 12 }}>
            /mo
          </span>
        )}
      </div>
      {t.annual !== null && t.annual > 0 && (
        <div
          className="num text-text-muted mt-1"
          style={{ fontSize: 11, letterSpacing: 0.4 }}
        >
          or ${t.annual}/year — save ~17%
        </div>
      )}
      <p
        className="text-text-dim mt-3"
        style={{ fontSize: 13, lineHeight: 1.5 }}
      >
        {t.blurb}
      </p>

      <Link
        href={t.ctaHref}
        className="block text-center font-bold mt-5 rounded-md"
        style={{
          background: t.featured ? "#8ee68e" : "#1e4030",
          color: t.featured ? "#06140c" : "#f0ebe0",
          padding: "11px 0",
          fontSize: 13.5,
          border: t.featured ? "none" : "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {t.cta}
      </Link>

      <ul className="mt-6 space-y-2.5">
        {t.features.map((f, i) => (
          <li
            key={i}
            className="flex items-start gap-2"
            style={{ fontSize: 13, lineHeight: 1.45 }}
          >
            <span
              className="shrink-0 mt-1"
              style={{
                width: 14,
                height: 14,
                color: f.included ? "#8ee68e" : "#3f4a44",
              }}
            >
              {f.included ? "✓" : "—"}
            </span>
            <span style={{ color: f.included ? "#a8b3ac" : "#6c7a72" }}>
              {f.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
