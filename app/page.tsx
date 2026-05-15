import Link from "next/link";
import { Nav } from "@/components/brand/Nav";

export default function MarketingHome() {
  return (
    <main className="min-h-screen bg-paper">
      <Nav />

      <section className="relative overflow-hidden bg-green-deep text-white">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-24 md:py-32">
          <div className="inline-block text-gold text-xs uppercase tracking-[0.2em] mb-6">
            Greenside Edge · Intelligence for Golf Bettors
          </div>
          <h1 className="font-display text-5xl md:text-7xl leading-[1.05] mb-6">
            Every bet. Every book.
            <br />
            <em className="text-gold-light">One edge.</em>
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mb-10">
            Track every golf bet across DraftKings, FanDuel, PrizePicks, and
            Underdog. Get live course-condition alerts when wind or weather
            shifts your EV. Build DFS lineups that account for the wave.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/dashboard"
              className="bg-gold text-green-deep px-6 py-3 rounded font-semibold hover:bg-gold-light"
            >
              Open Dashboard
            </Link>
            <Link
              href="/dashboard/upload"
              className="border border-white/30 text-white px-6 py-3 rounded font-semibold hover:bg-white/10"
            >
              Upload a Bet Slip
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 md:px-12 py-20 grid md:grid-cols-3 gap-8">
        <Feature
          label="Aggregation"
          title="One dashboard, every book"
          body="Snap a screenshot of any bet slip — DK, FD, PrizePicks, Underdog — and we extract the line, odds, and stake. See total exposure, correlated risk, and live P&L across all your books in one place."
        />
        <Feature
          label="Live Alerts"
          title="Conditions that move EV"
          body="When wind picks up at Quail Hollow or rain hits the AM wave at TPC Sawgrass, we notify you instantly with the bets in your portfolio that just shifted — and by how much."
        />
        <Feature
          label="DFS Edge"
          title="Wave-aware lineup builder"
          body="DK DFS optimizer that prices in tee-time wave, course-fit, and live weather. Build, save, and deep-link lineups straight to DraftKings."
        />
      </section>

      <footer className="border-t border-cream-dark py-10 text-center text-sm text-ink-light">
        <p>
          Greenside Edge is a product of Greenside Journeys. For entertainment
          and informational purposes only. 21+. Gamble responsibly.
        </p>
      </footer>
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
    <div className="card p-6">
      <div className="text-xs uppercase tracking-[0.2em] text-gold mb-3">
        {label}
      </div>
      <h3 className="font-display text-2xl mb-3">{title}</h3>
      <p className="text-ink-mid leading-relaxed">{body}</p>
    </div>
  );
}
