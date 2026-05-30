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
import {
  deriveShotCounts,
  gradeShotProp,
  normShotName as normName,
  type ShotCounts,
} from "@/lib/bets/shot-props";
import { resolveCourseName } from "@/lib/data/course-pars";
import { useStarredGolfers, normalizePlayerKey } from "@/lib/starred-golfers";
import { StarButton } from "@/components/edge/StarButton";
import { buildScorecard, HoleStrip, type HoleCell } from "@/components/edge/HoleScorecard";
import { PageHeader } from "@/components/edge/PageHeader";
import { PlayerAvatar } from "@/components/edge/PlayerAvatar";
import { shareParlayImage, type ShareLeg } from "@/lib/parlay-share";

// Per-player live shot-quality stats from DataGolf. Pulled separately
// from the leaderboard so a DataGolf outage doesn't break grading.
type DGStat = {
  player_name: string;
  sg_total?: number | null;
  sg_ott?: number | null;
  sg_app?: number | null;
  sg_arg?: number | null;
  sg_putt?: number | null;
  accuracy?: number | null;
  gir?: number | null;
  scrambling?: number | null;
  distance?: number | null;
};

// Match a bet's player name to the DG row. DataGolf serves "Last, First"
// while sportsbooks send "First Last" — normalize both before comparing.
// (Shared with the settlement cron via lib/bets/shot-props.)

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
  placed_at: string | null;
  created_at: string;
};

type GradedLeg = {
  bet: ApiBet;
  decision: Decision | null;
  dg: DGStat | null;
  teeTime?: string | null;
  shots?: ShotCounts | null;
  player?: LeaderboardPlayer | null;
  scorecard?: HoleCell[] | null;
};

// One-line shot summary for the shared image, mirroring the on-card
// strip: "SG +0.9 · FH 13/18 · GIR 14/14 · Scr 1/2 · 297y".
function formatShotLine(
  dg: DGStat | null,
  shots: ShotCounts | null,
): string | null {
  const parts: string[] = [];
  if (dg?.sg_total != null) parts.push(`SG ${fmtSigned(dg.sg_total)}`);
  if (shots?.fh) parts.push(`FH ${shots.fh}`);
  if (shots?.gir) parts.push(`GIR ${shots.gir}`);
  if (shots?.scr) parts.push(`Scr ${shots.scr}`);
  if (dg?.distance != null) parts.push(`${Math.round(dg.distance)}y`);
  return parts.length ? parts.join(" · ") : null;
}

// Ticket-level status across all of its legs. A ticket is "live" if any
// leg is currently playing, "done" if every leg has finished today (or
// already graded), "upcoming" if any leg still has a future tee time,
// otherwise "other" (cut, withdrew, off-event). The order across sections
// mirrors the Today widget so the two surfaces feel like one product.
type TicketSection = {
  key: "live" | "upcoming" | "done" | "other";
  label: string;
  accent: string;
  tickets: { key: string; legs: GradedLeg[] }[];
};

function ticketBucket(
  legs: GradedLeg[],
): { bucket: TicketSection["key"]; sortKey: number } {
  let hasLive = false;
  let hasUpcoming = false;
  let allDone = true;
  let earliestUpcomingMs = Number.POSITIVE_INFINITY;
  let mostUrgentLive = Number.POSITIVE_INFINITY;
  let latestDoneMs = 0;
  for (const leg of legs) {
    const today = leg.player?.todayLine;
    const teeMs = leg.teeTime ? Date.parse(leg.teeTime) : NaN;
    const settled = leg.bet.status === "won" || leg.bet.status === "lost" || leg.bet.status === "push" || leg.bet.status === "void";
    if (settled) {
      if (Number.isFinite(teeMs)) latestDoneMs = Math.max(latestDoneMs, teeMs);
      continue;
    }
    // todayLine being present is the "playing today" signal — ESPN sets
    // it when a player tees off, even before they complete their first
    // hole (thru is still null in that window). Don't gate on thru > 0.
    if (today) {
      if (today.complete || today.thru === 18) {
        if (Number.isFinite(teeMs)) latestDoneMs = Math.max(latestDoneMs, teeMs);
        continue;
      }
      allDone = false;
      hasLive = true;
      mostUrgentLive = Math.min(mostUrgentLive, 18 - (today.thru ?? 0));
      continue;
    }
    allDone = false;
    if (leg.teeTime && Number.isFinite(teeMs)) {
      hasUpcoming = true;
      earliestUpcomingMs = Math.min(earliestUpcomingMs, teeMs);
    }
  }
  if (hasLive) return { bucket: "live", sortKey: mostUrgentLive };
  if (hasUpcoming) return { bucket: "upcoming", sortKey: earliestUpcomingMs };
  if (allDone) return { bucket: "done", sortKey: -latestDoneMs };
  return { bucket: "other", sortKey: Number.MAX_SAFE_INTEGER };
}

