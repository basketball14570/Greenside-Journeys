"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchLeaderboard,
  type LeaderboardSnapshot,
  type LeaderboardPlayer,
} from "@/lib/espn-leaderboard";
import { gradeBet, type Decision } from "@/lib/grading";
import { dbBetToOpenBet } from "@/lib/bets/open-bet";
import { useStarredGolfers, normalizePlayerKey } from "@/lib/starred-golfers";
import { PageHeader } from "@/components/edge/PageHeader";
import { PlayerAvatar, FormDots } from "@/components/edge/PlayerAvatar";
import { courseSlugFor } from "@/lib/weather/forecast";

// Sunday command center — one dense, auto-refreshing screen for tournament
// days: aggregate read on your action, every ticket graded live, and your
// tracked golfers on the board. The "open it every Sunday" view.

const REFRESH_MS = 45_000;
const UNDER = "#7fd49a";
const OVER = "#e57373";

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
};

function norm(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
}

function statusColor(s: Decision["status"] | "unknown"): string {
  switch (s) {
    case "won":
      return UNDER;
    case "lost":
      return OVER;
    case "live":
      return "#f5c558";
    case "push":
      return "#a8b3ac";
    default:
      return "#7e8a83";
  }
}

// Chronological sort key for a ticket. Tee time arrives in two formats:
// ESPN ISO ("2026-05-31T15:30:00Z") and DataGolf time-of-day ("10:30",
// "1:45 PM", "13:45"); both fold to a comparable number. A player already
// on the course (tee time often nulled by ESPN) is keyed by holes played
// so they still sort among the early starters; the unplaceable sink last.
function parseTeeTime(s: string): number | null {
  const isoMs = Date.parse(s);
  if (Number.isFinite(isoMs)) return isoMs;
  const m = s.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!m) return null;
  let hh = Number(m[1]);
  const mm = Number(m[2]);
  const ampm = m[3]?.toLowerCase();
  if (ampm === "pm" && hh < 12) hh += 12;
  if (ampm === "am" && hh === 12) hh = 0;
  return hh * 60 + mm;
}

const TEED_OFF_BASE = -1e15;

function effectiveTeeKey(g: { player: LeaderboardPlayer | null }): number {
  const tee = g.player?.teeTime;
  if (tee) {
    const t = parseTeeTime(tee);
    if (t !== null) return t;
  }
  const today = g.player?.todayLine;
  const started =
    !!today && (today.complete || (today.thru ?? 0) > 0 || today.strokes !== null);
  if (started) return TEED_OFF_BASE + (18 - (today!.thru ?? 0));
  return Number.MAX_SAFE_INTEGER;
}

