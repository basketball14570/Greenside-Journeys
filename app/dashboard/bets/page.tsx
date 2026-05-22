"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookChip, StatusDot, type Book, type Status } from "@/components/edge/primitives";
import { BreakdownBar, PnlSpark } from "@/components/edge/pnl";
import { supabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";

// Map a row from /api/bets/mine to the HistoryBet shape the existing
// PnL chart + breakdown bars consume. resolvedPayout is computed from
// stake + status (won → +profit, lost → −stake, void → 0).
type RawBet = {
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
  placed_at: string | null;
  created_at: string;
};

// The Book chip union covers DK/FD/PP/UD. Caesars/BetMGM rows from the
// bets table fall back to DK styling — visual only, the underlying book
// label is preserved on the imported-bets row.
const BOOK_MAP: Record<string, Book> = {
  draftkings: "DK",
  fanduel: "FD",
  prizepicks: "PP",
  underdog: "UD",
};

// Collapse the user's rows into decided "tickets": parlay legs (sharing a
// placed_at) become ONE ticket, so a 9-leg parlay counts once — net is
// (to_win − stake) on a clean sweep, −stake if any leg lost — instead of
// nine inflated rows. Singles map straight through. Net P&L is profit, not
// gross return, so the cumulative chart and ROI read correctly.
function settledHistoryFromRows(rows: RawBet[]): HistoryBet[] {
  const groups = new Map<string, RawBet[]>();
  for (const b of rows) {
    const key = b.placed_at ?? b.id;
    const arr = groups.get(key);
    if (arr) arr.push(b);
    else groups.set(key, [b]);
  }

  const out: HistoryBet[] = [];
  for (const legs of groups.values()) {
    const anyLost = legs.some((l) => l.status === "lost");
    const allTerminal = legs.every(
      (l) => l.status === "won" || l.status === "lost" || l.status === "void",
    );
    // Skip parlays/singles that aren't fully decided yet.
    if (!anyLost && !allTerminal) continue;

    const head = legs[0];
    const stake = Number(head.stake);
    const toWin = Number(head.to_win);
    const won = !anyLost; // every leg won or voided
    const net = won ? toWin - stake : -stake;
    const multi = legs.length > 1;

    out.push({
      book: (BOOK_MAP[head.book.toLowerCase()] ?? "DK") as Book,
      player: multi ? `${legs.length}-leg parlay` : head.player,
      market: multi ? "Parlay" : head.market,
      line: multi ? "" : head.line !== null ? String(head.line) : "",
      stake,
      payout: toWin,
      status: "graded",
      live: { score: won ? "W" : "L", thru: "F" },
      ev: 0,
      won: won || undefined,
      resolvedAt:
        legs.map((l) => l.resolved_at).filter(Boolean).sort().slice(-1)[0] ??
        head.placed_at ??
        head.created_at,
      resolvedPayout: net,
      tournament: "",
    });
  }
  // Most recent first.
  return out.sort((a, b) => (a.resolvedAt < b.resolvedAt ? 1 : -1));
}
import {
  groupBy,
  summarize,
  type HistoryBet,
} from "@/lib/demo-history";
import type { DashBet } from "@/components/edge/sections";

type FilterKey = "all" | "live" | "graded" | "hedge";
const FILTERS: { id: FilterKey; label: string }[] = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "graded", label: "Graded" },
  { id: "hedge", label: "Hedge" },
];

function matchesFilter(b: DashBet | HistoryBet, f: FilterKey) {
  if (f === "all") return true;
  if (f === "hedge") return !!(b as DashBet).hedge;
  if (f === "live") return b.status === "live";
  if (f === "graded") return b.status === "graded";
  return true;
}