function bucketTickets(
  groups: { key: string; legs: GradedLeg[] }[],
): TicketSection[] {
  const sections: TicketSection[] = [
    { key: "live", label: "Live now", accent: "#7fd49a", tickets: [] },
    { key: "upcoming", label: "Teeing off", accent: "#cdb47a", tickets: [] },
    { key: "done", label: "Played — awaiting grade", accent: "#6c7a72", tickets: [] },
    { key: "other", label: "Other", accent: "#6c7a72", tickets: [] },
  ];
  const annotated = groups.map((g) => ({ group: g, ...ticketBucket(g.legs) }));
  for (const a of annotated) {
    sections.find((s) => s.key === a.bucket)!.tickets.push(a.group);
  }
  for (const s of sections) {
    s.tickets.sort((a, b) => {
      const ka = ticketBucket(a.legs).sortKey;
      const kb = ticketBucket(b.legs).sortKey;
      return ka - kb;
    });
  }
  return sections.filter((s) => s.tickets.length > 0);
}

function TicketSectionHeader({
  label,
  count,
  accent,
}: {
  label: string;
  count: number;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-2 px-1">
      <span
        className="inline-block rounded-full"
        style={{ width: 6, height: 6, background: accent }}
      />
      <span
        className="num uppercase"
        style={{ fontSize: 10, letterSpacing: 1.2, color: "#a8b3ac", fontWeight: 600 }}
      >
        {label}
      </span>
      <span
        className="num"
        style={{ fontSize: 10, color: "#6c7a72", letterSpacing: 0.5 }}
      >
        · {count}
      </span>
    </div>
  );
}

// Earliest tee time first; players with no tee time (already off, or not
// in the field) sort to the bottom. ESPN tee times are ISO strings, so a
// lexicographic compare is also chronological.
function byTeeTime(a: GradedLeg, b: GradedLeg): number {
  const ta = a.teeTime ?? null;
  const tb = b.teeTime ?? null;
  if (ta && tb) return ta < tb ? -1 : ta > tb ? 1 : 0;
  if (ta) return -1;
  if (tb) return 1;
  return 0;
}

// ── Live "to cash" estimate (sweat meter) ───────────────────────────
// Coarse and transparent, NOT a book price. Decided legs are 1 / 0; live
// legs lean from 50% toward 100% / 0% as their deciding period plays out
// and the current side holds. The parlay number is the product across
// legs — one missed leg busts it to 0.
function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function sweat(winning: boolean, progress: number): number {
  const p = 0.5 + 0.45 * clamp01(progress) * (winning ? 1 : -1);
  return Math.max(0.03, Math.min(0.97, p));
}

function legWinProbability(g: GradedLeg, period: number): number | null {
  const d = g.decision;
  if (!d) return null;
  if (d.status === "won" || d.status === "push") return 1;
  if (d.status === "lost") return 0;
  if (d.status !== "live") return null; // unknown / unpriced

  const ob = dbBetToOpenBet(g.bet);
  const m = ob.market.toLowerCase();
  const p = g.player;
  const thru = p?.todayLine?.thru ?? g.shots?.played ?? 0;
  const roundScoped = ob.round != null;
  const progress = roundScoped
    ? thru / 18
    : (Math.max(0, (period || 1) - 1) + thru / 18) / 4;

  // 3-ball / matchup — read the match-play standing.
  if (m.includes("3-ball") || m.includes("3 ball") || m.includes("vs") || m.includes("matchup")) {
    const st = (d.standing ?? "").toLowerCase();
    if (st === "as") return 0.45;
    if (st.includes("up")) return sweat(true, progress);
    if (st.includes("down") || st.includes("dn")) return sweat(false, progress);
    return 0.4;
  }
  // Position bets.
  if (m.includes("top")) {
    const target = parseInt(m.match(/top\s*(\d+)/)?.[1] ?? "10", 10);
    return sweat(p?.posNum != null && p.posNum <= target, progress);
  }
  if (m.includes("win")) {
    return sweat(p?.posNum === 1, progress);
  }
  // Count / score over-under props (birdies, bogeys, round score, FH, GIR).
  const observed = typeof d.observedValue === "number" ? d.observedValue : null;
  const lineMatch = ob.line.match(/(\d+(?:\.\d+)?)/);
  const side: "over" | "under" =
    /^u/i.test(ob.line.trim()) || /\b(under|lower)\b/.test(m) ? "under" : "over";
  if (observed != null && lineMatch) {
    const line = parseFloat(lineMatch[1]);
    const proj = thru > 0 ? (observed / thru) * 18 : observed;
    return sweat(side === "over" ? proj > line : proj < line, progress);
  }
  return 0.5;
}

