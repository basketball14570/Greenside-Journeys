"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  describeLeg,
  legToOpenBet,
  americanToDecimal,
  decimalToAmerican,
  type SlipLeg,
} from "@/lib/bet-slip";
import { gradeBet, type Decision } from "@/lib/grading";
import {
  fetchLeaderboard,
  type LeaderboardSnapshot,
} from "@/lib/espn-leaderboard";

// Live parlay tracker for the user's current week. Hardcoded today —
// once we have a saved-parlays table this becomes /dashboard/parlay/[id]
// and the legs come from Supabase.
//
// Status math is parlay-style (all-or-nothing):
//   - any leg lost   → parlay LOST
//   - else any leg unknown → parlay UNKNOWN (still resolves later)
//   - else any leg live    → parlay LIVE
//   - else all won         → parlay WON
//
// Implied parlay odds = product of decimal odds across legs.
// Payout = stake × parlay decimal odds.

const PARLAY_STAKE = 1; // 1 unit — adjust at the top of the file or
// add a stake input box if you want to mess with it.

const LEGS: SlipLeg[] = [
  {
    id: "win-reed",
    createdAt: new Date().toISOString(),
    kind: "winner",
    player: "Patrick Reed",
    stake: PARLAY_STAKE,
    americanOdds: 8000,
    book: "DK",
  },
  {
    id: "rasmus-birdies",
    createdAt: new Date().toISOString(),
    kind: "round_prop",
    player: "Rasmus Hojgaard",
    stake: PARLAY_STAKE,
    americanOdds: -110,
    book: "DK",
    metric: "birdies",
    side: "over",
    line: 3.5,
    round: 4,
  },
  {
    id: "lowry-birdies",
    createdAt: new Date().toISOString(),
    kind: "round_prop",
    player: "Shane Lowry",
    stake: PARLAY_STAKE,
    americanOdds: -110,
    book: "DK",
    metric: "birdies",
    side: "over",
    line: 3.5,
    round: 4,
  },
  {
    id: "stevens-birdies",
    createdAt: new Date().toISOString(),
    kind: "round_prop",
    player: "Sam Stevens",
    stake: PARLAY_STAKE,
    americanOdds: -110,
    book: "DK",
    metric: "birdies",
    side: "over",
    line: 3.5,
    round: 4,
  },
  {
    id: "spieth-fir",
    createdAt: new Date().toISOString(),
    kind: "round_prop",
    player: "Jordan Spieth",
    stake: PARLAY_STAKE,
    americanOdds: -110,
    book: "DK",
    metric: "fairways",
    side: "over",
    line: 7.5,
    round: 4,
  },
  {
    id: "novak-top20",
    createdAt: new Date().toISOString(),
    kind: "top_n",
    player: "Andrew Novak",
    stake: PARLAY_STAKE,
    americanOdds: 350,
    book: "DK",
    n: 20,
  },
  {
    id: "fowler-top20",
    createdAt: new Date().toISOString(),
    kind: "top_n",
    player: "Rickie Fowler",
    stake: PARLAY_STAKE,
    americanOdds: 280,
    book: "DK",
    n: 20,
  },
  {
    id: "rose-top10",
    createdAt: new Date().toISOString(),
    kind: "top_n",
    player: "Justin Rose",
    stake: PARLAY_STAKE,
    americanOdds: 600,
    book: "DK",
    n: 10,
  },
  {
    id: "scheffler-birdies-under",
    createdAt: new Date().toISOString(),
    kind: "round_prop",
    player: "Scottie Scheffler",
    stake: PARLAY_STAKE,
    americanOdds: -110,
    book: "DK",
    metric: "birdies",
    side: "under",
    line: 5.5,
    round: 4,
  },
];

type ParlayStatus = "won" | "lost" | "live" | "unknown";

const REFRESH_MS = 30_000;

