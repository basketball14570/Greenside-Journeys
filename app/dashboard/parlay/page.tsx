"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  roundStats,
  type LeaderboardSnapshot,
  type RoundLine,
} from "@/lib/espn-leaderboard";
import { holeParFor } from "@/lib/data/course-pars";
import { encodeShared, type SharedLeg, type SharedLegStatus, type SharedParlay } from "@/lib/share/parlay";
import { toast } from "@/components/edge/Toast";

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

  // Position / observed-value flash. We diff each leg's observedValue
  // against its previous render and flash the row when it changes.
  // For top-N the lower number is better, so we direction-tag the flash
  // green (improved) or red (slipped). Flash auto-clears after 3.5s.
  const prevObserved = useRef<Record<string, string | number | undefined>>({});
  const [flashes, setFlashes] = useState<Record<string, "up" | "down" | null>>({});
  useEffect(() => {
    if (!decisions.length) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    decisions.forEach((d, i) => {
      const leg = LEGS[i];
      const key = leg.id;
      const cur = d.observedValue;
      const prev = prevObserved.current[key];
      if (prev !== undefined && cur !== undefined && prev !== cur) {
        const direction = directionOfChange(leg, prev, cur);
        if (direction) {
          setFlashes((f) => ({ ...f, [key]: direction }));
          timers.push(
            setTimeout(
              () => setFlashes((f) => ({ ...f, [key]: null })),
              3500,
            ),
          );
        }
      }
      prevObserved.current[key] = cur;
    });
    return () => timers.forEach(clearTimeout);
  }, [decisions]);

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
        <div className="flex items-center gap-2">
          <ShareButton
            decisions={decisions}
            summary={summary}
            event={snapshot?.event?.shortName ?? snapshot?.event?.name ?? null}
          />
          <button
            onClick={load}
            disabled={loading}
            className="rounded-[8px] px-3 py-1.5 border border-line hover:border-line-strong disabled:opacity-40"
            style={{ fontSize: 12 }}
          >
            {loading ? "Refreshing…" : "Refresh now"}
          </button>
        </div>
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

      {/* Off-week banner. ESPN says the tournament is over but legs are
          all graded — frame it that way so the page doesn't pretend to
          be live mid-week. */}
      {snapshot?.event?.state === "post" && (
        <div
          className="rounded-[12px] border p-4 flex items-baseline gap-3"
          style={{
            borderColor: "rgba(168,179,172,0.25)",
            background: "rgba(168,179,172,0.06)",
          }}
        >
          <span style={{ color: "#a8b3ac", fontSize: 12 }}>●</span>
          <div style={{ fontSize: 13.5, lineHeight: 1.5 }} className="flex-1">
            <strong className="text-text">
              {snapshot.event.shortName ?? snapshot.event.name} has wrapped.
            </strong>{" "}
            <span className="text-text-dim">
              Every leg below is graded permanently. Live parlay tracking
              resumes Thursday when the next event tees off.
            </span>
          </div>
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
              flash={flashes[l.id] ?? null}
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
  flash,
}: {
  leg: SlipLeg;
  decision: Decision | undefined;
  snapshot: LeaderboardSnapshot | null;
  isLast: boolean;
  flash: "up" | "down" | null;
}) {
  const status = decision?.status ?? "live";
  const manual =
    status === "unknown" &&
    /settle manually|fir \/ gir|not in free espn/i.test(decision?.reason ?? "");

  const observed = decision?.observedValue ?? "—";
  const trail = trailForLeg(leg, snapshot);
  const imminence = imminenceFor(leg, decision);

  // Flash overlays a tinted background that animates from full → 0 over 3.5s.
  const flashBg =
    flash === "up"
      ? "rgba(127,212,154,0.12)"
      : flash === "down"
        ? "rgba(232,124,124,0.12)"
        : null;

  return (
    <div
      className="grid gap-2 px-4 py-3 items-center"
      style={{
        gridTemplateColumns: "1.6fr 1fr 110px 110px",
        fontSize: 13,
        borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.06)",
        background:
          flashBg ??
          (status === "won"
            ? "rgba(127,212,154,0.05)"
            : status === "lost"
              ? "rgba(232,124,124,0.05)"
              : "transparent"),
        transition: "background 1200ms ease-out",
      }}
    >
      <div className="min-w-0">
        <div className="text-text font-medium truncate flex items-center gap-1.5">
          {leg.player}
          {flash && (
            <span
              className="num"
              style={{
                fontSize: 11,
                color: flash === "up" ? "#7fd49a" : "#e87c7c",
                opacity: 0.9,
              }}
            >
              {flash === "up" ? "▲" : "▼"}
            </span>
          )}
        </div>
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
        {trail && <HoleTrail trail={trail} />}
      </div>
      <div
        className="text-text-dim truncate"
        style={{ fontSize: 12 }}
      >
        {decision?.reason ?? (snapshot ? "Loading…" : "Waiting for ESPN")}
        {imminence && (
          <div
            className="num mt-0.5"
            style={{
              fontSize: 10.5,
              letterSpacing: 0.5,
              color: imminence.tone === "good" ? "#7fd49a" : "#f5c558",
            }}
          >
            {imminence.label}
          </div>
        )}
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

// Hole-by-hole birdie/par/bogey trail for round-prop legs. Reads the
// per-hole strokes ESPN already gave us in the snapshot and color-codes
// against course par. Empty slots are unplayed holes.
function HoleTrail({ trail }: { trail: HoleResult[] }) {
  return (
    <div className="mt-1.5 flex items-center gap-[3px]">
      {trail.map((h, i) => {
        const { color, glyph, title } = trailVisual(h);
        return (
          <span
            key={i}
            title={title}
            className="num"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 14,
              height: 14,
              borderRadius: 3,
              background: color.bg,
              color: color.fg,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 0,
              lineHeight: 1,
              opacity: h.played ? 1 : 0.25,
            }}
          >
            {glyph}
          </span>
        );
      })}
    </div>
  );
}