export default function BetsPage() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [book, setBook] = useState<Book | "ALL">("ALL");
  const [realHistory, setRealHistory] = useState<HistoryBet[] | null>(null);

  // Pull settled real bets once on mount. We render real PnL when there
  // are ≥1 graded rows; otherwise fall back to demo so the page is never
  // empty for first-time visitors.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ) {
        return;
      }
      try {
        const r = await fetch("/api/bets/mine?limit=500", { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        if (cancelled || !j.signedIn || !Array.isArray(j.bets)) return;
        const settled = settledHistoryFromRows(j.bets as RawBet[]);
        if (settled.length > 0) setRealHistory(settled);
      } catch {
        /* fall through to demo */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const usingReal = realHistory !== null;
  const settledSource = realHistory ?? [];

  const filtered = useMemo(() => {
    return settledSource.filter(
      (b) => matchesFilter(b, filter) && (book === "ALL" || b.book === book),
    );
  }, [filter, book, settledSource]);

  const summary = useMemo(() => summarize(settledSource), [settledSource]);
  const byBook = useMemo(
    () => groupBy(settledSource, (b) => b.book).sort((a, b) => b.netUnits - a.netUnits),
    [settledSource],
  );
  const byMarketType = useMemo(
    () =>
      groupBy(settledSource, (b) => {
        const m = b.market.toLowerCase();
        if (m.includes("parlay")) return "Parlay";
        if (m.includes("top")) return "Top finish";
        if (m.includes("matchup")) return "Matchup";
        if (m.includes("win")) return "To win";
        if (m.includes("score")) return "Round score";
        return "Player props";
      }).sort((a, b) => b.netUnits - a.netUnits),
    [settledSource],
  );

  return (
    <div className="px-5 lg:px-8 py-6 space-y-6 max-w-7xl mx-auto">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <span
            className="num font-semibold uppercase"
            style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
          >
            ● Portfolio
          </span>
          <h1
            className="serif-italic mt-1.5 flex items-center gap-2.5 flex-wrap"
            style={{ fontSize: 36, letterSpacing: -0.4, fontStyle: "normal" }}
          >
            <em>All tickets.</em>
            <span
              className="num uppercase"
              style={{
                fontSize: 9.5,
                letterSpacing: 1.2,
                padding: "3px 8px",
                borderRadius: 4,
                background: usingReal ? "rgba(127,212,154,0.13)" : "rgba(168,179,172,0.1)",
                color: usingReal ? "#7fd49a" : "#a8b3ac",
                border: usingReal
                  ? "1px solid rgba(127,212,154,0.3)"
                  : "1px solid rgba(168,179,172,0.25)",
                position: "relative",
                top: -6,
              }}
            >
              {usingReal ? "Your data" : "No settled bets yet"}
            </span>
          </h1>
        </div>
        <div className="flex flex-wrap gap-5">
          <Summary label="Bets settled" value={summary.total.toString()} />
          <Summary
            label="Win rate"
            value={`${(summary.winRate * 100).toFixed(0)}%`}
          />
          <Summary
            label="Net units"
            value={`${summary.netUnits > 0 ? "+" : ""}${summary.netUnits.toFixed(2)}u`}
            tone={summary.netUnits > 0 ? "pos" : "neg"}
          />
          <Summary
            label="ROI"
            value={`${summary.roi > 0 ? "+" : ""}${(summary.roi * 100).toFixed(0)}%`}
            tone={summary.roi > 0 ? "pos" : "neg"}
          />
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <a
          href="/dashboard/parlay"
          className="rounded-[10px] px-3 py-1.5 font-semibold transition"
          style={{
            fontSize: 12,
            background: "#8ee68e",
            color: "#06140c",
          }}
          title="Watch your active legs grade in real time"
        >
          ● Live tracker →
        </a>
        <a
          href="/dashboard/upload"
          className="rounded-[10px] border border-line px-3 py-1.5 hover:bg-surface-2"
          style={{ fontSize: 12 }}
        >
          Upload slip
        </a>
        <a
          href="/api/bets/export?format=csv"
          download
          className="rounded-[10px] border border-line px-3 py-1.5 hover:bg-surface-2"
          style={{ fontSize: 12 }}
        >
          Export CSV
        </a>
        <a
          href="/api/bets/export?format=json"
          target="_blank"
          rel="noreferrer"
          className="rounded-[10px] border border-line px-3 py-1.5 hover:bg-surface-2"
          style={{ fontSize: 12 }}
        >
          Export JSON
        </a>
      </div>

      <ImportedBets />

      {/* P&L chart + breakdowns */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-[14px] bg-surface-1 border border-line p-5">
          <div className="flex items-baseline justify-between mb-4">
            <span
              className="serif-italic text-text"
              style={{ fontSize: 17, letterSpacing: -0.2, fontStyle: "normal" }}
            >
              Cumulative P&L
            </span>
            <span
              className="num text-text-muted"
              style={{ fontSize: 11, letterSpacing: 0.4 }}
            >
              Last 3 events
            </span>
          </div>
          <PnlSpark bets={settledSource} width={680} height={120} />
        </div>
        <div className="rounded-[14px] bg-surface-1 border border-line p-5">
          <div
            className="serif-italic mb-3 text-text"
            style={{ fontSize: 17, letterSpacing: -0.2, fontStyle: "normal" }}
          >
            By market
          </div>
          {byMarketType.map((g) => (
            <BreakdownBar
              key={g.key}
              label={g.key}
              winRate={g.winRate}
              roi={g.roi}
              net={g.netUnits}
              count={g.total}
            />
          ))}
        </div>
      </div>

      <div className="rounded-[14px] bg-surface-1 border border-line p-5">
        <div
          className="serif-italic mb-3 text-text"
          style={{ fontSize: 17, letterSpacing: -0.2, fontStyle: "normal" }}
        >
          By book
        </div>
        {byBook.map((g) => (
          <BreakdownBar
            key={g.key}
            label={g.key}
            winRate={g.winRate}
            roi={g.roi}
            net={g.netUnits}
            count={g.total}
          />
        ))}
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="num font-semibold uppercase transition"
              style={{
                padding: "5px 11px",
                borderRadius: 6,
                fontSize: 10.5,
                letterSpacing: 0.6,
                color: f.id === filter ? "#f0ebe0" : "#a8b3ac",
                background: f.id === filter ? "#1e4030" : "transparent",
                border:
                  f.id === filter
                    ? "1px solid rgba(255,255,255,0.06)"
                    : "1px solid transparent",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-text-muted px-1" style={{ fontSize: 12 }}>
          ·
        </span>
        <div className="flex gap-1.5 items-center">
          <span
            className="num text-text-muted uppercase"
            style={{ fontSize: 10, letterSpacing: 1.1 }}
          >
            Book
          </span>
          {(["ALL", "DK", "FD", "PP", "UD"] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBook(b)}
              className="num font-semibold transition"
              style={{
                padding: "4px 9px",
                borderRadius: 4,
                fontSize: 10,
                letterSpacing: 0.6,
                color: b === book ? "#f0ebe0" : "#a8b3ac",
                background: b === book ? "#1e4030" : "transparent",
                border:
                  b === book
                    ? "1px solid rgba(255,255,255,0.06)"
                    : "1px solid transparent",
              }}
            >
              {b}
            </button>
          ))}
        </div>
        <span className="flex-1" />
        <span className="num text-text-muted" style={{ fontSize: 11 }}>
          {filtered.length} ticket{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Desktop table view */}
      <div className="hidden lg:block rounded-[14px] overflow-hidden bg-surface-1 border border-line">
        <div
          className="grid gap-2.5 px-4 py-2.5 num font-semibold uppercase text-text-muted border-b border-line"
          style={{
            gridTemplateColumns: "52px 1.6fr 1.1fr 80px 100px 80px 90px",
            fontSize: 9.5,
            letterSpacing: 1.1,
            background: "rgba(0,0,0,0.18)",
          }}
        >
          <span>Book</span>
          <span>Player</span>
          <span>Market</span>
          <span className="text-right">Line</span>
          <span className="text-right">Risk → Win</span>
          <span className="text-right">Status</span>
          <span className="text-right">Result</span>
        </div>
        {filtered.map((b, i) => (
          <BetRowDesktop key={i} b={b} last={i === filtered.length - 1} />
        ))}
        {filtered.length === 0 && (
          <div className="p-8 text-center text-text-dim" style={{ fontSize: 13 }}>
            No bets match this filter.
          </div>
        )}
      </div>

      {/* Mobile card list */}
      <div className="lg:hidden space-y-3">
        {filtered.map((b, i) => (
          <BetCardMobile key={i} b={b} />
        ))}
        {filtered.length === 0 && (
          <div
            className="rounded-[14px] bg-surface-1 border border-line p-8 text-center text-text-dim"
            style={{ fontSize: 13 }}
          >
            No bets match this filter.
          </div>
        )}
      </div>
    </div>
  );
}

function Summary({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg";
}) {
  const color =
    tone === "pos" ? "#8ee68e" : tone === "neg" ? "#e07868" : "#f0ebe0";
  return (
    <div>
      <div
        className="num font-semibold uppercase text-text-muted"
        style={{ fontSize: 9.5, letterSpacing: 1.2 }}
      >
        {label}
      </div>
      <div
        className="serif-italic"
        style={{ fontSize: 28, lineHeight: 1, color, fontStyle: "italic" }}
      >
        {value}
      </div>
    </div>
  );
}

function BetRowDesktop({
  b,
  last,
}: {
  b: DashBet | HistoryBet;
  last: boolean;
}) {
  const isHistory = "resolvedPayout" in b;
  return (
    <div
      className="grid gap-2.5 px-4 py-3.5 items-center"
      style={{
        gridTemplateColumns: "52px 1.6fr 1.1fr 80px 100px 80px 90px",
        borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.06)",
        background: (b as DashBet).hedge ? "rgba(224,120,104,0.05)" : "transparent",
      }}
    >
      <span>
        <BookChip book={b.book} />
      </span>
      <div className="min-w-0">
        <div className="text-text font-semibold truncate" style={{ fontSize: 13.5 }}>
          {b.player}
        </div>
        {isHistory && (
          <div className="num text-text-muted truncate" style={{ fontSize: 11 }}>
            {(b as HistoryBet).tournament}
          </div>
        )}
      </div>
      <span className="text-text-dim truncate" style={{ fontSize: 13 }}>
        {b.market}
      </span>
      <span className="num text-text text-right" style={{ fontSize: 12.5 }}>
        {b.line}
      </span>
      <span
        className="num text-text text-right font-semibold"
        style={{ fontSize: 12.5 }}
      >
        {b.stake}u → {b.payout.toFixed(2)}u
      </span>
      <span className="text-right">
        <StatusDot status={b.status as Status} withLabel />
      </span>
      <span
        className="num text-right font-bold"
        style={{
          fontSize: 12,
          color: isHistory
            ? (b as HistoryBet).resolvedPayout >= 0
              ? "#8ee68e"
              : "#e07868"
            : "#a8b3ac",
        }}
      >
        {isHistory
          ? `${(b as HistoryBet).resolvedPayout > 0 ? "+" : ""}${(b as HistoryBet).resolvedPayout.toFixed(2)}u`
          : `${(b as DashBet).ev > 0 ? "+" : ""}${(b as DashBet).ev}%`}
      </span>
    </div>
  );
}

// Group bets by the upload batch (legs saved together share placed_at)
// so a parlay renders as one unit and can be confirmed/dismissed wholesale.
function groupByBatch(
  bets: ImportedBet[],
): { key: string; when: string | null; legs: ImportedBet[] }[] {
  const map = new Map<string, ImportedBet[]>();
  for (const b of bets) {
    const key = b.placed_at ?? b.id;
    const arr = map.get(key);
    if (arr) arr.push(b);
    else map.set(key, [b]);
  }
  return Array.from(map.entries())
    .map(([key, legs]) => ({
      key,
      legs,
      when: legs[0].placed_at
        ? new Date(legs[0].placed_at).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })
        : null,
    }))
    .sort((a, b) => (a.key < b.key ? 1 : -1));
}

