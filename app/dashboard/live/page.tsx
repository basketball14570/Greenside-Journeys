"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchLeaderboard,
  type LeaderboardSnapshot,
} from "@/lib/espn-leaderboard";
import { gradeBet, type Decision, type OpenBet } from "@/lib/grading";

// Mobile Live tab. Pulls the signed-in user's open bets (anything not
// settled — "pending" + "live") and grades each one against the latest
// ESPN leaderboard so the user can see what's live and where it stands
// without leaving their phone.
//
// Desktop has the dedicated /dashboard/parlay tracker; this page is
// scoped tighter (single column, no leaderboard duplication) for one-
// handed glance use during the round.

type ApiBet = {
  id: string;
  book: string;
  player: string;
  market: string;
  line: number | null;
  american_odds: number;
  stake: number;
  to_win: number;
  status: string;
  resolved_at: string | null;
  resolved_payout: number | null;
  created_at: string;
};

function apiBetToOpenBet(b: ApiBet): OpenBet {
  return {
    id: b.id,
    player: b.player,
    market: b.market,
    line: b.line !== null ? String(b.line) : String(b.american_odds),
    stake: Number(b.stake),
    payout: Number(b.to_win),
  };
}

const STATUS_COLOR: Record<Decision["status"], string> = {
  won: "#7fd49a",
  lost: "#e57373",
  live: "#f5c558",
  push: "#a8b3ac",
  unknown: "#6c7a72",
};

const STATUS_LABEL: Record<Decision["status"], string> = {
  won: "Winning",
  lost: "Losing",
  live: "In play",
  push: "Push",
  unknown: "Awaiting",
};

export default function MobileLivePage() {
  const [bets, setBets] = useState<ApiBet[] | null>(null);
  const [snapshot, setSnapshot] = useState<LeaderboardSnapshot | null>(null);
  const [signedIn, setSignedIn] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [bRes, lb] = await Promise.all([
          fetch("/api/bets/mine?limit=200", { cache: "no-store" }),
          fetchLeaderboard().catch(() => null),
        ]);
        if (cancelled) return;
        if (bRes.ok) {
          const j = await bRes.json();
          if (j.signedIn === false) setSignedIn(false);
          else {
            const open = (j.bets ?? []).filter(
              (b: ApiBet) =>
                b.status === "live" ||
                b.status === "pending" ||
                b.status === "open",
            );
            setBets(open);
          }
        }
        setSnapshot(lb);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    // Refresh every 60s so the live grades stay current.
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const graded: { bet: ApiBet; decision: Decision | null }[] = (bets ?? []).map(
    (b) => ({
      bet: b,
      decision: snapshot ? gradeBet(apiBetToOpenBet(b), snapshot) : null,
    }),
  );

  return (
    <div className="px-5 py-5 space-y-5">
      <header>
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
        >
          ● Live tickets
        </span>
        <h1
          className="serif-italic mt-1"
          style={{ fontSize: 30, letterSpacing: -0.3, fontStyle: "normal" }}
        >
          <em>Tracking now.</em>
        </h1>
        <p className="text-text-dim mt-1" style={{ fontSize: 13 }}>
          Open bets graded against the live ESPN leaderboard. Updates every
          minute.
        </p>
      </header>

      {!signedIn && <SignInPrompt />}

      {signedIn && loading && bets === null && <SkeletonRows />}

      {signedIn && bets !== null && bets.length === 0 && <EmptyState />}

      {signedIn && graded.length > 0 && (
        <ul className="space-y-2.5">
          {graded.map((g) => (
            <LiveBetCard key={g.bet.id} bet={g.bet} decision={g.decision} />
          ))}
        </ul>
      )}
    </div>
  );
}

