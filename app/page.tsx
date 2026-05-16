import Link from "next/link";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Nav";

export default function MarketingHome() {
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
            ● R2 · Quail Hollow · wind 14g22 by tee time
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
            tracker that knew the
            <br />
            wind was changing.
          </h1>
          <p
            className="text-text-dim mb-8 max-w-2xl"
            style={{ fontSize: 19, lineHeight: 1.5 }}
          >
            Forward your DK / FD / PrizePicks confirmations and we&apos;ll grade
            them against the live ESPN scoreboard, alert you the second a leg
            transitions, and tell you which of your Scheffler outrights just
            got cheaper because the PM wave is in 22-mph gusts.
          </p>

          <div className="flex flex-wrap gap-3 mb-12">
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded font-semibold"
              style={{ background: "#8ee68e", color: "#06140c", fontSize: 15 }}
            >
              Open Dashboard
            </Link>
            <Link
              href="/dashboard/ownership"
              className="px-6 py-3 rounded font-semibold border border-line text-text hover:bg-surface-1"
              style={{ fontSize: 15 }}
            >
              Browse the ownership DB
            </Link>
          </div>

          {/* Hand-counted, specific metrics — not "trusted by thousands" */}
          <div className="flex flex-wrap gap-6 lg:gap-10 text-text-dim" style={{ fontSize: 13 }}>
            <NumberChip num="696" label="DK ownership records, 14 events" />
            <NumberChip num="6" label="bet markets graded against live ESPN" />
            <NumberChip num="30s" label="email → parsed into your tickets" />
            <NumberChip num="0" label="affiliate links, ever" />
          </div>
        </div>
      </section>

      {/* ─── A real Sunday, narrated ────────────────────── */}
      <section className="border-t border-line">
        <div className="max-w-5xl mx-auto px-6 lg:px-12 py-20">
          <div
            className="num font-semibold uppercase mb-3"
            style={{ fontSize: 11, letterSpacing: 1.6, color: "#7fd49a" }}
          >
            ● A Sunday at Greenside
          </div>
          <h2
            className="serif-italic mb-12"
            style={{ fontSize: 40, letterSpacing: -0.5, lineHeight: 1.1, fontStyle: "normal" }}
          >
            <em>What actually happens</em>
            <br />
            when you use it.
          </h2>

          <ol className="space-y-7">
            <Beat
              time="06:48"
              title="You forward a slip."
              body="A DK confirmation for Scheffler Top 10 +250, Hovland vs Cantlay −115 R3 matchup, and a Justin Rose make-cut. Inbox → bets+token@greensidejourneys.com. Claude parses each leg. By 06:48:23 they're in your Tickets queue with a Confirm / Dismiss prompt."
            />
            <Beat
              time="09:12"
              title="The forecast moves."
              body="Tomorrow.io's PM-wave reading at Quail jumps from 12 to 22 mph. Push notification on your phone names the two bets in your slip that just shifted EV, and by how much. No spam — only the legs you actually own."
            />
            <Beat
              time="14:36"
              title="A leg flips."
              body="Hovland chips in for eagle on 14, Cantlay misses the green. Cron grader (every 15 min) sees the R3 matchup transition live → won, fires a push, marks the row green on /dashboard/bets. Your live PnL updates without a refresh."
            />
            <Beat
              time="20:04"
              title="The leaderboard wraps."
              body="Make-cut on Rose grades when the projected cut line locks. Tickets page summary stat ticks up. You hit /dashboard/ownership to see whether to fade Scheffler chalk next week — he's been 27% / 32% / 26% across the last three signature events."
            />
          </ol>
        </div>
      </section>

      {/* ─── Asymmetric capability grid ────────────────── */}
      <section className="border-t border-line bg-surface-1/30">
        <div className="max-w-5xl mx-auto px-6 lg:px-12 py-20">
          <div
            className="num font-semibold uppercase mb-3"
            style={{ fontSize: 11, letterSpacing: 1.6, color: "#f5c558" }}
          >
            ● Under the hood
          </div>
          <h2
            className="serif-italic mb-10"
            style={{ fontSize: 40, letterSpacing: -0.5, lineHeight: 1.1, fontStyle: "normal" }}
          >
            <em>The boring stuff</em>
            <br />
            that makes it work.
          </h2>

          <div
            className="grid gap-5"
            style={{ gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)" }}
          >
            <Slab
              label="Ingestion"
              title="Three ways to get a bet into Greenside."
              body="The email forward is the recommended path — set a Gmail filter once, every confirmation flows in. Screenshot upload runs the same Claude vision pipeline as a fallback. Browser bookmarklet handles the case where you're already on the sportsbook page."
              metrics={[
                { n: "DK · FD · PP · UD · CZR · MGM", l: "books recognized" },
                { n: "<5s", l: "average parse latency" },
              ]}
            />
            <Slab
              label="Grading"
              title="Real markets, not just outright."
              body="Top N, head-to-head matchups (with round narrowing), 3-balls, round props over/under on strokes / birdies / bogeys / eagles, and make/miss cut. Each one has a dedicated grader against the live ESPN snapshot."
            />
          </div>

          <div
            className="grid gap-5 mt-5"
            style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)" }}
          >
            <Slab
              label="Notifications"
              title="VAPID web push, scoped to your slips."
              body="When a bet you actually have transitions live → won / lost, a push hits your phone within 60s of the swing. Multi-device subscription dedup, automatic 410-Gone pruning."
            />
            <Slab
              label="DFS ownership"
              title="The dataset you can't get anywhere else."
              body="Hand-curated DraftKings finishing ownership for every 2026 PGA event so far. Slice by player, tournament, or course. Leverage cards on the optimizer flag chronically under-owned price tiers and over-projected chalk."
              metrics={[
                { n: "696", l: "records" },
                { n: "14", l: "events" },
                { n: "15", l: "unique courses" },
              ]}
            />
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

function NumberChip({ num, label }: { num: string; label: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span
        className="serif-italic"
        style={{
          fontSize: 28,
          letterSpacing: -0.4,
          fontStyle: "italic",
          color: "#f0ebe0",
          lineHeight: 1,
        }}
      >
        {num}
      </span>
      <span className="num text-text-dim" style={{ fontSize: 12 }}>
        {label}
      </span>
    </div>
  );
}

function Beat({
  time,
  title,
  body,
}: {
  time: string;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-5">
      <span
        className="num shrink-0"
        style={{
          fontSize: 12,
          letterSpacing: 0.6,
          color: "#a8b3ac",
          width: 56,
          paddingTop: 4,
        }}
      >
        {time}
      </span>
      <div className="min-w-0 flex-1">
        <div
          className="text-text font-medium mb-1"
          style={{ fontSize: 17, lineHeight: 1.3 }}
        >
          {title}
        </div>
        <p className="text-text-dim" style={{ fontSize: 14.5, lineHeight: 1.55 }}>
          {body}
        </p>
      </div>
    </li>
  );
}

function Slab({
  label,
  title,
  body,
  metrics,
}: {
  label: string;
  title: string;
  body: string;
  metrics?: { n: string; l: string }[];
}) {
  return (
    <div className="rounded-[16px] border border-line bg-bg p-6 lg:p-7">
      <div
        className="num font-semibold uppercase mb-2"
        style={{ fontSize: 10, letterSpacing: 1.3, color: "#a8b3ac" }}
      >
        {label}
      </div>
      <h3
        className="text-text mb-2"
        style={{ fontSize: 22, letterSpacing: -0.3, lineHeight: 1.2, fontWeight: 500 }}
      >
        {title}
      </h3>
      <p className="text-text-dim" style={{ fontSize: 14, lineHeight: 1.55 }}>
        {body}
      </p>
      {metrics && metrics.length > 0 && (
        <div className="mt-5 pt-5 border-t border-line/60 flex flex-wrap gap-x-8 gap-y-3">
          {metrics.map((m, i) => (
            <div key={i}>
              <div className="num" style={{ fontSize: 16, color: "#f0ebe0", fontWeight: 500 }}>
                {m.n}
              </div>
              <div
                className="num text-text-muted"
                style={{ fontSize: 10.5, letterSpacing: 0.5 }}
              >
                {m.l}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
