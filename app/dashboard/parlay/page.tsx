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
  type LeaderboardSnapshot,
} from "@/lib/espn-leaderboard";
import { encodeShared, type SharedLeg, type SharedLegStatus, type SharedParlay } from "@/lib/share/parlay";
import { encodeLeg, type SharedSingleLeg } from "@/lib/share/leg";
import { toast } from "@/components/edge/Toast";
import { useBetSlip } from "@/lib/bet-slip-store";
import {
  MatchupDetail,
  ThreeBallDetail,
  HoleTrail,
  trailForPlayerRound,
  type HoleResult,
} from "@/components/edge/LiveLegDetail";
import { YourPlayersToday } from "@/components/edge/YourPlayersToday";

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
  // Round-narrowed matchup — head-to-head against a single opponent on
  // R4. Lower round-strokes wins. The matchup detail row beneath shows
  // both players' to-par + hole trail + the "X UP" / "AS" indicator.
  {
    id: "hovland-vs-cantlay-r4",
    createdAt: new Date().toISOString(),
    kind: "matchup",
    player: "Viktor Hovland",
    opponent: "Patrick Cantlay",
    stake: PARLAY_STAKE,
    americanOdds: -115,
    book: "DK",
    round: 4,
  },
  // 3-ball — pick the lowest round score from a group of three.
  // Detail row shows each player's to-par + trail + leaderboard
  // position (1st / 2nd / 3rd) within the group.
  {
    id: "scheffler-3ball-r4",
    createdAt: new Date().toISOString(),
    kind: "three_ball",
    player: "Scottie Scheffler",
    others: ["Matt Fitzpatrick", "Justin Rose"],
    stake: PARLAY_STAKE,
    americanOdds: 109,
    book: "DK",
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

  // Prefer the user's actual uploaded slip when it has legs — that's
  // what they want tracked live. Fall back to the hardcoded demo
  // parlay so the page still shows something meaningful when the
  // slip is empty (new users, signed-out demos, etc).
  const { slip, clear: clearSlip, ready: slipReady } = useBetSlip();
  const legs: SlipLeg[] = slipReady && slip.legs.length > 0 ? slip.legs : LEGS;
  const usingUserSlip = slipReady && slip.legs.length > 0;

  const decisions: Decision[] = useMemo(() => {
    if (!snapshot) return [];
    return legs.map((l) => gradeBet(legToOpenBet(l), snapshot));
  }, [snapshot, legs]);

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
      const leg = legs[i];
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
    const parlayDecimal = legs.reduce(
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
            style={{
              fontSize: "clamp(24px, 7vw, 36px)",
              letterSpacing: -0.4,
              fontStyle: "normal",
            }}
          >
            <em>This week&apos;s ticket.</em>
            <StatusPill status={summary.status} />
          </h1>
          <p
            className="text-text-dim mt-2 max-w-2xl"
            style={{ fontSize: 13.5 }}
          >
            {legs.length}-leg parlay · {usingUserSlip ? "your slip" : snapshot?.event?.name ?? "live event"}{" "}
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
            legs={legs}
            decisions={decisions}
            summary={summary}
            event={snapshot?.event?.shortName ?? snapshot?.event?.name ?? null}
          />
          {usingUserSlip && (
            <button
              onClick={() => {
                clearSlip();
                toast("Cleared your slip — back to demo parlay", "info");
              }}
              className="rounded-[8px] px-3 py-1.5 border border-line hover:bg-surface-2"
              style={{ fontSize: 12 }}
              title="Clear your uploaded slip and return to the demo parlay"
            >
              Clear slip
            </button>
          )}
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

      {/* Horizontal "your players today" strip — every player on your
          slip plus the opponents in matchups / 3-balls, with live
          leaderboard position. Lets users scan the field without
          scrolling through every leg. */}
      <YourPlayersToday legs={legs} snapshot={snapshot} />

      {/* Parlay container — wraps payout hero, stats, and legs in one
          thick-bordered card so a multi-leg parlay reads as ONE bet, not
          a list of independent bets. Border color picks up the rollup
          status (green when winning, amber live, red losing) so the
          ticket "feels" alive at a glance. */}
      <div
        className="rounded-[18px] border-2 overflow-hidden"
        style={{
          borderColor:
            summary.status === "won"
              ? "rgba(127,212,154,0.5)"
              : summary.status === "lost"
                ? "rgba(232,124,124,0.5)"
                : summary.status === "live"
                  ? "rgba(245,197,88,0.4)"
                  : "rgba(255,255,255,0.14)",
          background: "rgba(0,0,0,0.18)",
        }}
      >
        <div className="p-4 lg:p-5 space-y-4">
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
        </div>

        <section className="border-t border-line overflow-hidden">
        {/* Column header — desktop only. On mobile each leg renders as a
            stacked card so labels would just take up room. */}
        <div
          className="hidden md:grid gap-2 px-4 py-2.5 num font-semibold uppercase text-text-muted border-b border-line"
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
        {legs.map((l, i) => {
          const d = decisions[i];
          return (
            <LegRow
              key={l.id}
              leg={l}
              decision={d}
              snapshot={snapshot}
              event={snapshot?.event?.shortName ?? snapshot?.event?.name ?? null}
              isLast={i === legs.length - 1}
              flash={flashes[l.id] ?? null}
            />
          );
        })}
        </section>
      </div>

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
  event,
  isLast,
  flash,
}: {
  leg: SlipLeg;
  decision: Decision | undefined;
  snapshot: LeaderboardSnapshot | null;
  event: string | null;
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

  const rowBg =
    flashBg ??
    (status === "won"
      ? "rgba(127,212,154,0.05)"
      : status === "lost"
        ? "rgba(232,124,124,0.05)"
        : "transparent");

  return (
    <>
      {/* Mobile: stacked card. Status + observed move to a header strip
          above the player name so the leg reads top-down on phone. */}
      <div
        className="md:hidden px-4 py-3 space-y-1.5"
        style={{
          borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.06)",
          background: rowBg,
          transition: "background 1200ms ease-out",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="text-text font-medium truncate"
              style={{ fontSize: 14 }}
            >
              {leg.player}
            </span>
            {flash && (
              <span
                className="num shrink-0"
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
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="num text-text-dim"
              style={{ fontSize: 11.5 }}
            >
              {String(observed)}
            </span>
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
        </div>
        <div className="text-text-dim flex items-center justify-between gap-2" style={{ fontSize: 12 }}>
          <span className="min-w-0 truncate">
            {describeLeg(leg)} ·{" "}
            <span className="num">
              {leg.americanOdds > 0 ? "+" : ""}
              {leg.americanOdds}
            </span>
          </span>
          <ShareLegButton leg={leg} decision={decision} event={event} />
        </div>
        <div className="text-text-dim" style={{ fontSize: 11.5, lineHeight: 1.4 }}>
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
        {trail && (
          <div className="pt-0.5">
            <HoleTrail trail={trail} />
          </div>
        )}
      </div>

      {/* Desktop: original 4-column grid. */}
      <div
        className="hidden md:grid gap-2 px-4 py-3 items-center"
        style={{
          gridTemplateColumns: "1.6fr 1fr 110px 110px",
          fontSize: 13,
          borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.06)",
          background: rowBg,
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
          {trail && (
            <div className="mt-1.5">
              <HoleTrail trail={trail} />
            </div>
          )}
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
        <div className="text-right flex flex-col items-end gap-1">
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
          <ShareLegButton leg={leg} decision={decision} event={event} />
        </div>
        <span
          className="num text-right text-text-dim"
          style={{ fontSize: 12 }}
        >
          {String(observed)}
        </span>
      </div>
      {leg.kind === "matchup" && (
        <MatchupDetail leg={leg} snapshot={snapshot} />
      )}
      {leg.kind === "three_ball" && (
        <ThreeBallDetail leg={leg} snapshot={snapshot} />
      )}
    </>
  );
}

function trailForLeg(
  leg: SlipLeg,
  snapshot: LeaderboardSnapshot | null,
): HoleResult[] | null {
  if (!snapshot || leg.kind !== "round_prop") return null;
  if (!["birdies", "bogeys", "eagles"].includes(leg.metric)) return null;
  return trailForPlayerRound(leg.player, leg.round, snapshot);
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
      className="relative overflow-hidden rounded-[18px] border px-4 md:px-6 py-5 md:py-7"
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
          // Clamp on mobile so 132px hero doesn't blow past the viewport.
          // Floor 40px, scale at 14vw, cap at heroSize.
          fontSize: `clamp(40px, 14vw, ${heroSize}px)`,
          letterSpacing: -2,
          color,
          textShadow: glow,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {v.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        <span
          style={{
            fontSize: `clamp(18px, 6vw, ${heroSize * 0.42}px)`,
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
          {summary.legs.won}/{summary.legs.won + summary.legs.lost + summary.legs.live + summary.legs.unknown} legs cashed
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
  legs: sourceLegs,
  decisions,
  summary,
  event,
}: {
  legs: SlipLeg[];
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

    const legs: SharedLeg[] = sourceLegs.map((l, i) => {
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
      // For matchup / 3-ball, surface a one-line live state on the
      // share card. The decision.reason already reads naturally
      // ("Up 2 on Cantlay", "Beat Cantlay by 2 on R4") so reuse it.
      const detail =
        (l.kind === "matchup" || l.kind === "three_ball") && d?.reason
          ? d.reason
          : undefined;
      return { player: l.player, market, line, status, detail };
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

// Per-leg share — generates a single-leg "trash talk" share card. Hero
// text comes from the decision reason/observedValue so it reads
// naturally ("Up 2 on Cantlay", "T7 · clear of top 10", "5 birdies
// thru 11"). Same encode+tweet flow as the parlay share button.
function ShareLegButton({
  leg,
  decision,
  event,
}: {
  leg: SlipLeg;
  decision: Decision | undefined;
  event: string | null;
}) {
  const onClick = () => {
    const rawStatus = decision?.status;
    const status: SharedLegStatus =
      rawStatus === "won" || rawStatus === "lost" || rawStatus === "live"
        ? rawStatus
        : rawStatus === "push"
          ? "live"
          : "pending";

    const hero = heroForLeg(leg, decision);
    const decimal = americanToDecimal(leg.americanOdds);
    const payload: SharedSingleLeg = {
      player: leg.player,
      market: describeLeg(leg),
      hero,
      status,
      americanOdds: leg.americanOdds,
      stake: leg.stake,
      toWin: leg.stake * decimal,
      event: event ?? undefined,
    };

    const encoded = encodeLeg(payload);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/share/leg?d=${encoded}`;

    const caption =
      status === "won"
        ? `${leg.player} cashed. ${hero}.`
        : status === "lost"
          ? `${leg.player} ${hero}.`
          : `${leg.player} — ${hero}. Tracked live on Greenside.`;

    const tweet = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      caption,
    )}&url=${encodeURIComponent(url)}`;

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(url).then(
        () => toast("Leg link copied — and X is opening", "success"),
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
      className="num uppercase hover:opacity-100 transition-opacity"
      style={{
        fontSize: 9.5,
        letterSpacing: 0.6,
        color: "#a8b3ac",
        padding: "2px 6px",
        borderRadius: 4,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
        opacity: 0.7,
      }}
      title="Share this leg as a single-bet card"
    >
      ↗ Share
    </button>
  );
}

// Build the one-line live state that becomes the hero on the share
// card. Falls back through decision.reason → observedValue → market
// text so we always have something readable.
function heroForLeg(leg: SlipLeg, decision: Decision | undefined): string {
  if (decision?.reason && decision.reason.length > 0) return decision.reason;
  if (decision?.observedValue !== undefined) return String(decision.observedValue);
  return describeLeg(leg);
}
