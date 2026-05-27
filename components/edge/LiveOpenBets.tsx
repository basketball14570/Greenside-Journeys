"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookChip, type Book } from "@/components/edge/primitives";

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

  return (
    <div className={wrap}>
      {header}
      <div className="rounded-[14px] bg-surface-1 border border-line overflow-hidden">
        {state.bets.map((b, i) => (
          <div
            key={b.id}
            className="px-4 py-3 flex items-baseline justify-between gap-3"
            style={{
              borderBottom:
                i < state.bets.length - 1
                  ? "1px solid rgba(255,255,255,0.06)"
                  : "none",
            }}
          >
            <div className="flex items-baseline gap-2.5 min-w-0">
              <BookChip book={BOOK_MAP[b.book.toLowerCase()] ?? "DK"} />
              <div className="min-w-0">
                <div
                  className="text-text font-semibold truncate"
                  style={{ fontSize: 14, lineHeight: 1.2 }}
                >
                  {b.player}
                </div>
                <div className="text-text-dim mt-0.5 truncate" style={{ fontSize: 12.5 }}>
                  {b.market}
                  {b.line !== null && (
                    <span className="num text-text-dim"> · {b.line}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="num font-semibold shrink-0" style={{ fontSize: 13 }}>
              <span className="text-text-dim">{Number(b.stake)}u</span>
              <span className="text-text-muted"> → </span>
              <span style={{ color: "#7fd49a" }}>{Number(b.to_win).toFixed(2)}u</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