function parlayCash(
  legs: GradedLeg[],
  period: number,
): { pct: number; unpriced: number } {
  let prod = 1;
  let priced = 0;
  let unpriced = 0;
  for (const g of legs) {
    const p = legWinProbability(g, period);
    if (p == null) {
      unpriced++;
      continue;
    }
    prod *= p;
    priced++;
  }
  return { pct: priced > 0 ? prod : 0, unpriced };
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
  const [dgStats, setDgStats] = useState<DGStat[]>([]);
  const [signedIn, setSignedIn] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // Leaderboard first so we know the active round, then pull
        // round-scoped shot stats whose denominators match holes played.
        const lb = await fetchLeaderboard().catch(() => null);
        const round = lb?.event?.period;
        const roundQ = round && round >= 1 && round <= 4 ? `?round=${round}` : "";
        const [bRes, dgRes] = await Promise.all([
          fetch("/api/bets/mine?limit=200", { cache: "no-store" }),
          fetch(`/api/players/live-stats${roundQ}`, { cache: "no-store" }).catch(
            () => null,
          ),
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
        if (dgRes && dgRes.ok) {
          const dj = await dgRes.json();
          setDgStats(Array.isArray(dj.stats) ? dj.stats : []);
        }
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

  // Build name → DG stats map once per snapshot refresh.
  const statByName = useMemo(() => {
    const m = new Map<string, DGStat>();
    for (const s of dgStats) m.set(normName(s.player_name), s);
    return m;
  }, [dgStats]);

  // Leaderboard row per player — drives tee-time ordering and the shot
  // counts (needs each player's current-round holes).
  const playerByName = useMemo(() => {
    const m = new Map<string, LeaderboardPlayer>();
    if (snapshot) for (const p of snapshot.players) m.set(normName(p.name), p);
    return m;
  }, [snapshot]);

  const courseName = resolveCourseName(
    snapshot?.event?.course ?? null,
    snapshot?.event?.name ?? null,
  );

  const graded: GradedLeg[] = (bets ?? []).map((b) => {
    const dg = statByName.get(normName(b.player)) ?? null;
    const lp = playerByName.get(normName(b.player)) ?? null;
    const shots = deriveShotCounts(dg, lp?.todayLine, courseName, snapshot?.event?.holePars);
    const ob = dbBetToOpenBet(b);
    let decision = snapshot ? gradeBet(ob, snapshot) : null;
    // Fairways / GIR props aren't in ESPN's feed, so the base grader punts
    // them to manual. We have the counts from DataGolf — grade them live.
    if (decision && shots) {
      const sp = gradeShotProp(ob, shots);
      if (sp) decision = sp;
    }
    return {
      bet: b,
      decision,
      dg,
      teeTime: lp?.teeTime ?? null,
      shots,
      player: lp,
      scorecard: buildScorecard(lp?.todayLine ?? null, courseName, snapshot?.event?.holePars),
    };
  });

  // Group legs by the upload batch (every leg saved in one upload shares
  // a placed_at), so a parlay shows as one card instead of N loose legs.
  const groups = useMemo(() => {
    const map = new Map<string, GradedLeg[]>();
    for (const g of graded) {
      const key = g.bet.placed_at ?? g.bet.created_at ?? g.bet.id;
      const arr = map.get(key);
      if (arr) arr.push(g);
      else map.set(key, [g]);
    }
    return Array.from(map.entries())
      .map(([key, legs]) => ({ key, legs: [...legs].sort(byTeeTime) }))
      .sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [graded]);

  async function dismissBatch(ids: string[]) {
    await Promise.all(
      ids.map((id) =>
        fetch("/api/bets/mine", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, action: "dismiss" }),
        }).catch(() => null),
      ),
    );
    setBets((prev) => (prev ? prev.filter((b) => !ids.includes(b.id)) : prev));
  }

  return (
    <div className="px-5 py-5 space-y-5">
      <PageHeader
        kicker="Live tickets"
        title="Tracking now."
        accent="green"
        live={snapshot?.event?.state === "in"}
        subtitle="Open bets graded against the live ESPN leaderboard. Updates every minute."
      />

      <UploadTicketButton />

      <StarredGolfersSection snapshot={snapshot} />

      {!signedIn && <SignInPrompt />}

      {signedIn && loading && bets === null && <SkeletonRows />}

      {signedIn && bets !== null && bets.length === 0 && <EmptyState />}

      {signedIn && groups.length > 0 && (
        <div className="space-y-5">
          {bucketTickets(groups).map((section) => (
            <div key={section.key}>
              <TicketSectionHeader
                label={section.label}
                count={section.tickets.length}
                accent={section.accent}
              />
              <div className="space-y-4 mt-2">
                {section.tickets.map((group) => (
                  <ParlayGroup
                    key={group.key}
                    legs={group.legs}
                    eventName={snapshot?.event?.shortName ?? snapshot?.event?.name ?? null}
                    period={snapshot?.event?.period ?? 1}
                    onRemoveAll={() => dismissBatch(group.legs.map((g) => g.bet.id))}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ParlayGroup({
  legs,
  eventName,
  period,
  onRemoveAll,
}: {
  legs: GradedLeg[];
  eventName?: string | null;
  period: number;
  onRemoveAll: () => void;
}) {
  const first = legs[0].bet;
  const multi = legs.length > 1;
  const cash = multi ? parlayCash(legs, period) : null;
  const when = first.placed_at
    ? new Date(first.placed_at).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;
  // Prefer the real ticket payout captured from the slip (stored on each
  // leg, normalized to a $10 stake). Fall back to the product of per-leg
  // decimal odds when no parlay multiplier was captured.
  const storedStake = Number(first.stake);
  const storedPayout = Number(first.to_win);
  const hasRealPayout = storedStake > 0 && storedPayout > 0;
  const combined = hasRealPayout
    ? storedPayout / storedStake
    : legs.reduce((acc, g) => acc * americanToDecimal(g.bet.american_odds), 1);
  const stakeShown = hasRealPayout ? storedStake : 10;
  // Stake is editable inline — handy when no real wager was captured and we
  // defaulted to $10. Editing recomputes to-win at the same odds.
  const [customStake, setCustomStake] = useState<number | null>(null);
  const [editingStake, setEditingStake] = useState(false);
  const stakeVal = customStake ?? stakeShown;
  const payoutVal = stakeVal * combined;
  // Parlays never carry a real captured wager (the save path normalizes to
  // a $10 stake), so their stake is always user-editable — including after
  // a previous edit. Singles stay static once a real payout is captured.
  const stakeIsDefault = multi || !hasRealPayout;
  function commitStake(raw: string) {
    const n = Number(raw);
    setEditingStake(false);
    if (!Number.isFinite(n) || n <= 0) {
      setCustomStake(null);
      return;
    }
    setCustomStake(n);
    // Persist to every leg so the edit survives a reload.
    void fetch("/api/bets/stake", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ids: legs.map((l) => l.bet.id),
        stake: n,
        to_win: Number((n * combined).toFixed(2)),
      }),
    });
  }

  // Parlay status — all legs must hit, so one loss busts the ticket.
  const lost = legs.filter((l) => l.decision?.status === "lost").length;
  const won = legs.filter((l) => l.decision?.status === "won").length;
  const busted = lost > 0;
  const statusColor = busted ? "#e57373" : won === legs.length ? "#7fd49a" : "#f5c558";
  const statusText = busted
    ? `Busted · ${lost} missed`
    : won === legs.length
      ? "Hit — all legs"
      : `${won}/${legs.length} hit · alive`;

  function onShare() {
    const shareLegs: ShareLeg[] = legs.map((g) => ({
      player: g.bet.player,
      market: g.bet.market,
      line: g.bet.line !== null ? String(g.bet.line) : null,
      standing: g.decision?.standing,
      standingNote: g.decision?.standingNote,
      status: g.decision?.status ?? "unknown",
      stats: formatShotLine(g.dg, g.shots ?? null),
    }));
    void shareParlayImage({
      eventName,
      legCount: legs.length,
      book: first.book,
      combinedX: combined,
      stake: stakeVal,
      payout: payoutVal,
      statusText,
      statusColor,
      legs: shareLegs,
    });
  }

  return (
    <div
      className={multi ? "rounded-[16px] bg-bgDeep p-3.5" : ""}
      style={multi ? { border: "2px solid rgba(255,255,255,0.85)" } : undefined}
    >
      {multi && (
        <div className="flex items-start justify-between gap-2 px-1 pb-3">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span
                style={{ fontSize: 18, fontWeight: 800, color: "#ffffff", letterSpacing: -0.2 }}
              >
                {legs.length}-leg parlay
              </span>
              <span
                className="num font-semibold uppercase"
                style={{
                  fontSize: 9.5,
                  letterSpacing: 0.8,
                  color: statusColor,
                  padding: "2.5px 7px",
                  borderRadius: 4,
                  background: `${statusColor}1f`,
                  border: `1px solid ${statusColor}40`,
                }}
              >
                {statusText}
              </span>
            </div>
            <div className="num" style={{ fontSize: 11.5, color: "#a8b3ac", letterSpacing: 0.3, marginTop: 4 }}>
              {first.book.toUpperCase()}
              {when ? ` · ${when}` : ""} · {combined.toFixed(1)}x ·{" "}
              <span style={{ color: "#8ee68e" }}>
                {stakeIsDefault && editingStake ? (
                  <input
                    type="number"
                    autoFocus
                    min={1}
                    defaultValue={stakeVal}
                    onBlur={(e) => commitStake(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitStake(e.currentTarget.value);
                      if (e.key === "Escape") setEditingStake(false);
                    }}
                    className="num"
                    style={{
                      width: 60,
                      background: "#0c0f0c",
                      border: "1px solid rgba(142,230,142,0.5)",
                      borderRadius: 4,
                      color: "#8ee68e",
                      padding: "0 4px",
                      fontSize: 11.5,
                    }}
                  />
                ) : stakeIsDefault ? (
                  <button
                    type="button"
                    onClick={() => setEditingStake(true)}
                    title="Edit stake"
                    style={{
                      color: "#8ee68e",
                      textDecoration: "underline dotted",
                      textUnderlineOffset: 2,
                    }}
                  >
                    ${stakeVal.toLocaleString()}
                  </button>
                ) : (
                  `$${stakeVal.toLocaleString()}`
                )}
                {" → "}${payoutVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onShare}
              className="num uppercase rounded px-2 py-1 hover:bg-surface-2"
              style={{ fontSize: 9.5, letterSpacing: 0.8, color: "#8ee68e", border: "1px solid rgba(142,230,142,0.4)" }}
            >
              Share
            </button>
            <button
              onClick={onRemoveAll}
              className="num uppercase rounded px-2 py-1 hover:bg-surface-2"
              style={{ fontSize: 9.5, letterSpacing: 0.8, color: "#e57373", border: "1px solid rgba(229,115,115,0.4)" }}
            >
              Remove
            </button>
          </div>
        </div>
      )}
      {multi && cash && <SweatMeter pct={cash.pct} unpriced={cash.unpriced} />}
      <ul className="space-y-2.5">
        {legs.map((g) => (
          <LiveBetCard
            key={g.bet.id}
            bet={g.bet}
            decision={g.decision}
            dg={g.dg}
            shots={g.shots ?? null}
            scorecard={g.scorecard ?? null}
            player={g.player ?? null}
            eventName={eventName}
            hideMoney={multi}
            onRemove={!multi ? onRemoveAll : undefined}
          />
        ))}
      </ul>
    </div>
  );
}

function americanToDecimal(a: number): number {
  if (!a) return 1;
  return a > 0 ? 1 + a / 100 : 1 + 100 / Math.abs(a);
}

// Parlay "to cash" sweat bar. Estimate only — labeled as such — derived
// from each leg's live state, not a book price.
function SweatMeter({ pct, unpriced }: { pct: number; unpriced: number }) {
  const pctNum = pct * 100;
  // A long parlay's joint odds are tiny but nonzero — round-to-integer would
  // show a still-alive ticket as a flat "0%". Keep a decimal under 10% so the
  // user can see it's a longshot, not dead.
  const label =
    pctNum <= 0
      ? "0%"
      : pctNum < 0.1
        ? "<0.1%"
        : pctNum < 10
          ? `${pctNum.toFixed(1)}%`
          : `${Math.round(pctNum)}%`;
  const barWidth = Math.max(2, Math.round(pctNum));
  const color = pct >= 0.5 ? "#7fd49a" : pct >= 0.2 ? "#f5c558" : "#e57373";
  return (
    <div className="px-1 pb-3">
      <div className="flex items-center justify-between" style={{ marginBottom: 5 }}>
        <span
          className="num uppercase"
          style={{ fontSize: 9, letterSpacing: 1, color: "#6c7a72" }}
        >
          Live cash est.
        </span>
        <span className="num font-semibold" style={{ fontSize: 12, color }}>
          ≈ {label} to cash
          {unpriced ? (
            <span style={{ color: "#6c7a72", fontWeight: 400 }}>
              {" "}
              · {unpriced} unpriced
            </span>
          ) : null}
        </span>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 99,
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.max(2, barWidth)}%`,
            height: "100%",
            background: color,
            borderRadius: 99,
            transition: "width .3s ease",
          }}
        />
      </div>
    </div>
  );
}

function LiveBetCard({
  bet,
  decision,
  dg,
  shots,
  scorecard,
  player,
  eventName,
  onRemove,
  hideMoney,
}: {
  bet: ApiBet;
  decision: Decision | null;
  dg: DGStat | null;
  shots?: ShotCounts | null;
  scorecard?: HoleCell[] | null;
  player?: LeaderboardPlayer | null;
  eventName?: string | null;
  onRemove?: () => void;
  hideMoney?: boolean;
}) {
  const status = decision?.status ?? "unknown";
  const color = STATUS_COLOR[status];

  // Single-bet share — parlays share from their card header instead, so
  // this only appears on standalone (non-grouped) tickets.
  function onShareSingle() {
    const combinedX =
      Number(bet.stake) > 0
        ? Number(bet.to_win) / Number(bet.stake)
        : americanToDecimal(bet.american_odds);
    void shareParlayImage({
      eventName,
      legCount: 1,
      book: bet.book,
      combinedX,
      stake: Number(bet.stake),
      payout: Number(bet.to_win),
      statusText: STATUS_LABEL[status],
      statusColor: color,
      legs: [
        {
          player: bet.player,
          market: bet.market,
          line: bet.line !== null ? String(bet.line) : null,
          standing: decision?.standing,
          standingNote: decision?.standingNote,
          status,
          stats: formatShotLine(dg, shots ?? null),
        },
      ],
    });
  }
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
        <div className="flex flex-col items-end gap-1.5">
          <span className="flex items-center gap-2">
            <span
              className="num"
              style={{ fontSize: 11, color: "#a8b3ac", letterSpacing: 0.3 }}
            >
              {bet.book.toUpperCase()} · {fmtOdds(bet.american_odds)}
            </span>
            {!hideMoney && (
              <button
                onClick={onShareSingle}
                title="Share this bet"
                className="num uppercase rounded px-1.5 hover:bg-surface-2"
                style={{ fontSize: 9.5, letterSpacing: 0.8, color: "#8ee68e", lineHeight: 1 }}
              >
                Share
              </button>
            )}
            {onRemove && (
              <button
                onClick={onRemove}
                title="Remove this bet"
                className="num rounded px-1.5 hover:bg-surface-2"
                style={{ fontSize: 13, color: "#e57373", lineHeight: 1 }}
              >
                ✕
              </button>
            )}
          </span>
          {decision?.standing && (
            <div className="text-right leading-none">
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  letterSpacing: -0.5,
                  color:
                    status === "won"
                      ? "#7fd49a"
                      : status === "lost"
                        ? "#e57373"
                        : status === "push"
                          ? "#a8b3ac"
                          : "#ffffff",
                }}
              >
                {decision.standing}
              </div>
              {decision.standingNote && (
                <div
                  className="num"
                  style={{ fontSize: 11.5, fontWeight: 700, color: "#9aa6a0", letterSpacing: 0.3, marginTop: 3 }}
                >
                  {decision.standingNote}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-3">
        <PlayerAvatar
          name={bet.player}
          headshot={player?.headshot}
          flagHref={player?.flagHref}
          size={44}
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate" style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.2 }}>
            {bet.player}
          </h3>
          <p
            className="mt-0.5 text-text-dim truncate"
            style={{ fontSize: 12.5, lineHeight: 1.3 }}
          >
            {decision?.bet.market ?? bet.market}
            {bet.line !== null ? ` · ${bet.line}` : ""}
          </p>
        </div>
        {!hideMoney && (
          <div className="text-right shrink-0 leading-tight">
            <div className="num font-bold" style={{ fontSize: 16, color: "#7fd49a", letterSpacing: -0.3 }}>
              {Number(bet.to_win).toFixed(0)}
              <span style={{ fontSize: 11, color: "#a8b3ac" }}>u</span>
            </div>
            <div className="num text-text-muted mt-0.5" style={{ fontSize: 10.5, letterSpacing: 0.3 }}>
              risk {Number(bet.stake).toFixed(0)}u
            </div>
          </div>
        )}
      </div>
      {decision?.reason && (
        <p
          className="mt-2 num"
          style={{ fontSize: 11, color: "#a8b3ac", letterSpacing: 0.2 }}
        >
          {decision.reason}
        </p>
      )}
      {dg && <DGStatStrip dg={dg} shots={shots} />}
      {scorecard && scorecard.length > 0 && <HoleStrip cells={scorecard} />}
    </li>
  );
}

function DGStatStrip({ dg, shots }: { dg: DGStat; shots?: ShotCounts | null }) {
  // Hide the strip if every interesting field is missing — happens before
  // a player tees off on Thursday.
  const hasAny =
    dg.sg_total != null ||
    dg.accuracy != null ||
    dg.gir != null ||
    dg.scrambling != null;
  if (!hasAny) return null;
  const sgColor =
    (dg.sg_total ?? 0) > 0.5
      ? "#7fd49a"
      : (dg.sg_total ?? 0) < -0.5
        ? "#e57373"
        : "#a8b3ac";
  // Prefer "hit / attempts" counts (4/5 GIR) over a bare percentage —
  // it's the at-a-glance tracking the user wants. Falls back to nothing
  // when we can't derive a count (e.g. pre-tee).
  return (
    <div
      className="mt-2.5 pt-2 flex items-baseline gap-3 num flex-wrap"
      style={{
        borderTop: "1px dashed rgba(168,179,172,0.18)",
        fontSize: 11,
        letterSpacing: 0.3,
      }}
    >
      {dg.sg_total != null && (
        <Stat label="SG" value={fmtSigned(dg.sg_total)} color={sgColor} />
      )}
      {shots?.fh && <Stat label="FH" value={shots.fh} />}
      {shots?.gir && <Stat label="GIR" value={shots.gir} />}
      {shots?.scr && <Stat label="Scr" value={shots.scr} />}
      {dg.distance != null && (
        <Stat label="Dist" value={`${Math.round(dg.distance)}y`} />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  color = "#f0ebe0",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <span style={{ color: "#6c7a72" }}>
      {label}{" "}
      <strong style={{ color }}>{value}</strong>
    </span>
  );
}

function fmtSigned(n: number): string {
  return n >= 0 ? `+${n.toFixed(2)}` : n.toFixed(2);
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

// Send the user to the ticket-import page (screenshot/OCR or email forward) so
// they can add another bet to track on the live board.
function UploadTicketButton() {
  return (
    <Link
      href="/dashboard/upload"
      className="block text-center num font-semibold uppercase w-full"
      style={{
        padding: "10px 14px",
        borderRadius: 10,
        fontSize: 11,
        letterSpacing: 0.8,
        color: "#8ee68e",
        background: "rgba(142,230,142,0.1)",
        border: "1px solid rgba(142,230,142,0.28)",
      }}
    >
      + Upload a ticket
    </Link>
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

// Starred golfers — a watchlist independent of the bet book. Pulls each
// player from the ESPN leaderboard so the user sees position / score /
// thru even when they don't have a ticket on them. Renders nothing
// before any player is starred so first-time visitors aren't confused
// by an empty card.
function StarredGolfersSection({
  snapshot,
}: {
  snapshot: LeaderboardSnapshot | null;
}) {
  const { stars } = useStarredGolfers();
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());

  const courseName = resolveCourseName(
    snapshot?.event?.course ?? null,
    snapshot?.event?.name ?? null,
  );
  const holePars = snapshot?.event?.holePars;

  const matched = useMemo(() => {
    if (!snapshot || stars.size === 0) return [];
    const out: {
      key: string;
      player: LeaderboardPlayer | null;
      display: string;
      scorecard: HoleCell[] | null;
    }[] = [];
    const byKey = new Map<string, LeaderboardPlayer>();
    for (const p of snapshot.players) byKey.set(normalizePlayerKey(p.name), p);
    for (const key of stars) {
      const player = byKey.get(key) ?? null;
      out.push({
        key,
        player,
        display: key
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
        scorecard: buildScorecard(player?.todayLine ?? null, courseName, holePars),
      });
    }
    return out.sort((a, b) => (a.player?.posNum ?? 999) - (b.player?.posNum ?? 999));
  }, [snapshot, stars, courseName, holePars]);

  // Leaderboard players matching the search box, excluding already-starred.
  const results = useMemo(() => {
    if (!snapshot) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return snapshot.players
      .filter(
        (p) =>
          p.name.toLowerCase().includes(needle) &&
          !stars.has(normalizePlayerKey(p.name)),
      )
      .slice(0, 12);
  }, [snapshot, q, stars]);

  const hasPlayers = (snapshot?.players?.length ?? 0) > 0;
  if (stars.size === 0 && !hasPlayers) return null;

  function toggleOpen(key: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.2, color: "#f5c558" }}
        >
          ★ Starred golfers
        </span>
        <button
          onClick={() => setAdding((v) => !v)}
          className="num font-semibold uppercase transition"
          style={{
            fontSize: 9.5,
            letterSpacing: 0.8,
            color: adding ? "#1a1408" : "#f5c558",
            background: adding ? "#f5c558" : "transparent",
            border: "1px solid #f5c55855",
            borderRadius: 5,
            padding: "3px 9px",
          }}
        >
          {adding ? "Done" : "+ Add golfers"}
        </button>
      </div>

      {adding && (
        <div className="mb-2.5 rounded-[12px] border border-line bg-surface-1 p-2.5">
          <input
            autoFocus
            placeholder={hasPlayers ? "Search the field…" : "Leaderboard not loaded yet"}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            disabled={!hasPlayers}
            className="w-full rounded-[8px] border border-line bg-surface-2 px-3 py-2 text-text"
            style={{ fontSize: 13 }}
          />
          {q.trim() && (
            <ul className="mt-2 space-y-1">
              {results.length === 0 && (
                <li className="num text-text-muted px-1 py-1" style={{ fontSize: 12 }}>
                  No matches in the field.
                </li>
              )}
              {results.map((p) => (
                <li
                  key={p.id || p.name}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-[8px] hover:bg-surface-2"
                >
                  <StarButton player={p.name} size={14} className="-ml-1" />
                  <span
                    className="num font-semibold text-text-dim"
                    style={{ fontSize: 11, minWidth: 26 }}
                  >
                    {p.posDisplay || "—"}
                  </span>
                  <span className="flex-1 truncate" style={{ fontSize: 13, color: "#f0ebe0" }}>
                    {p.name}
                  </span>
                  <span
                    className="num"
                    style={{ fontSize: 12, fontWeight: 600, color: scoreColor(p.totalToPar) }}
                  >
                    {p.totalToPar ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {stars.size > 0 && (
        <ul className="space-y-1.5">
          {matched.map(({ key, player, display, scorecard }) => {
            const isOpen = open.has(key);
            const canExpand = !!scorecard && scorecard.length > 0;
            return (
              <li
                key={key}
                className="rounded-[10px] border border-line bg-surface-1 overflow-hidden"
              >
                <div
                  className="flex items-center gap-2.5 px-3 py-2"
                  onClick={() => canExpand && toggleOpen(key)}
                  style={{ cursor: canExpand ? "pointer" : "default" }}
                >
                  <span onClick={(e) => e.stopPropagation()}>
                    <StarButton player={display} size={14} className="-ml-1" />
                  </span>
                  <span
                    className="num font-semibold text-text-dim"
                    style={{ fontSize: 11, minWidth: 26 }}
                  >
                    {player?.posDisplay ?? "—"}
                  </span>
                  {player?.id ? (
                    <Link
                      href={`/players/${slugifyName(player.name)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 truncate"
                      style={{ fontSize: 13.5, color: "#f0ebe0", fontWeight: 600 }}
                    >
                      {player.name}
                    </Link>
                  ) : (
                    <span className="flex-1 truncate" style={{ fontSize: 13.5, color: "#a8b3ac" }}>
                      {display}
                    </span>
                  )}
                  <span
                    className="num"
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: scoreColor(player?.totalToPar ?? null),
                      minWidth: 36,
                      textAlign: "right",
                    }}
                  >
                    {player?.totalToPar ?? (player ? "—" : "Not in field")}
                  </span>
                  <span
                    className="num text-text-muted"
                    style={{ fontSize: 11, minWidth: 30, textAlign: "right" }}
                  >
                    {thruLabel(player)}
                  </span>
                  <span
                    className="num"
                    style={{
                      fontSize: 10,
                      color: canExpand ? "#7e8a83" : "transparent",
                      width: 10,
                      textAlign: "center",
                    }}
                  >
                    {isOpen ? "▲" : "▼"}
                  </span>
                </div>
                {isOpen && canExpand && (
                  <div className="px-3 pb-2.5">
                    <HoleStrip cells={scorecard!} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-text-muted mt-2" style={{ fontSize: 11, lineHeight: 1.4 }}>
        {stars.size > 0
          ? "Tap a golfer to see their hole-by-hole. Tap the star anywhere to remove."
          : "Search to add golfers and track their hole-by-hole here — no bet required."}
      </p>
    </section>
  );
}

function scoreColor(toPar: string | null): string {
  if (!toPar) return "#a8b3ac";
  if (toPar === "E") return "#f0ebe0";
  if (toPar.startsWith("-")) return "#7fd49a";
  if (toPar.startsWith("+")) return "#e57373";
  return "#f0ebe0";
}

function thruLabel(p: LeaderboardPlayer | null): string {
  if (!p) return "";
  const thru = p.todayLine?.thru;
  if (thru === 18) return "F";
  if (typeof thru === "number") return String(thru);
  if (p.teeTime) {
    try {
      return new Date(p.teeTime).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  }
  return "—";
}

function slugifyName(name: string): string {
  const last = name.split(" ").pop() ?? name;
  return last
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/g, "");
}