type HoleResult = {
  hole: number;
  played: boolean;
  diff: number | null; // strokes - par; null when unplayed
};

function trailForLeg(
  leg: SlipLeg,
  snapshot: LeaderboardSnapshot | null,
): HoleResult[] | null {
  if (!snapshot || leg.kind !== "round_prop") return null;
  if (!["birdies", "bogeys", "eagles"].includes(leg.metric)) return null;
  const norm = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
      .replace(/ø/g, "o").replace(/å/g, "a").replace(/æ/g, "ae")
      .replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
  const target = norm(leg.player);
  const p =
    snapshot.players.find((x) => norm(x.name) === target) ??
    snapshot.players.find((x) => norm(x.name).includes(target));
  if (!p) return null;
  const round: RoundLine | undefined = p.rounds.find((r) => r.period === leg.round);
  if (!round || round.holes.length === 0) return null;
  return round.holes.map((h) => {
    const par = h.par ?? holeParFor(snapshot.event?.course ?? null, h.hole);
    const played = h.strokes !== null && h.strokes > 0;
    return {
      hole: h.hole,
      played,
      diff: played ? (h.strokes as number) - par : null,
    };
  });
}

function trailVisual(h: HoleResult): {
  color: { bg: string; fg: string };
  glyph: string;
  title: string;
} {
  if (!h.played) {
    return {
      color: { bg: "rgba(255,255,255,0.04)", fg: "rgba(255,255,255,0.3)" },
      glyph: "·",
      title: `Hole ${h.hole} — not played`,
    };
  }
  const d = h.diff ?? 0;
  if (d <= -2)
    return {
      color: { bg: "rgba(127,212,154,0.35)", fg: "#0f1410" },
      glyph: "E",
      title: `Hole ${h.hole} — eagle`,
    };
  if (d === -1)
    return {
      color: { bg: "rgba(127,212,154,0.2)", fg: "#7fd49a" },
      glyph: "B",
      title: `Hole ${h.hole} — birdie`,
    };
  if (d === 0)
    return {
      color: { bg: "rgba(255,255,255,0.06)", fg: "rgba(255,255,255,0.7)" },
      glyph: "·",
      title: `Hole ${h.hole} — par`,
    };
  if (d === 1)
    return {
      color: { bg: "rgba(245,197,88,0.18)", fg: "#f5c558" },
      glyph: "+",
      title: `Hole ${h.hole} — bogey`,
    };
  return {
    color: { bg: "rgba(232,124,124,0.2)", fg: "#e87c7c" },
    glyph: "+",
    title: `Hole ${h.hole} — double or worse`,
  };
}

// "Reed clinches in 2 holes" / "Stevens needs 3 in 6" style urgency.
// Computed off the grader's reason where possible; otherwise from
// hole-trail data on round-prop legs.
function imminenceFor(
  leg: SlipLeg,
  decision: Decision | undefined,
): { label: string; tone: "good" | "warn" } | null {
  if (!decision || decision.status !== "live") return null;
  const r = decision.reason;
  // Round-prop "need M more in X" — already in reason text. Promote it.
  const m = r.match(/need (\d+) more in (\d+)/i);
  if (m) {
    const need = parseInt(m[1], 10);
    const left = parseInt(m[2], 10);
    if (need === 0)
      return { label: `Just hold — ${left} holes left`, tone: "good" };
    if (need <= left) return { label: `Need ${need} in ${left} holes`, tone: "warn" };
  }
  // Top-N: surface "inside top X by Y strokes" / "Y strokes from top X".
  if (leg.kind === "top_n") {
    // posDisplay like "T7" / "31" lives in observedValue
    const pos = String(decision.observedValue ?? "");
    const posNum = parseInt(pos.replace(/^T/, ""), 10);
    if (!Number.isNaN(posNum)) {
      const gap = leg.n - posNum;
      if (gap >= 0) return { label: `${gap === 0 ? "On the bubble" : `${gap} spots clear`}`, tone: "good" };
      return { label: `${Math.abs(gap)} spots short`, tone: "warn" };
    }
  }
  return null;
}