export default function ParlayPage() {
  const [snapshot, setSnapshot] = useState<LeaderboardSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await fetchLeaderboard();
      setSnapshot(snap);
      setLastFetched(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const decisions: Decision[] = useMemo(() => {
    if (!snapshot) return [];
    return LEGS.map((l) => gradeBet(legToOpenBet(l), snapshot));
  }, [snapshot]);

  const summary = useMemo(() => {
    const parlayDecimal = LEGS.reduce(
      (acc, l) => acc * americanToDecimal(l.americanOdds),
      1,
    );
    const payout = PARLAY_STAKE * parlayDecimal;

    let status: ParlayStatus = "won";
    let won = 0;
    let lost = 0;
    let live = 0;
    let unknown = 0;
    for (const d of decisions) {
      if (d.status === "won") won++;
      else if (d.status === "lost") lost++;
      else if (d.status === "live" || d.status === "push") live++;
      else unknown++;
    }
    if (lost > 0) status = "lost";
    else if (unknown > 0) status = "unknown";
    else if (live > 0) status = "live";
    else status = "won";

    return {
      parlayDecimal,
      parlayAmerican: decimalToAmerican(parlayDecimal),
      stake: PARLAY_STAKE,
      payout,
      profit: payout - PARLAY_STAKE,
      legs: { won, lost, live, unknown },
      status,
    };
  }, [decisions]);

  return (
    <div className="px-5 lg:px-8 py-6 space-y-5 max-w-5xl mx-auto">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <span
            className="num font-semibold uppercase"
            style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
          >
            ● Live parlay
          </span>
          <h1
            className="serif-italic mt-1.5 flex items-center gap-3 flex-wrap"
            style={{ fontSize: 36, letterSpacing: -0.4, fontStyle: "normal" }}
          >
            <em>This week&apos;s ticket.</em>
            <StatusPill status={summary.status} />
          </h1>
          <p
            className="text-text-dim mt-2 max-w-2xl"
            style={{ fontSize: 13.5 }}
          >
            {LEGS.length}-leg parlay · {snapshot?.event?.name ?? "live event"}{" "}
            ·{" "}
            <span className="num">
              {lastFetched
                ? `updated ${lastFetched.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                  })}`
                : "loading…"}
            </span>
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-[8px] px-3 py-1.5 border border-line hover:border-line-strong disabled:opacity-40"
          style={{ fontSize: 12 }}
        >
          {loading ? "Refreshing…" : "Refresh now"}
        </button>
      </header>

      {error && (
        <div
          className="rounded-[8px] border px-3 py-2"
          style={{
            borderColor: "#e87c7c",
            background: "#e87c7c1a",
            color: "#e87c7c",
            fontSize: 12,
          }}
        >
          ESPN fetch failed: {error}
        </div>
      )}

      {/* Payout hero — the entire reason you placed the bet. Scaled to
          dominate the screen at huge odds; shrinks gracefully when the
          number is short. */}
      <PayoutHero summary={summary} />

      <div className="grid grid-cols-3 gap-3">
        <Stat
          label="Risk"
          value={`${summary.stake.toFixed(1)}u`}
        />
        <Stat
          label="Parlay odds"
          value={fmtAmerican(summary.parlayAmerican)}
          tone={summary.parlayAmerican > 0 ? "good" : "neutral"}
        />
        <Stat
          label="Legs"
          value={`${summary.legs.won}W · ${summary.legs.live + summary.legs.unknown}L · ${summary.legs.lost}X`}
        />
      </div>

      <section className="rounded-[14px] border border-line overflow-hidden">
        <div
          className="grid gap-2 px-4 py-2.5 num font-semibold uppercase text-text-muted border-b border-line"
          style={{
            gridTemplateColumns: "1.6fr 1fr 110px 110px",
            fontSize: 10,
            letterSpacing: 1.1,
            background: "rgba(0,0,0,0.18)",
          }}
        >
          <span>Leg</span>
          <span>Detail</span>
          <span className="text-right">Live status</span>
          <span className="text-right">Observed</span>
        </div>
        {LEGS.map((l, i) => {
          const d = decisions[i];
          return (
            <LegRow
              key={l.id}
              leg={l}
              decision={d}
              snapshot={snapshot}
              isLast={i === LEGS.length - 1}
            />
          );
        })}
      </section>

      <p className="text-text-muted" style={{ fontSize: 11, lineHeight: 1.55 }}>
        <span className="num font-semibold uppercase" style={{ color: "#7fd49a", fontSize: 10, letterSpacing: 1 }}>
          Auto-graded
        </span>
        : top-N, outright, matchup, round-strokes, make-cut, and
        birdies / bogeys / eagles (derived from ESPN hole-by-hole vs
        course par).{" "}
        <span className="num font-semibold uppercase" style={{ color: "#7cc0e8", fontSize: 10, letterSpacing: 1 }}>
          Manual
        </span>
        : fairways hit and greens in regulation — not in the free
        ESPN feed, needs a DataGolf key to auto-grade.
      </p>
    </div>
  );
}

function LegRow({
  leg,
  decision,
  snapshot,
  isLast,
}: {
  leg: SlipLeg;
  decision: Decision | undefined;
  snapshot: LeaderboardSnapshot | null;
  isLast: boolean;
}) {
  const status = decision?.status ?? "live";
  const manual =
    status === "unknown" &&
    /settle manually|fir \/ gir|not in free espn/i.test(decision?.reason ?? "");

  // For top-N: surface current position so the user knows how close.
  const observed = decision?.observedValue ?? "—";

  return (
    <div
      className="grid gap-2 px-4 py-3 items-center"
      style={{
        gridTemplateColumns: "1.6fr 1fr 110px 110px",
        fontSize: 13,
        borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.06)",
        background:
          status === "won"
            ? "rgba(127,212,154,0.05)"
            : status === "lost"
              ? "rgba(232,124,124,0.05)"
              : "transparent",
      }}
    >
      <div className="min-w-0">
        <div className="text-text font-medium truncate">{leg.player}</div>
        <div
          className="text-text-dim mt-0.5"
          style={{ fontSize: 11.5 }}
        >
          {describeLeg(leg)} ·{" "}
          <span className="num">
            {leg.americanOdds > 0 ? "+" : ""}
            {leg.americanOdds}
          </span>
        </div>
      </div>
      <div
        className="text-text-dim truncate"
        style={{ fontSize: 12 }}
      >
        {decision?.reason ?? (snapshot ? "Loading…" : "Waiting for ESPN")}
      </div>
      <div className="text-right">
        {manual ? (
          <span
            className="num uppercase"
            style={{
              fontSize: 9.5,
              letterSpacing: 0.8,
              color: "#7cc0e8",
              background: "#7cc0e81a",
              padding: "3px 8px",
              borderRadius: 4,
            }}
          >
            Manual
          </span>
        ) : (
          <StatusPill status={status} small />
        )}
      </div>
      <span
        className="num text-right text-text-dim"
        style={{ fontSize: 12 }}
      >
        {String(observed)}
      </span>
    </div>
  );
}