type ImportedBet = {
  id: string;
  book: string;
  player: string;
  market: string;
  line: number | null;
  american_odds: number;
  stake: number;
  to_win: number;
  status: string;
  source: string;
  parse_confidence: number | null;
  user_confirmed: boolean;
  placed_at: string | null;
};

function ImportedBets() {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "anon" }
    | { kind: "unconfigured" }
    | { kind: "ready"; bets: ImportedBet[] }
  >({ kind: "loading" });

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/bets/mine?limit=100", { cache: "no-store" });
      const j = await r.json();
      if (!j.configured) return setState({ kind: "unconfigured" });
      if (!j.signedIn) return setState({ kind: "anon" });
      setState({ kind: "ready", bets: (j.bets ?? []) as ImportedBet[] });
    } catch {
      setState({ kind: "unconfigured" });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: re-fetch whenever a row in `bets` owned by the signed-in user
  // changes. Catches email-imports, OCR saves, and cron grading transitions.
  useEffect(() => {
    if (state.kind !== "ready" && state.kind !== "loading") return;
    if (!isSupabaseConfigured()) return;
    const supabase = supabaseBrowser();
    let userId: string | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled || !data.user) return;
      userId = data.user.id;
      channel = supabase
        .channel(`bets:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "bets",
            filter: `user_id=eq.${userId}`,
          },
          () => load(),
        )
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [state.kind, load]);

  async function act(id: string, action: "confirm" | "dismiss") {
    await fetch("/api/bets/mine", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    load();
  }

  async function actBatch(ids: string[], action: "confirm" | "dismiss") {
    await Promise.all(
      ids.map((id) =>
        fetch("/api/bets/mine", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, action }),
        }).catch(() => null),
      ),
    );
    load();
  }

  if (state.kind === "loading" || state.kind === "unconfigured") return null;
  if (state.kind === "anon") return null;
  if (state.bets.length === 0) return null;

  const pending = state.bets.filter((b) => !b.user_confirmed && b.source !== "manual");
  const confirmed = state.bets.filter((b) => b.user_confirmed || b.source === "manual");
  const pendingGroups = groupByBatch(pending);

  return (
    <div className="space-y-3">
      {pending.length > 0 && (
        <section className="rounded-[14px] border border-line p-5 bg-surface-1">
          <div className="flex items-baseline justify-between mb-3">
            <div
              className="serif-italic text-text"
              style={{ fontSize: 17, letterSpacing: -0.2, fontStyle: "normal" }}
            >
              <em>Pending confirmation ({pending.length})</em>
            </div>
            <div className="flex items-center gap-2">
              <LiveDot />
              <div
                className="num font-semibold uppercase text-text-muted"
                style={{ fontSize: 10, letterSpacing: 1.2 }}
              >
                From your inbox
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {pendingGroups.map((group) => {
              const ids = group.legs.map((b) => b.id);
              const multi = group.legs.length > 1;
              return (
                <div
                  key={group.key}
                  className={multi ? "rounded-[12px] p-3" : ""}
                  style={multi ? { border: "2px solid rgba(255,255,255,0.85)" } : undefined}
                >
                  {multi && (
                    <div className="flex items-center justify-between gap-2 mb-2 px-0.5">
                      <span style={{ fontSize: 15, fontWeight: 800, color: "#ffffff", letterSpacing: -0.2 }}>
                        {group.legs.length}-leg parlay
                        <span className="num" style={{ fontSize: 11, color: "#a8b3ac", fontWeight: 400, marginLeft: 8 }}>
                          {group.legs[0].book.toUpperCase()}
                          {group.when ? ` · ${group.when}` : ""}
                        </span>
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => actBatch(ids, "confirm")}
                          className="num uppercase rounded px-2 py-1"
                          style={{ fontSize: 9.5, letterSpacing: 0.8, color: "#8ee68e", border: "1px solid rgba(142,230,142,0.4)" }}
                        >
                          Confirm all
                        </button>
                        <button
                          onClick={() => actBatch(ids, "dismiss")}
                          className="num uppercase rounded px-2 py-1"
                          style={{ fontSize: 9.5, letterSpacing: 0.8, color: "#e57373", border: "1px solid rgba(229,115,115,0.4)" }}
                        >
                          Dismiss all
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    {group.legs.map((b) => (
                      <ImportedRow key={b.id} b={b} onConfirm={() => act(b.id, "confirm")} onDismiss={() => act(b.id, "dismiss")} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
      {confirmed.length > 0 && (
        <section className="rounded-[14px] border border-line p-5 bg-surface-1">
          <div className="flex items-baseline justify-between mb-3">
            <div
              className="serif-italic text-text"
              style={{ fontSize: 17, letterSpacing: -0.2, fontStyle: "normal" }}
            >
              <em>Your bets ({confirmed.length})</em>
            </div>
            <div
              className="num font-semibold uppercase text-text-muted"
              style={{ fontSize: 10, letterSpacing: 1.2 }}
            >
              Synced from Supabase
            </div>
          </div>
          <div className="space-y-2">
            {confirmed.slice(0, 25).map((b) => (
              <ImportedRow key={b.id} b={b} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ImportedRow({
  b,
  onConfirm,
  onDismiss,
}: {
  b: ImportedBet;
  onConfirm?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-[10px] border border-line/60 bg-bg/40 px-3 py-2.5"
      style={{ fontSize: 13 }}
    >
      <span
        className="num font-bold uppercase shrink-0"
        style={{
          fontSize: 10,
          letterSpacing: 1.1,
          color: "#a8b3ac",
          padding: "3px 6px",
          background: "#0a1f1422",
          borderRadius: 4,
        }}
      >
        {b.book}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-text font-medium truncate" style={{ fontSize: 13 }}>
          {b.player}
        </div>
        <div className="text-text-dim truncate" style={{ fontSize: 11 }}>
          {b.market}
          {b.line !== null ? ` · ${b.line}` : ""}
          {" · "}
          <span className="num">
            {b.american_odds > 0 ? "+" : ""}
            {b.american_odds}
          </span>
          {" · "}
          <span className="num">${b.stake.toFixed(0)} → ${b.to_win.toFixed(0)}</span>
        </div>
      </div>
      <span
        className="num uppercase shrink-0"
        style={{
          fontSize: 9,
          letterSpacing: 1,
          color: statusColor(b.status),
          background: `${statusColor(b.status)}1a`,
          padding: "2px 6px",
          borderRadius: 4,
        }}
      >
        {b.status}
      </span>
      {onConfirm && onDismiss && (
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={onConfirm}
            className="rounded-[6px] px-2 py-1"
            style={{ background: "#8ee68e", color: "#0a1f14", fontSize: 11, fontWeight: 600 }}
          >
            Confirm
          </button>
          <button
            onClick={onDismiss}
            className="rounded-[6px] px-2 py-1 border border-line"
            style={{ fontSize: 11 }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

function LiveDot() {
  return (
    <span
      title="Realtime — auto-refreshes as bets change"
      style={{
        width: 7,
        height: 7,
        borderRadius: 99,
        background: "#7fd49a",
        boxShadow: "0 0 0 3px #7fd49a22",
        display: "inline-block",
        animation: "greensidePulse 2s ease-in-out infinite",
      }}
    />
  );
}

function statusColor(s: string): string {
  switch (s) {
    case "won":
      return "#7fd49a";
    case "lost":
      return "#e87c7c";
    case "live":
      return "#f5c558";
    case "pending":
      return "#a8b3ac";
    case "void":
      return "#7cc0e8";
    default:
      return "#a8b3ac";
  }
}

function BetCardMobile({ b }: { b: DashBet | HistoryBet }) {
  const isHistory = "resolvedPayout" in b;
  return (
    <div className="rounded-[14px] bg-surface-1 border border-line p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <BookChip book={b.book} />
        <StatusDot status={b.status as Status} withLabel />
        <span className="flex-1" />
        <span
          className="num font-bold"
          style={{
            fontSize: 11.5,
            color: isHistory
              ? (b as HistoryBet).resolvedPayout >= 0
                ? "#8ee68e"
                : "#e07868"
              : "#a8b3ac",
          }}
        >
          {isHistory
            ? `${(b as HistoryBet).resolvedPayout > 0 ? "+" : ""}${(b as HistoryBet).resolvedPayout.toFixed(2)}u`
            : `${(b as DashBet).ev > 0 ? "+" : ""}${(b as DashBet).ev}% EV`}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div
            className="text-text font-semibold truncate"
            style={{ fontSize: 14.5, lineHeight: 1.2 }}
          >
            {b.player}
          </div>
          <div className="text-text-dim mt-0.5" style={{ fontSize: 12.5 }}>
            {b.market} · <span className="num">{b.line}</span>
          </div>
          {isHistory && (
            <div
              className="num text-text-muted mt-0.5"
              style={{ fontSize: 10.5, letterSpacing: 0.4 }}
            >
              {(b as HistoryBet).tournament}
            </div>
          )}
        </div>
        <div className="text-right">
          <div
            className="num text-text font-semibold"
            style={{ fontSize: 13 }}
          >
            {b.stake}u → {b.payout.toFixed(2)}u
          </div>
        </div>
      </div>
    </div>
  );
}
