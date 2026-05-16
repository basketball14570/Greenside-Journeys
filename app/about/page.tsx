import Link from "next/link";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Nav";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-bg text-text">
      <MarketingNav />

      <section className="max-w-3xl mx-auto px-6 lg:px-12 pt-12 pb-20">
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 11, letterSpacing: 1.6, color: "#f5c558" }}
        >
          ● About Greenside
        </span>
        <h1
          className="serif-italic mt-3 mb-6"
          style={{ fontSize: 56, lineHeight: 1.05, letterSpacing: -0.8, fontStyle: "normal" }}
        >
          <em>Built for the bettor</em> who reads weather reports before tee
          time.
        </h1>

        <div className="space-y-6 text-text-dim" style={{ fontSize: 16, lineHeight: 1.65 }}>
          <p>
            Greenside is a product of Greenside Journeys, the insider&apos;s
            guide to tournament golf travel. We started Greenside Edge because
            we kept watching the wind pick up at Pebble or Quail Hollow and
            realizing our bet portfolio just moved — but no tool could tell us
            by how much, or which legs were exposed, or whether a hedge had
            opened up across books.
          </p>

          <p>
            Existing tools each solved one piece. Pikkit aggregates bets across
            books but isn&apos;t golf-aware. Action Network sells picks but
            doesn&apos;t see your portfolio. DataGolf has the models but no
            bettor-facing surface. We built Greenside to be the connective
            tissue — your portfolio meets the conditions meets the math.
          </p>

          <p>
            We don&apos;t accept wagers. We don&apos;t take a cut of your wins.
            We never ask for your sportsbook password. We&apos;re an analytics
            product paid for by the people who use us — and by affiliate
            commissions on the free tier where users opt in.
          </p>

          <h2
            className="serif-italic mt-10 mb-3 text-text"
            style={{ fontSize: 28, letterSpacing: -0.4, fontStyle: "normal" }}
          >
            <em>What we believe</em>
          </h2>

          <ul className="space-y-3">
            {[
              "Sharp bettors are misunderstood — most of them lose to bad bet sizing, not bad picks. We surface the math.",
              "Conditions move EV more than most bettors realize, and faster than most can react. Push notifications close that gap.",
              "Credential-based scraping is a non-starter. Forwarding emails and snapping screenshots is enough.",
              "AI is best when it's grounded in your data via tool use. Greenside answers from your numbers, not its training set.",
              "Responsible gambling is a feature, not a disclaimer. Hard caps and self-exclusion belong in settings, not buried.",
            ].map((tenet, i) => (
              <li key={i} className="flex items-start gap-3" style={{ fontSize: 15 }}>
                <span
                  className="num font-bold shrink-0 mt-1"
                  style={{ color: "#8ee68e", fontSize: 13 }}
                >
                  ✓
                </span>
                <span>{tenet}</span>
              </li>
            ))}
          </ul>

          <h2
            className="serif-italic mt-10 mb-3 text-text"
            style={{ fontSize: 28, letterSpacing: -0.4, fontStyle: "normal" }}
          >
            <em>How to reach us</em>
          </h2>
          <p>
            Press, partnerships, or sharp tier inquiries:{" "}
            <a
              href="mailto:hello@greensidejourneys.com"
              className="text-text underline underline-offset-4"
            >
              hello@greensidejourneys.com
            </a>
            . Product feedback from active users always reaches a founder.
          </p>
        </div>

        <div className="mt-12 flex gap-3 flex-wrap">
          <Link
            href="/login"
            className="font-bold inline-block"
            style={{
              background: "#8ee68e",
              color: "#06140c",
              padding: "11px 22px",
              borderRadius: 6,
              fontSize: 14,
            }}
          >
            Open dashboard
          </Link>
          <Link
            href="/pricing"
            className="font-semibold inline-block border border-line text-text hover:bg-surface-1"
            style={{
              padding: "11px 22px",
              borderRadius: 6,
              fontSize: 14,
            }}
          >
            See pricing
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