function LiveBetCard({
  bet,
  decision,
}: {
  bet: ApiBet;
  decision: Decision | null;
}) {
  const status = decision?.status ?? "unknown";
  const color = STATUS_COLOR[status];
  const label = STATUS_LABEL[status];
  return (
    <li
      className="rounded-[14px] border border-line bg-surface-1 p-3.5"
      style={{ boxShadow: "0 1px 0 rgba(0,0,0,0.15)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="num font-semibold uppercase"
          style={{
            fontSize: 9.5,
            letterSpacing: 1.1,
            color,
            padding: "2.5px 7px",
            borderRadius: 4,
            background: `${color}1f`,
            border: `1px solid ${color}33`,
          }}
        >
          ● {label}
        </span>
        <span
          className="num"
          style={{ fontSize: 11, color: "#a8b3ac", letterSpacing: 0.3 }}
        >
          {bet.book.toUpperCase()} · {fmtOdds(bet.american_odds)}
        </span>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>{bet.player}</h3>
        <span className="num" style={{ fontSize: 12, color: "#a8b3ac" }}>
          {Number(bet.stake).toFixed(2)}u → {Number(bet.to_win).toFixed(2)}u
        </span>
      </div>
      <p
        className="mt-1 text-text-dim"
        style={{ fontSize: 13, lineHeight: 1.4 }}
      >
        {bet.market}
        {bet.line !== null ? ` · ${bet.line}` : ""}
      </p>
      {decision?.reason && (
        <p
          className="mt-2 num"
          style={{ fontSize: 11, color: "#a8b3ac", letterSpacing: 0.2 }}
        >
          {decision.reason}
          {decision.observedValue !== undefined &&
            ` · observed ${decision.observedValue}`}
        </p>
      )}
    </li>
  );
}

function fmtOdds(american: number): string {
  if (american > 0) return `+${american}`;
  return String(american);
}

function SkeletonRows() {
  return (
    <ul className="space-y-2.5">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="rounded-[14px] border border-line bg-surface-1 p-3.5 animate-pulse"
          style={{ height: 96 }}
        />
      ))}
    </ul>
  );
}

function EmptyState() {
  return (
    <div
      className="rounded-[14px] border border-line bg-surface-1 p-5 text-center space-y-3"
      style={{ boxShadow: "0 1px 0 rgba(0,0,0,0.15)" }}
    >
      <h3 style={{ fontSize: 17, fontWeight: 600 }}>No bets in play.</h3>
      <p className="text-text-dim" style={{ fontSize: 13.5, lineHeight: 1.45 }}>
        Anything you forward from your sportsbook will show up here while the
        tournament is running.
      </p>
      <div className="flex gap-2.5 justify-center pt-1">
        <Link
          href="/dashboard/upload"
          className="num font-semibold uppercase"
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            fontSize: 11,
            letterSpacing: 0.8,
            color: "#8ee68e",
            background: "rgba(142,230,142,0.13)",
            border: "1px solid rgba(142,230,142,0.3)",
          }}
        >
          + Add bet
        </Link>
        <Link
          href="/dashboard/bets"
          className="num font-semibold uppercase"
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            fontSize: 11,
            letterSpacing: 0.8,
            color: "#a8b3ac",
            background: "rgba(168,179,172,0.1)",
            border: "1px solid rgba(168,179,172,0.2)",
          }}
        >
          All tickets
        </Link>
      </div>
    </div>
  );
}

function SignInPrompt() {
  return (
    <div className="rounded-[14px] border border-line bg-surface-1 p-5 text-center space-y-2">
      <h3 style={{ fontSize: 17, fontWeight: 600 }}>Sign in to track bets.</h3>
      <p className="text-text-dim" style={{ fontSize: 13.5, lineHeight: 1.45 }}>
        Live grading needs your bets table — sign in to see them here.
      </p>
      <Link
        href="/login"
        className="num font-semibold uppercase inline-block mt-2"
        style={{
          padding: "8px 14px",
          borderRadius: 8,
          fontSize: 11,
          letterSpacing: 0.8,
          color: "#8ee68e",
          background: "rgba(142,230,142,0.13)",
          border: "1px solid rgba(142,230,142,0.3)",
        }}
      >
        Sign in
      </Link>
    </div>
  );
}
