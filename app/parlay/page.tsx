"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/edge/primitives";
import {
  fetchLeaderboard,
  type LeaderboardSnapshot,
} from "@/lib/espn-leaderboard";
import { gradeBet, type Decision } from "@/lib/grading";
import {
  FEATURED_PARLAY,
  featuredLegToOpenBet,
  type FeaturedLeg,
} from "@/lib/data/featured-parlay";

// Public "parlay of the week" tracker. Grades the curated featured slip
// live against the ESPN leaderboard so anyone can watch it without an
// account. Refreshes every 60s.

const STATUS_COLOR: Record<Decision["status"], string> = {
  won: "#7fd49a",
  lost: "#e57373",
  live: "#f5c558",
  push: "#a8b3ac",
  unknown: "#6c7a72",
};
const STATUS_LABEL: Record<Decision["status"], string> = {
  won: "Hit",
  lost: "Missed",
  live: "In play",
  push: "Push",
  unknown: "Not started",
};

export default function PublicParlayPage() {
  const [snapshot, setSnapshot] = useState<LeaderboardSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetchLeaderboard()
        .then((s) => {
          if (!cancelled) setSnapshot(s);
        })
        .catch(() => undefined);
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const decisions: (Decision | null)[] = FEATURED_PARLAY.legs.map((leg) =>
    snapshot ? gradeBet(featuredLegToOpenBet(leg), snapshot) : null,
  );

  const hit = decisions.filter((d) => d?.status === "won").length;
  const missed = decisions.filter((d) => d?.status === "lost").length;
  const alive = missed === 0;

  return (
    <main className="min-h-[100dvh] bg-bg px-5 py-10 lg:py-14">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark size={26} />
            <span
              className="serif-italic"
              style={{ fontSize: 22, color: "#f0ebe0", letterSpacing: -0.3, fontStyle: "normal" }}
            >
              Greenside
            </span>
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded font-semibold"
            style={{ background: "#8ee68e", color: "#06140c", fontSize: 13 }}
          >
            Track your own →
          </Link>
        </header>

        <div
          className="num font-semibold uppercase mb-2"
          style={{ fontSize: 11, letterSpacing: 1.6, color: "#f5c558" }}
        >
          ● Parlay of the week · live
        </div>
        <h1
          className="serif-italic text-text mb-2"
          style={{ fontSize: 34, letterSpacing: -0.5, lineHeight: 1.1, fontStyle: "normal" }}
        >
          {FEATURED_PARLAY.legs.length} legs, one card.
        </h1>
        <p className="text-text-dim mb-6" style={{ fontSize: 14, lineHeight: 1.5 }}>
          {FEATURED_PARLAY.book} · {FEATURED_PARLAY.event} · {FEATURED_PARLAY.venue}.
          We grade every leg against the live ESPN scoreboard.
        </p>

        <div className="grid grid-cols-3 gap-3 mb-7">
          <Stat label="Entry" value={`$${FEATURED_PARLAY.entry}`} />
          <Stat
            label="To pay"
            value={`$${FEATURED_PARLAY.payout.toLocaleString()}`}
            accent="#8ee68e"
          />
          <Stat
            label="Status"
            value={snapshot ? (alive ? `${hit}/${FEATURED_PARLAY.legs.length} alive` : "Busted") : "…"}
            accent={alive ? "#7fd49a" : "#e57373"}
          />
        </div>

        <div className="rounded-[16px] border border-line bg-surface-1 overflow-hidden">
          {FEATURED_PARLAY.legs.map((leg, i) => (
            <LegRow
              key={i}
              leg={leg}
              decision={decisions[i]}
              last={i === FEATURED_PARLAY.legs.length - 1}
            />
          ))}
        </div>

        <p className="text-text-muted mt-5" style={{ fontSize: 11.5, lineHeight: 1.5 }}>
          Round 1 props. Updates every 60 seconds while the round is live. Not
          betting advice — 21+, for entertainment only.
        </p>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-[12px] border border-line bg-surface-1 px-3 py-2.5">
      <div
        className="num uppercase text-text-muted mb-1"
        style={{ fontSize: 9.5, letterSpacing: 1 }}
      >
        {label}
      </div>
      <div
        className="num font-semibold"
        style={{ fontSize: 16, color: accent ?? "#f0ebe0" }}
      >
        {value}
      </div>
    </div>
  );
}

function LegRow({
  leg,
  decision,
  last,
}: {
  leg: FeaturedLeg;
  decision: Decision | null;
  last: boolean;
}) {
  const status = decision?.status ?? "unknown";
  const color = STATUS_COLOR[status];
  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5"
      style={{ borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.06)" }}
    >
      <div
        className="shrink-0 self-stretch rounded-full"
        style={{ width: 3, background: color }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-text font-semibold truncate" style={{ fontSize: 14.5 }}>
            {leg.player}
          </span>
          <span
            className="num font-semibold uppercase shrink-0"
            style={{ fontSize: 9.5, letterSpacing: 0.8, color }}
          >
            {STATUS_LABEL[status]}
          </span>
        </div>
        <div className="text-text-dim mt-0.5" style={{ fontSize: 12.5 }}>
          {leg.pick}
        </div>
        <div className="num text-text-muted mt-1" style={{ fontSize: 10.5 }}>
          {leg.teeLabel}
          {decision?.reason ? ` · ${decision.reason}` : ""}
        </div>
      </div>
    </div>
  );
}