function StatusPill({
  status,
  small = false,
}: {
  status: ParlayStatus | Decision["status"];
  small?: boolean;
}) {
  const color = pillColor(status);
  return (
    <span
      className="num uppercase"
      style={{
        fontSize: small ? 9.5 : 10.5,
        letterSpacing: 0.8,
        color,
        background: `${color}1a`,
        padding: small ? "3px 8px" : "4px 10px",
        borderRadius: 4,
        border: `1px solid ${color}33`,
      }}
    >
      {status}
    </span>
  );
}

function PayoutHero({
  summary,
}: {
  summary: {
    profit: number;
    stake: number;
    status: ParlayStatus;
    legs: { won: number; lost: number; live: number; unknown: number };
  };
}) {
  // Killed = at least one leg lost. Number goes muted red, no glow.
  // Alive  = still chasing. Number is huge and pulses.
  // Won    = settled green.
  const killed = summary.status === "lost";
  const won = summary.status === "won";
  const headline = killed ? "WOULD HAVE WON" : won ? "PAID" : "TO WIN";
  const color = killed ? "#e87c7c" : won ? "#7fd49a" : "#f5c558";
  const glow = killed
    ? "none"
    : won
      ? "0 0 60px rgba(127,212,154,0.45)"
      : "0 0 80px rgba(245,197,88,0.35)";

  // Scale typography to the magnitude — small profits feel small,
  // huge ones explode off the screen.
  const v = summary.profit;
  const heroSize =
    v >= 100_000 ? 132 : v >= 10_000 ? 108 : v >= 1_000 ? 88 : 64;

  return (
    <div
      className="relative overflow-hidden rounded-[18px] border px-6 py-7"
      style={{
        borderColor: killed ? "rgba(232,124,124,0.25)" : "rgba(245,197,88,0.3)",
        background: killed
          ? "radial-gradient(ellipse at 30% 0%, rgba(232,124,124,0.08), transparent 60%), #14110e"
          : won
            ? "radial-gradient(ellipse at 30% 0%, rgba(127,212,154,0.12), transparent 60%), #14110e"
            : "radial-gradient(ellipse at 30% 0%, rgba(245,197,88,0.13), transparent 60%), #14110e",
      }}
    >
      <div
        className="num font-semibold uppercase"
        style={{ fontSize: 10.5, letterSpacing: 2, color, opacity: 0.9 }}
      >
        {headline}
      </div>
      <div
        className="num mt-1 leading-none"
        style={{
          fontSize: heroSize,
          letterSpacing: -3,
          color,
          textShadow: glow,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {v.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        <span
          style={{
            fontSize: heroSize * 0.42,
            marginLeft: 8,
            letterSpacing: 0,
            opacity: 0.55,
          }}
        >
          u
        </span>
      </div>
      <div
        className="mt-2 text-text-dim flex items-center gap-2 flex-wrap"
        style={{ fontSize: 12.5 }}
      >
        Risking <span className="num text-text">{summary.stake.toFixed(1)}u</span>
        <span className="text-text-muted">·</span>
        <span className="num">
          {summary.legs.won}/{LEGS.length} legs cashed
        </span>
        {!killed && !won && summary.legs.live + summary.legs.unknown > 0 && (
          <>
            <span className="text-text-muted">·</span>
            <span style={{ color: "#f5c558" }} className="num">
              {summary.legs.live + summary.legs.unknown} still live
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "good" | "bad" | "neutral";
}) {
  const color =
    tone === "good" ? "#7fd49a" : tone === "bad" ? "#e87c7c" : "#f0ebe0";
  return (
    <div className="rounded-[12px] border border-line p-3 bg-surface-1">
      <div
        className="num font-semibold uppercase text-text-muted"
        style={{ fontSize: 10, letterSpacing: 1.2 }}
      >
        {label}
      </div>
      <div className="num mt-1" style={{ fontSize: 20, color }}>
        {value}
      </div>
    </div>
  );
}

function pillColor(status: string): string {
  switch (status) {
    case "won":
      return "#7fd49a";
    case "lost":
      return "#e87c7c";
    case "live":
      return "#f5c558";
    case "push":
      return "#7cc0e8";
    default:
      return "#a8b3ac";
  }
}

function fmtAmerican(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}