export default function CommandCenterPage() {
  const [snapshot, setSnapshot] = useState<LeaderboardSnapshot | null>(null);
  const [bets, setBets] = useState<ApiBet[]>([]);
  const [loaded, setLoaded] = useState(false);
  const { stars } = useStarredGolfers();

  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      const [snap, betsRes] = await Promise.all([
        fetchLeaderboard().catch(() => null),
        fetch("/api/bets/mine?limit=200", { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => null),
      ]);
      if (cancelled) return;
      if (snap) setSnapshot(snap);
      if (Array.isArray(betsRes?.bets)) setBets(betsRes.bets as ApiBet[]);
      setLoaded(true);
    };
    pull();
    const id = setInterval(pull, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const playerByName = useMemo(() => {
    const m = new Map<string, LeaderboardPlayer>();
    for (const p of snapshot?.players ?? []) m.set(norm(p.name), p);
    return m;
  }, [snapshot]);

  // Grade every ticket against the live board.
  const graded = useMemo(() => {
    return bets.map((b) => {
      const decision = snapshot ? gradeBet(dbBetToOpenBet(b), snapshot) : null;
      const lp = playerByName.get(norm(b.player)) ?? null;
      return { bet: b, decision, player: lp };
    });
  }, [bets, snapshot, playerByName]);

  const agg = useMemo(() => {
    let live = 0,
      winningLive = 0,
      atRisk = 0,
      potential = 0;
    let settledNet = 0,
      won = 0,
      lost = 0;
    for (const g of graded) {
      const d = g.decision;
      const isOpen = g.bet.status === "live" || g.bet.status === "pending";
      if (isOpen) {
        atRisk += Number(g.bet.stake) || 0;
        potential += Number(g.bet.to_win) || 0;
        if (d?.status === "live") {
          live++;
          // "meets / inside / clear / Up / Win" in the reason = currently good.
          if (d.reason && /(inside|clear|^win|ahead|\bup\b|made cut)/i.test(d.reason)) {
            winningLive++;
          }
        }
      }
      if (d?.status === "won") {
        won++;
        settledNet += d.pnl ?? (Number(g.bet.to_win) || 0);
      } else if (d?.status === "lost") {
        lost++;
        settledNet += d.pnl ?? -(Number(g.bet.stake) || 0);
      }
    }
    return { live, winningLive, atRisk, potential, settledNet, won, lost };
  }, [graded]);

  // Order the day as a single chronological list by tee time, earliest
  // first. Players already on the course (teeTime nulled by ESPN, or
  // backfilled from DataGolf) are slotted by their tee time when we have
  // it, otherwise by holes played (more thru = teed off earlier) so the
  // list still reads top-to-bottom in tee order. Anyone unplaceable
  // (cut/withdrew/no match) falls to the bottom.
  const ticketRows = useMemo(() => {
    return [...graded].sort((a, b) => effectiveTeeKey(a) - effectiveTeeKey(b));
  }, [graded]);

  // Board: your starred golfers + the leaders, deduped, avatars + form.
  const board = useMemo(() => {
    const players = snapshot?.players ?? [];
    const active = players.filter((p) => !p.isCut);
    const ranked = [...active].sort((a, b) => (a.posNum ?? 9999) - (b.posNum ?? 9999));
    const starred = ranked.filter((p) => stars.has(normalizePlayerKey(p.name)));
    const leaders = ranked.slice(0, 10);
    const seen = new Set<string>();
    const out: { p: LeaderboardPlayer; mine: boolean }[] = [];
    for (const p of [...starred, ...leaders]) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push({ p, mine: stars.has(normalizePlayerKey(p.name)) });
    }
    return out;
  }, [snapshot, stars]);

  const ev = snapshot?.event;
  const liveNow = ev?.state === "in";

  return (
    <div className="px-5 lg:px-8 py-6 space-y-6 max-w-6xl mx-auto">
      <PageHeader
        kicker="Command Center"
        title="Your Sunday, live."
        accent="green"
        live={liveNow}
        imageSlug={ev?.course ? courseSlugFor(ev.course) : null}
        subtitle={
          ev
            ? `${ev.name}${ev.statusDetail ? ` · ${ev.statusDetail}` : ev.period ? ` · Round ${ev.period}` : ""}`
            : "Every ticket graded live, your golfers on the board, one screen."
        }
      />

      {/* Aggregate hero */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <HeroStat
          label="Live now"
          value={`${agg.winningLive}/${agg.live}`}
          sub="winning / live"
          color={agg.live > 0 ? "#f5c558" : "#7e8a83"}
        />
        <HeroStat
          label="At risk → potential"
          value={`${agg.atRisk.toFixed(0)}u`}
          sub={`→ ${agg.potential.toFixed(0)}u`}
        />
        <HeroStat
          label="Settled"
          value={`${agg.won}–${agg.lost}`}
          sub="won – lost"
          color={agg.won > agg.lost ? UNDER : agg.lost > agg.won ? OVER : "#a8b3ac"}
        />
        <HeroStat
          label="P&L today"
          value={`${agg.settledNet >= 0 ? "+" : ""}${agg.settledNet.toFixed(2)}u`}
          sub="graded"
          color={agg.settledNet > 0 ? UNDER : agg.settledNet < 0 ? OVER : "#a8b3ac"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Tickets */}
        <section className="rounded-[14px] bg-surface-1 border border-line overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{
              background: "linear-gradient(90deg, rgba(127,212,154,0.10), rgba(0,0,0,0.18) 60%)",
              borderColor: "rgba(127,212,154,0.18)",
            }}
          >
            <span className="flex items-center gap-2.5">
              <span className="inline-block rounded-full" style={{ width: 3, height: 16, background: UNDER }} />
              <span className="serif-italic text-text" style={{ fontSize: 16, fontStyle: "normal" }}>
                Your tickets
              </span>
            </span>
            <Link href="/dashboard/live" className="num text-text-muted hover:text-text" style={{ fontSize: 11 }}>
              Full live →
            </Link>
          </div>
          {!loaded ? (
            <Empty>Loading your tickets…</Empty>
          ) : ticketRows.length === 0 ? (
            <Empty>
              No tickets yet.{" "}
              <Link href="/dashboard/upload" className="underline" style={{ color: UNDER }}>
                Upload a slip
              </Link>{" "}
              and it grades here live.
            </Empty>
          ) : (
            ticketRows.map((g) => <TicketRow key={g.bet.id} g={g} />)
          )}
        </section>

        {/* Board */}
        <section className="rounded-[14px] bg-surface-1 border border-line overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{
              background: "linear-gradient(90deg, rgba(245,197,88,0.10), rgba(0,0,0,0.18) 60%)",
              borderColor: "rgba(245,197,88,0.18)",
            }}
          >
            <span className="flex items-center gap-2.5">
              <span className="inline-block rounded-full" style={{ width: 3, height: 16, background: "#f5c558" }} />
              <span className="serif-italic text-text" style={{ fontSize: 16, fontStyle: "normal" }}>
                Your board
              </span>
            </span>
            <Link href="/dashboard/leaderboard" className="num text-text-muted hover:text-text" style={{ fontSize: 11 }}>
              Full board →
            </Link>
          </div>
          {!loaded ? (
            <Empty>Loading the board…</Empty>
          ) : board.length === 0 ? (
            <Empty>Star golfers on the leaderboard to track them here.</Empty>
          ) : (
            board.map(({ p, mine }) => <BoardRow key={p.id} p={p} mine={mine} par={snapshot?.event?.coursePar ?? null} />)
          )}
        </section>
      </div>
    </div>
  );
}

