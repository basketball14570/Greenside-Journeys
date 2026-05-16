import Link from "next/link";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Nav";

export default function MarketingHome() {
  return (
    <main className="min-h-screen bg-bg text-text">
      <MarketingNav />

      <section className="relative overflow-hidden">
        <div
          className="absolute pointer-events-none rounded-full"
          style={{
            top: -120,
            right: -120,
            width: 480,
            height: 480,
            background:
              "radial-gradient(circle, rgba(245,197,88,0.15) 0%, transparent 65%)",
          }}
        />
        <div className="relative max-w-5xl mx-auto px-6 lg:px-12 py-20 lg:py-32">
          <span
            className="num font-semibold uppercase"
            style={{
              fontSize: 11,
              letterSpacing: 1.6,
              color: "#f5c558",
            }}
          >
            ● Conditions Edge · for serious golf bettors
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
            <em>Wind&apos;s up.</em>
            <br />
            Your edge just moved.
          </h1>
          <p
            className="text-text-dim mb-10 max-w-2xl"
            style={{ fontSize: 19, lineHeight: 1.45 }}
          >
            Greenside tracks every bet across every book, watches the wind on
            every course, and tells you the moment your portfolio&apos;s EV
            shifts. Wave-aware DFS lineups, live conditions alerts, one
            dashboard for golf.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className="px-6 py-3 rounded font-semibold"
              style={{ background: "#8ee68e", color: "#06140c", fontSize: 15 }}
            >
              Open Dashboard
            </Link>
            <Link
              href="/features"
              className="px-6 py-3 rounded font-semibold border border-line text-text hover:bg-surface-1"
              style={{ fontSize: 15 }}
            >
              Tour the features
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 lg:px-12 pb-24 grid lg:grid-cols-3 gap-5">
        <Feature
          label="Aggregation"
          title="Every book, one screen"
          body="Forward bet emails or snap a slip — Claude vision extracts the line, odds, and stake. Total exposure and correlated risk live in one dashboard."
        />
        <Feature
          label="Live Alerts"
          title="Wind that moves EV"
          body="When the forecast jumps from 8 to 18 mph at Quail Hollow, we tell you which of your bets just got cheaper and which just got expensive — with the math, not a vibe."
        />
        <Feature
          label="Ask Greenside"
          title="Talk to your portfolio"
          body="Conversational AI grounded in your actual data. 'Hedge my McIlroy bet' or 'show me my +EV AM-wave bets' — answered with the math, not vibes."
        />
      </section>

      <MarketingFooter />
    </main>
  );
}

function Feature({
  label,
  title,
  body,
}: {
  label: string;
  title: string;
  body: string;
}) {
  return (
    <div className="p-5 rounded-[14px] bg-surface-1 border border-line">
      <span
        className="num font-semibold uppercase"
        style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
      >
        {label}
      </span>
      <h3
        className="serif-italic mt-2 mb-2"
        style={{
          fontSize: 24,
          letterSpacing: -0.3,
          fontStyle: "normal",
          color: "#f0ebe0",
        }}
      >
        {title}
      </h3>
      <p className="text-text-dim" style={{ fontSize: 14, lineHeight: 1.5 }}>
        {body}
      </p>
    </div>
  );
}
