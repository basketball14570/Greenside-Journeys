"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookChip, type Book } from "@/components/edge/primitives";
import { PlayerAvatar } from "@/components/edge/PlayerAvatar";
import { useLeaderboard } from "@/lib/leaderboard-context";
import type { LeaderboardPlayer } from "@/lib/espn-leaderboard";

// Dashboard-home open-tickets widget. Pulls the signed-in user's real
// live/pending bets from /api/bets/mine and renders a compact list, or a
// clean upload CTA when there are none. No demo data, no fabricated EV.

type RawBet = {
  id: string;
  book: string;
  player: string;
  market: string;
  line: number | null;
  stake: number;
  to_win: number;
  status: string;
};

const BOOK_MAP: Record<string, Book> = {
  draftkings: "DK",
  fanduel: "FD",
  prizepicks: "PP",
  underdog: "UD",
};

export function LiveOpenBets({ layout }: { layout: "mobile" | "desktop" }) {
  const [state, setState] = useState<
    { kind: "loading" } | { kind: "ready"; bets: RawBet[] }
  >({ kind: "loading" });
  const { findPlayer } = useLeaderboard();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/bets/mine?limit=50", { cache: "no-store" });
        const j = await r.json();
        if (cancelled) return;
        const all = Array.isArray(j.bets) ? (j.bets as RawBet[]) : [];
        const open = all.filter(
          (b) => b.status === "live" || b.status === "pending",
        );
        setState({ kind: "ready", bets: open });
      } catch {
        if (!cancelled) setState({ kind: "ready", bets: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const wrap = layout === "mobile" ? "mb-6 mx-5" : "";

  const header = (
    <div className="flex items-baseline justify-between mb-2.5">
      <span className="flex items-baseline gap-2.5">
        <span
          className="inline-block self-center rounded-full"
          style={{ width: 3, height: 18, background: "#7fd49a" }}
        />
        <span
          className="serif-italic text-text"
          style={{ fontSize: 17, letterSpacing: -0.2, fontStyle: "normal" }}
        >
          Open Tickets · This Event
        </span>
      </span>
      <Link
        href="/dashboard/bets"
        className="num text-text-muted hover:text-text"
        style={{ fontSize: 11, letterSpacing: 0.4 }}
      >
        All tickets →
      </Link>
    </div>
  );

  if (state.kind === "loading") {
    return (
      <div className={wrap}>
        {header}
        <div className="rounded-[14px] bg-surface-1 border border-line p-5 text-text-dim" style={{ fontSize: 13 }}>
          Loading your tickets…
        </div>
      </div>
    );
  }

  if (state.bets.length === 0) {
    return (
      <div className={wrap}>
        {header}
        <div className="rounded-[14px] bg-surface-1 border border-line p-6 text-center">
          <p className="text-text-dim mb-3" style={{ fontSize: 13.5, lineHeight: 1.5 }}>
            No open tickets yet. Upload a slip and we&apos;ll grade it against
            the live leaderboard.
          </p>
          <Link
            href="/dashboard/upload"
            className="inline-block px-4 py-2 rounded font-semibold"
            style={{ background: "#8ee68e", color: "#06140c", fontSize: 13 }}
          >
            Upload a slip
          </Link>
        </div>
      </div>
    );
  }

  const groups = groupByTeeStatus(state.bets, findPlayer);

  return (
    <div className={wrap}>
      {header}
      <div className="rounded-[14px] bg-surface-1 border border-line overflow-hidden">
        {groups.map((group, gi) => (
          <div key={group.key}>
            <SectionHeader
              label={group.label}
              count={group.bets.length}
              accent={group.accent}
              topBorder={gi > 0}
            />
            {group.bets.map((entry, i) => (
              <BetRow
                key={entry.bet.id}
                entry={entry}
                isLast={i === group.bets.length - 1}
                dim={group.key === "done"}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Group + sort the bets so the widget reads as a timeline of the day:
// live action up top, who's teeing off next in the middle, finished bets
// (still pending grading) at the bottom. Bets we can't match to a player
// on the live leaderboard go in "other" so they don't disappear.
type BetEntry = {
  bet: RawBet;
  player: LeaderboardPlayer | null;
  bucket: "live" | "upcoming" | "done" | "other";
  // For sort: smaller = appears first within its group.
  sortKey: number;
};

type Group = {
  key: BetEntry["bucket"];
  label: string;
  accent: string;
  bets: BetEntry[];
};

function groupByTeeStatus(
  bets: RawBet[],
  findPlayer: (name: string) => LeaderboardPlayer | null,
): Group[] {
  const entries: BetEntry[] = bets.map((bet) => {
    const player = findPlayer(bet.player);
    return { bet, player, ...classify(player) };
  });

  const buckets: Group[] = [
    { key: "live", label: "Live", accent: "#7fd49a", bets: [] },
    { key: "upcoming", label: "Teeing off", accent: "#cdb47a", bets: [] },
    { key: "done", label: "Done today", accent: "#6c7a72", bets: [] },
    { key: "other", label: "Other", accent: "#6c7a72", bets: [] },
  ];
  for (const e of entries) buckets.find((b) => b.key === e.bucket)!.bets.push(e);
  for (const b of buckets) b.bets.sort((a, c) => a.sortKey - c.sortKey);
  return buckets.filter((b) => b.bets.length > 0);
}

function classify(player: LeaderboardPlayer | null): {
  bucket: BetEntry["bucket"];
  sortKey: number;
} {
  if (!player) return { bucket: "other", sortKey: Number.MAX_SAFE_INTEGER };
  const today = player.todayLine;
  // ESPN populates todayLine the moment a player tees off, so its mere
  // presence is the "they're playing today" signal. thru can still be
  // null in that window (just teed, no holes complete yet) — earlier
  // code missed that and dropped first-hole players into "upcoming".
  if (today) {
    if (today.complete || today.thru === 18) {
      return { bucket: "done", sortKey: 0 };
    }
    // Live: closer to finishing = smaller sortKey = sorts to the top of
    // the section. Just-teed players (thru null) sort last within Live.
    return { bucket: "live", sortKey: 18 - (today.thru ?? 0) };
  }
  if (player.teeTime) {
    const t = Date.parse(player.teeTime);
    return { bucket: "upcoming", sortKey: Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER };
  }
  // Unknown state — between rounds, cut, withdrew, etc. Treat as "other"
  // so we don't pretend to know when they're playing.
  return { bucket: "other", sortKey: Number.MAX_SAFE_INTEGER };
}

function SectionHeader({
  label,
  count,
  accent,
  topBorder,
}: {
  label: string;
  count: number;
  accent: string;
  topBorder: boolean;
}) {
  return (
    <div
      className="px-3 py-1.5 flex items-center gap-2"
      style={{
        background: "rgba(255,255,255,0.02)",
        borderTop: topBorder ? "1px solid rgba(255,255,255,0.06)" : "none",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <span
        className="inline-block rounded-full"
        style={{ width: 5, height: 5, background: accent }}
      />
      <span
        className="num uppercase"
        style={{ fontSize: 9.5, letterSpacing: 1.2, color: "#a8b3ac", fontWeight: 600 }}
      >
        {label}
      </span>
      <span
        className="num"
        style={{ fontSize: 9.5, color: "#6c7a72", letterSpacing: 0.5 }}
      >
        · {count}
      </span>
    </div>
  );
}

function BetRow({
  entry,
  isLast,
  dim,
}: {
  entry: BetEntry;
  isLast: boolean;
  dim: boolean;
}) {
  const { bet, player, bucket } = entry;
  const win = Number(bet.to_win) || 0;
  const stake = Number(bet.stake) || 0;
  const scoreNum = player?.totalScoreNum;
  const scoreColor =
    scoreNum != null && scoreNum < 0
      ? "#7fd49a"
      : scoreNum != null && scoreNum > 0
        ? "#e87c7c"
        : "#a8b3ac";
  const teeLabel =
    bucket === "upcoming" && player?.teeTime ? formatTee(player.teeTime) : null;
  const thru = player?.todayLine?.thru ?? null;

  return (
    <div
      className="px-3 py-2.5 flex items-center gap-3"
      style={{
        borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.06)",
        opacity: dim ? 0.6 : 1,
      }}
    >
      <PlayerAvatar
        name={bet.player}
        headshot={player?.headshot}
        flagHref={player?.flagHref}
        size={36}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="text-text font-semibold truncate"
            style={{ fontSize: 14.5, lineHeight: 1.15 }}
          >
            {bet.player}
          </span>
          {teeLabel ? (
            <span
              className="num shrink-0"
              style={{ fontSize: 11, color: "#cdb47a", letterSpacing: 0.3, fontWeight: 600 }}
            >
              {teeLabel}
            </span>
          ) : (
            <>
              {player?.posDisplay && (
                <span
                  className="num shrink-0"
                  style={{ fontSize: 10.5, color: "#7e8a83", letterSpacing: 0.3 }}
                >
                  {player.posDisplay}
                </span>
              )}
              {player?.totalToPar && (
                <span
                  className="num font-bold shrink-0"
                  style={{ fontSize: 11.5, color: scoreColor }}
                >
                  {player.totalToPar}
                </span>
              )}
              {bucket === "live" && thru !== null && (
                <span
                  className="num shrink-0"
                  style={{ fontSize: 10, color: "#6c7a72", letterSpacing: 0.3 }}
                >
                  · thru {thru}
                </span>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-1 min-w-0">
          <BookChip book={BOOK_MAP[bet.book.toLowerCase()] ?? "DK"} />
          <span className="text-text-dim truncate" style={{ fontSize: 12 }}>
            {bet.market}
            {bet.line !== null && <span className="num text-text-dim"> · {bet.line}</span>}
          </span>
        </div>
      </div>
      <div className="text-right shrink-0 leading-tight">
        <div
          className="num font-bold"
          style={{ fontSize: 16, color: "#7fd49a", letterSpacing: -0.3 }}
        >
          {win.toFixed(0)}
          <span style={{ fontSize: 11, color: "#a8b3ac" }}>u</span>
        </div>
        <div
          className="num text-text-muted mt-0.5"
          style={{ fontSize: 10.5, letterSpacing: 0.3 }}
        >
          risk {stake.toFixed(0)}u
        </div>
      </div>
    </div>
  );
}

function formatTee(iso: string): string {
  try {
    return new Date(iso)
      .toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      .replace(" ", "")
      .toLowerCase();
  } catch {
    return "";
  }
}