function HeroStat({
  label,
  value,
  sub,
  color = "#f4efe4",
}: {
  label: string;
  value: string;
  sub: string;
  color?: string;
}) {
  return (
    <div className="rounded-[12px] border border-line p-3.5 bg-bg">
      <div className="num uppercase text-text-muted" style={{ fontSize: 9.5, letterSpacing: 1.2 }}>
        {label}
      </div>
      <div className="num font-bold mt-1" style={{ fontSize: 24, color, letterSpacing: -0.5 }}>
        {value}
      </div>
      <div className="num text-text-muted mt-0.5" style={{ fontSize: 10.5 }}>
        {sub}
      </div>
    </div>
  );
}

function TicketRow({
  g,
}: {
  g: { bet: ApiBet; decision: Decision | null; player: LeaderboardPlayer | null };
}) {
  const { bet, decision, player } = g;
  const s = decision?.status ?? "unknown";
  const c = statusColor(s);
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-line/50 last:border-b-0">
      <PlayerAvatar name={bet.player} headshot={player?.headshot} flagHref={player?.flagHref} size={34} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-text font-semibold truncate" style={{ fontSize: 14 }}>
            {bet.player}
          </span>
          <span
            className="num uppercase shrink-0"
            style={{
              fontSize: 8.5,
              letterSpacing: 0.6,
              color: "#a8b3ac",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 3,
              padding: "1px 4px",
            }}
          >
            {bet.book}
          </span>
        </div>
        <div className="text-text-dim truncate" style={{ fontSize: 12 }}>
          {bet.market}
          {bet.line !== null ? ` · ${bet.line}` : ""}
          {decision?.reason ? ` — ${decision.reason}` : ""}
        </div>
      </div>
      <div className="text-right shrink-0">
        {decision?.standing && (
          <div className="num font-bold" style={{ fontSize: 16, color: c, letterSpacing: -0.3 }}>
            {decision.standing}
          </div>
        )}
        <div className="num uppercase" style={{ fontSize: 9, letterSpacing: 0.8, color: c }}>
          {s === "unknown" ? bet.status : s}
        </div>
      </div>
    </div>
  );
}

function BoardRow({
  p,
  mine,
  par,
}: {
  p: LeaderboardPlayer;
  mine: boolean;
  par: number | null;
}) {
  const toParNum = p.totalScoreNum;
  const c = toParNum === null ? "#c7cfc9" : toParNum < 0 ? UNDER : toParNum > 0 ? OVER : "#c7cfc9";
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 border-b border-line/50 last:border-b-0"
      style={{ background: mine ? "rgba(245,197,88,0.05)" : "transparent" }}
    >
      <span className="num text-text-dim shrink-0" style={{ fontSize: 11, width: 26 }}>
        {p.posDisplay || "—"}
      </span>
      <PlayerAvatar
        name={p.name}
        headshot={p.headshot}
        flagHref={p.flagHref}
        size={30}
        ring={mine ? "#f5c558" : null}
      />
      <div className="min-w-0 flex-1">
        <div className="text-text truncate flex items-center gap-1.5" style={{ fontSize: 13, fontWeight: mine ? 700 : 500 }}>
          {mine && <span style={{ color: "#f5c558", fontSize: 10 }}>★</span>}
          {p.name}
        </div>
        <div className="mt-0.5">
          <FormDots rounds={p.rounds} par={par} />
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="num font-bold" style={{ fontSize: 15, color: c }}>
          {p.totalToPar ?? "—"}
        </div>
        <div className="num text-text-muted" style={{ fontSize: 9.5 }}>
          {p.todayLine?.complete ? "F" : p.todayLine?.thru != null ? `thru ${p.todayLine.thru}` : ""}
        </div>
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-8 text-center text-text-dim" style={{ fontSize: 13 }}>
      {children}
    </div>
  );
}