// Direction-tag a change in observedValue. Lower position-numbers are
// better for top-N; higher counts are better for over-birdie props, etc.
function directionOfChange(
  leg: SlipLeg,
  prev: string | number,
  cur: string | number,
): "up" | "down" | null {
  // top_n: parse "T7" / "31" — lower is better
  if (leg.kind === "top_n") {
    const a = parseInt(String(prev).replace(/^T/, ""), 10);
    const b = parseInt(String(cur).replace(/^T/, ""), 10);
    if (Number.isNaN(a) || Number.isNaN(b)) return null;
    if (b < a) return "up";
    if (b > a) return "down";
    return null;
  }
  // round_prop (birdies / strokes etc.): numeric. For "under" lines a
  // higher count is bad; for "over" lines higher is good. For strokes,
  // lower is good. Direction is from the bettor's perspective.
  if (leg.kind === "round_prop") {
    const a = Number(prev);
    const b = Number(cur);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    if (a === b) return null;
    const higherIsGood =
      leg.metric === "strokes" ? false : leg.side === "over";
    const improved = higherIsGood ? b > a : b < a;
    return improved ? "up" : "down";
  }
  // Outright: any move toward T1 is good, away from it is bad.
  if (leg.kind === "winner") {
    const a = parseInt(String(prev).replace(/^T/, ""), 10);
    const b = parseInt(String(cur).replace(/^T/, ""), 10);
    if (Number.isNaN(a) || Number.isNaN(b)) return null;
    if (b < a) return "up";
    if (b > a) return "down";
  }
  return null;
}

function StatusPill({
  status,
  small = false,
}: {
  status: ParlayStatus | Decision["status"];
  small?: boolean;
}) {
  const color = pillColor(status);
  const live = status === "live";
  return (
    <span
      className={`num uppercase ${live ? "gs-live-pulse" : ""}`}
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

// Share button — encodes the current parlay into a /share/parlay URL,
// copies it on click, and opens an X (Twitter) intent with a tight
// pre-filled caption. The encoded blob also drives /api/og/parlay,
// which is what X scrapes for the link preview image.
function ShareButton({
  decisions,
  summary,
  event,
}: {
  decisions: Decision[];
  summary: {
    stake: number;
    payout: number;
    status: ParlayStatus;
  };
  event: string | null;
}) {
  const onClick = () => {
    const sharedStatus: SharedLegStatus =
      summary.status === "unknown" ? "pending" : (summary.status as SharedLegStatus);

    const legs: SharedLeg[] = LEGS.map((l, i) => {
      const d = decisions[i];
      const rawStatus = d?.status;
      const status: SharedLegStatus =
        rawStatus === "won" || rawStatus === "lost" || rawStatus === "live"
          ? rawStatus
          : rawStatus === "push"
            ? "live"
            : "pending";
      const line = l.kind === "round_prop" ? `${l.side === "over" ? "O" : "U"}${l.line} ${l.metric}` : undefined;
      const market = describeLeg(l);
      return { player: l.player, market, line, status };
    });

    const payload: SharedParlay = {
      legs,
      stake: summary.stake,
      payout: summary.payout,
      status: sharedStatus,
      event: event ?? undefined,
    };

    const encoded = encodeShared(payload);
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/share/parlay?d=${encoded}`;

    const headline =
      summary.status === "won"
        ? `Cashed +$${Math.round(summary.payout - summary.stake).toLocaleString()}`
        : summary.status === "lost"
          ? `Down $${Math.round(summary.stake).toLocaleString()}`
          : `$${Math.round(summary.payout).toLocaleString()} live`;
    const text = `${headline} on a ${legs.length}-leg parlay. Tracked live on Greenside.`;

    const tweet = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      text,
    )}&url=${encodeURIComponent(url)}`;

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(url).then(
        () => toast("Share link copied — and X is opening", "success"),
        () => toast("Couldn't access clipboard — X is still opening", "warn"),
      );
    }
    if (typeof window !== "undefined") {
      window.open(tweet, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <button
      onClick={onClick}
      className="rounded-[8px] px-3 py-1.5 border hover:bg-surface-2 transition-colors"
      style={{
        fontSize: 12,
        borderColor: "#7fd49a55",
        color: "#7fd49a",
        background: "#7fd49a0d",
      }}
      title="Share this parlay"
    >
      Share parlay
    </button>
  );
}
