import Link from "next/link";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Nav";

const PILLARS = [
  {
    label: "Aggregation",
    title: "Every bet, every book, one screen",
    body: "Forward a confirmation email to your personal bets+token@greensidejourneys.com address. Claude vision reads the HTML, extracts the line/odds/stake, and the bet appears in your dashboard within 30 seconds. Screenshots work as a fallback for slips that don't email — drop the image, get structured data back.",
    bullets: [
      "Email forwarding (recommended path) — set up once",
      "Screenshot upload with Claude vision OCR",
      "Mobile share-sheet integration coming with the native app",
      "Total exposure, correlated risk, and net P&L across all your books",
    ],
  },
  {
    label: "Live Conditions",
    title: "Wind that actually moves your EV",
    body: "Every 10 minutes during tournament hours we pull Tomorrow.io weather for each course. We diff against the last snapshot. When wind or precip crosses your threshold, we compute the EV shift on every bet in your portfolio using each player's fitted wind-sensitivity coefficient.",
    bullets: [
      "Per-course 15-minute granularity (sustained + gust + direction)",
      "AM vs PM wave-split historical baselines",
      "Per-hole wind exposure on every course profile",
      "Push notifications scoped to bets you actually have",
    ],
  },
  {
    label: "Intelligence",
    title: "A model that knows your players",
    body: "Each player has a wind-sensitivity coefficient fitted on the last 3-5 years of DataGolf round data, regressed against on-course wind during their tee times. Scottie Scheffler at 0.18 means he loses ~0.18 strokes per round per +10mph wind — top 8% in the field. Cantlay at 0.41 is bottom 25%.",
    bullets: [
      "Per-player wind sensitivity, refit weekly",
      "Course-fit by archetype (parkland · coastal · links · desert)",
      "Recent form with full strokes-gained breakdown",
      "Your lifetime exposure on each player — bets, win rate, net units",
    ],
  },
  {
    label: "Ask Greenside",
    title: "Conversational access to your portfolio",
    body: "Ask anything. 'Hedge my McIlroy bet — what does the lock look like?' or 'Show me my AM-wave bets and the wave-split impact' — Greenside answers with the actual numbers from your portfolio. Powered by Claude with tool use over your live data.",
    bullets: [
      "Reads your open bets, settled history, live conditions, leaderboard",
      "Computes hedges on demand with cross-book prices",
      "Returns DFS player pool analysis filtered by wind impact",
      "Answers grounded in your data — never guessed",
    ],
  },
  {
    label: "DFS",
    title: "Wave-aware DraftKings optimizer",
    body: "Most DFS optimizers price salary against projections and stop there. Ours adjusts each player's projection by their wind sensitivity coefficient × the live forecast for their tee-time wave. AM/PM tilt is baked into every lineup we generate.",
    bullets: [
      "DraftKings golf optimizer with wave-adjusted projections",
      "Monte Carlo simulation for floor/ceiling outcomes",
      "Ownership-aware leverage for tournament play",
      "Deep-link export — open the lineup straight in DK",
    ],
  },
  {
    label: "Hedge Lab",
    title: "Lock the profit",
    body: "Pick any live bet, see the cross-book inverse prices, and the optimal hedge stake to guarantee the same payout regardless of outcome. Drag the stake slider to explore alternatives and see exactly what you're trading off.",
    bullets: [
      "Real cross-book inverse prices via The Odds API",
      "Optimal equalizing hedge math computed instantly",
      "Custom-stake explorer with both outcome scenarios",
      "Locked-profit vs. no-hedge upside displayed side by side",
    ],
  },
];

export default function FeaturesPage() {
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
            style={{ fontSize: 11, letterSpacing: 1.6, color: "#f5c558" }}
          >
            ● Features
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
            <em>Six pillars.</em>
            <br /> One product loop.
          </h1>
          <p
            className="text-text-dim mx-auto"
            style={{ fontSize: 17, lineHeight: 1.55, maxWidth: 600 }}
          >
            We didn&apos;t set out to be the most features. We set out to be the
            most useful platform on a Saturday afternoon when the wind picks up
            and you need to know what to do.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 lg:px-12 pb-24 space-y-8">
        {PILLARS.map((p, i) => (
          <Pillar key={i} pillar={p} flip={i % 2 === 1} />
        ))}
      </div>

      <section
        className="text-center py-16 border-t border-line"
        style={{ background: "rgba(0,0,0,0.18)" }}
      >
        <h2
          className="serif-italic mb-3"
          style={{ fontSize: 40, letterSpacing: -0.5, fontStyle: "normal" }}
        >
          <em>Ready to bet smarter?</em>
        </h2>
        <p
          className="text-text-dim mb-7 mx-auto"
          style={{ fontSize: 15, maxWidth: 480 }}
        >
          Free tier, no card required. Forward your first bet email in under two
          minutes.
        </p>
        <Link
          href="/login"
          className="font-bold inline-block"
          style={{
            background: "#8ee68e",
            color: "#06140c",
            padding: "12px 28px",
            borderRadius: 8,
            fontSize: 15,
          }}
        >
          Open the dashboard →
        </Link>
      </section>

      <MarketingFooter />
    </main>
  );
}

function Pillar({
  pillar,
  flip,
}: {
  pillar: (typeof PILLARS)[number];
  flip: boolean;
}) {
  return (
    <div
      className="rounded-[18px] p-7 lg:p-10 border border-line grid lg:grid-cols-2 gap-8"
      style={{
        background:
          "linear-gradient(135deg, rgba(16,38,25,1) 0%, rgba(11,26,17,1) 100%)",
        direction: flip ? "rtl" : "ltr",
      }}
    >
      <div style={{ direction: "ltr" }}>
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
        >
          ● {pillar.label}
        </span>
        <h3
          className="serif-italic mt-2 mb-4"
          style={{
            fontSize: 32,
            letterSpacing: -0.4,
            lineHeight: 1.1,
            fontStyle: "normal",
            color: "#f0ebe0",
          }}
        >
          <em>{pillar.title}</em>
        </h3>
        <p
          className="text-text-dim"
          style={{ fontSize: 14.5, lineHeight: 1.55 }}
        >
          {pillar.body}
        </p>
      </div>
      <ul style={{ direction: "ltr" }} className="space-y-2.5">
        {pillar.bullets.map((b, i) => (
          <li
            key={i}
            className="flex items-start gap-2.5 text-text-dim"
            style={{ fontSize: 13.5, lineHeight: 1.5 }}
          >
            <span
              className="num font-bold shrink-0 mt-px"
              style={{ color: "#8ee68e", fontSize: 13 }}
            >
              ✓
            </span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
