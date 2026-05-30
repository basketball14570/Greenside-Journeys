"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookChip, type Book } from "@/components/edge/primitives";
import { PlayerAvatar } from "@/components/edge/PlayerAvatar";
import {
  fetchLeaderboard,
  type LeaderboardSnapshot,
  type LeaderboardPlayer,
} from "@/lib/espn-leaderboard";

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
  const [snap, setSnap] = useState<LeaderboardSnapshot | null>(null);

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
    fetchLeaderboard()
      .then((s) => {
        if (!cancelled) setSnap(s);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Name → player so each row can show the right headshot + flag + position.
  const playerByName = useMemo(() => {
    const m = new Map<string, LeaderboardPlayer>();
    const key = (s: string) =>
      s.toLowerCase().normalize("NFKD").replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
    for (const p of snap?.players ?? []) m.set(key(p.name), p);
    return (name: string) => m.get(key(name)) ?? null;
  }, [snap]);

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

  return (
    <div className={wrap}>
      {header}
      <div className="rounded-[14px] bg-surface-1 border border-line overflow-hidden">
        {state.bets.map((b, i) => {
          const lp = playerByName(b.player);
          const win = Number(b.to_win) || 0;
          const stake = Number(b.stake) || 0;
          const scoreNum = lp?.totalScoreNum;
          const scoreColor =
            scoreNum != null && scoreNum < 0 ? "#7fd49a" : scoreNum != null && scoreNum > 0 ? "#e87c7c" : "#a8b3ac";
          return (
          <div
            key={b.id}
            className="px-3 py-2.5 flex items-center gap-3"
            style={{
              borderBottom:
                i < state.bets.length - 1
                  ? "1px solid rgba(255,255,255,0.06)"
                  : "none",
            }}
          >
            <PlayerAvatar name={b.player} headshot={lp?.headshot} flagHref={lp?.flagHref} size={36} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="text-text font-semibold truncate"
                  style={{ fontSize: 14.5, lineHeight: 1.15 }}
                >
                  {b.player}
                </span>
                {lp?.posDisplay && (
                  <span className="num shrink-0" style={{ fontSize: 10.5, color: "#7e8a83", letterSpacing: 0.3 }}>
                    {lp.posDisplay}
                  </span>
                )}
                {lp?.totalToPar && (
                  <span className="num font-bold shrink-0" style={{ fontSize: 11.5, color: scoreColor }}>
                    {lp.totalToPar}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1 min-w-0">
                <BookChip book={BOOK_MAP[b.book.toLowerCase()] ?? "DK"} />
                <span className="text-text-dim truncate" style={{ fontSize: 12 }}>
                  {b.market}
                  {b.line !== null && (
                    <span className="num text-text-dim"> · {b.line}</span>
                  )}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0 leading-tight">
              <div className="num font-bold" style={{ fontSize: 16, color: "#7fd49a", letterSpacing: -0.3 }}>
                {win.toFixed(0)}<span style={{ fontSize: 11, color: "#a8b3ac" }}>u</span>
              </div>
              <div className="num text-text-muted mt-0.5" style={{ fontSize: 10.5, letterSpacing: 0.3 }}>
                risk {stake.toFixed(0)}u
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
