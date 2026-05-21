"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchLeaderboard,
  type LeaderboardSnapshot,
  type LeaderboardPlayer,
  type RoundLine,
} from "@/lib/espn-leaderboard";
import { holeParFor } from "@/lib/data/course-pars";
import { gradeBet, type Decision, type OpenBet } from "@/lib/grading";
import { useStarredGolfers, normalizePlayerKey } from "@/lib/starred-golfers";
import { StarButton } from "@/components/edge/StarButton";
import {
  FEATURED_PARLAYS,
  featuredParlayToParsedBets,
} from "@/lib/data/featured-parlay";
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
function normName(name: string): string {
  const flipped = name.includes(",")
    ? name.split(",").map((s) => s.trim()).reverse().join(" ")
    : name;
  return flipped
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .replace(/æ/g, "ae")
    .replace(/ß/g, "ss")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

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

function apiBetToOpenBet(b: ApiBet): OpenBet {
  // The bets table has no opponent/group columns, so matchups encode the
  // other players in the market text as "... vs A / B". Reconstruct the
  // round, opponents, and over/under side here so the grader can settle
  // 2-ball / 3-ball / round props that were entered manually.
  const m = b.market.toLowerCase();
  const rm = m.match(/\br\s*(\d)\b/) ?? m.match(/round\s*(\d)/);
  const round = rm ? Number(rm[1]) : undefined;

  const vsPart = b.market.split(/\bvs\b/i)[1]?.trim();
  let others: string[] | undefined;
  let opponent: string | undefined;
  if (/3[\s-]?ball/.test(m) && vsPart) {
    others = vsPart.split("/").map((s) => s.trim()).filter(Boolean);
  } else if (vsPart) {
    opponent = vsPart.split("/")[0]?.trim();
  }

  // Underdog "leaderboard position better N.5" = a top-floor(N) finish.
  // Rewrite to a "Top N" market so it routes to the top-N grader (lower
  // position number is better, so "better than 10.5" → top 10).
  let market = b.market;
  if (/(leaderboard|finish\w*)\s*position/.test(m) && !/\btop\b/.test(m)) {
    const stripped = m.replace(/\br\s*\d\b/g, " ").replace(/round\s*\d/g, " ");
    const numMatch = stripped.match(/(\d{1,3}(?:\.\d)?)/);
    const n =
      b.line != null
        ? Math.floor(Number(b.line))
        : numMatch
          ? Math.floor(parseFloat(numMatch[1]))
          : null;
    if (n) market = `${round ? `R${round} ` : ""}Top ${n}`;
  }

  // Over/under props lose their side in the numeric `line` column, so
  // rebuild an "O x" / "U x" line from the keyword in the market text.
  const isOu = /\b(over|under|higher|lower)\b/.test(m) && b.line !== null;
  const line = isOu
    ? `${/\b(under|lower)\b/.test(m) ? "U" : "O"} ${b.line}`
    : b.line !== null
      ? String(b.line)
      : String(b.american_odds);

  return {
    id: b.id,
    player: b.player,
    market,
    line,
    stake: Number(b.stake),
    payout: Number(b.to_win),
    round,
    others,
    opponent,
  };
}

type ShotCounts = {
  fh: string | null;  // fairways hit / driving holes played, e.g. "4/5"
  gir: string | null; // greens in regulation / holes played
  scr: string | null; // up-and-downs / greens missed
};

type GradedLeg = {
  bet: ApiBet;
  decision: Decision | null;
  dg: DGStat | null;
  teeTime?: string | null;
  shots?: ShotCounts | null;
};

// Turn DataGolf's fractional rates (0..1) into "hit / attempts" counts
// against the holes this player has actually played in the current
// round. GIR uses holes played; fairways use driving holes (par 4/5);
// scrambling uses greens missed. Returns null when the player hasn't
// teed off yet or the rate is missing.
function asFraction(v: number | null | undefined): number | null {
  if (v == null) return null;
  return v > 1.5 ? v / 100 : v; // tolerate either 0..1 or 0..100 inputs
}

function deriveShotCounts(
  dg: DGStat | null,
  round: RoundLine | null | undefined,
  courseName: string | null | undefined,
): ShotCounts | null {
  if (!dg || !round) return null;
  const playedHoles = round.holes.filter(
    (h) => h.strokes !== null && h.strokes > 0,
  );
  const played = playedHoles.length || round.thru || 0;
  if (!played) return null;

  const drivingPlayed =
    playedHoles.length > 0
      ? playedHoles.filter(
          (h) => (h.par ?? holeParFor(courseName, h.hole)) >= 4,
        ).length
      : 0;

  const girFrac = asFraction(dg.gir);
  const accFrac = asFraction(dg.accuracy);
  const scrFrac = asFraction(dg.scrambling);

  const girCount = girFrac != null ? Math.round(girFrac * played) : null;
  const greensMissed = girCount != null ? played - girCount : null;

  const fh =
    accFrac != null && drivingPlayed > 0
      ? `${Math.round(accFrac * drivingPlayed)}/${drivingPlayed}`
      : null;
  const gir = girCount != null ? `${girCount}/${played}` : null;
  const scr =
    scrFrac != null && greensMissed != null && greensMissed > 0
      ? `${Math.round(scrFrac * greensMissed)}/${greensMissed}`
      : null;

  return { fh, gir, scr };
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

  const courseName = snapshot?.event?.course ?? null;

  const graded: GradedLeg[] = (bets ?? []).map((b) => {
    const dg = statByName.get(normName(b.player)) ?? null;
    const lp = playerByName.get(normName(b.player)) ?? null;
    return {
      bet: b,
      decision: snapshot ? gradeBet(apiBetToOpenBet(b), snapshot) : null,
      dg,
      teeTime: lp?.teeTime ?? null,
      shots: deriveShotCounts(dg, lp?.todayLine, courseName),
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

      <LoadFeaturedButton />

      <StarredGolfersSection snapshot={snapshot} />

      {!signedIn && <SignInPrompt />}

      {signedIn && loading && bets === null && <SkeletonRows />}

      {signedIn && bets !== null && bets.length === 0 && <EmptyState />}

      {signedIn && groups.length > 0 && (
        <div className="space-y-4">
          {groups.map((group) => (
            <ParlayGroup
              key={group.key}
              legs={group.legs}
              eventName={snapshot?.event?.shortName ?? snapshot?.event?.name ?? null}
              onRemoveAll={() => dismissBatch(group.legs.map((g) => g.bet.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ParlayGroup({
  legs,
  eventName,
  onRemoveAll,
}: {
  legs: GradedLeg[];
  eventName?: string | null;
  onRemoveAll: () => void;
}) {
  const first = legs[0].bet;
  const multi = legs.length > 1;
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
  const payout10 = hasRealPayout ? storedPayout : 10 * combined;
  const stakeShown = hasRealPayout ? storedStake : 10;

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
    }));
    void shareParlayImage({
      eventName,
      legCount: legs.length,
      book: first.book,
      combinedX: combined,
      stake: stakeShown,
      payout: payout10,
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
                ${stakeShown.toLocaleString()} → ${payout10.toLocaleString(undefined, { maximumFractionDigits: 2 })}
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
      <ul className="space-y-2.5">
        {legs.map((g) => (
          <LiveBetCard
            key={g.bet.id}
            bet={g.bet}
            decision={g.decision}
            dg={g.dg}
            shots={g.shots ?? null}
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

function LiveBetCard({
  bet,
  decision,
  dg,
  shots,
  eventName,
  onRemove,
  hideMoney,
}: {
  bet: ApiBet;
  decision: Decision | null;
  dg: DGStat | null;
  shots?: ShotCounts | null;
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
                  style={{ fontSize: 10, color: "#6c7a72", letterSpacing: 0.3, marginTop: 2 }}
                >
                  {decision.standingNote}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>{bet.player}</h3>
        {!hideMoney && (
          <span className="num" style={{ fontSize: 12, color: "#a8b3ac" }}>
            {Number(bet.stake).toFixed(2)}u → {Number(bet.to_win).toFixed(2)}u
          </span>
        )}
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
        </p>
      )}
      {dg && <DGStatStrip dg={dg} shots={shots} />}
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

// Deterministic "load the curated parlays into my account" action. Each
// featured parlay is saved in its own request so its legs share a
// placed_at and render as one grouped card with the real multiplier and
// $10 → $X payout baked in (no OCR, no per-leg estimate).
function LoadFeaturedButton() {
  const [loading, setLoading] = useState(false);
  async function load() {
    setLoading(true);
    try {
      for (const p of FEATURED_PARLAYS) {
        await fetch("/api/bets/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bets: featuredParlayToParsedBets(p),
            source: "manual",
          }),
        }).catch(() => null);
      }
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }
  return (
    <button
      onClick={load}
      disabled={loading}
      className="num font-semibold uppercase w-full"
      style={{
        padding: "10px 14px",
        borderRadius: 10,
        fontSize: 11,
        letterSpacing: 0.8,
        color: "#8ee68e",
        background: "rgba(142,230,142,0.1)",
        border: "1px solid rgba(142,230,142,0.28)",
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? "Loading…" : "+ Load this week's featured parlays"}
    </button>
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
  const { stars, toggle } = useStarredGolfers();

  const matched = useMemo(() => {
    if (!snapshot || stars.size === 0) return [];
    const out: { key: string; player: LeaderboardPlayer | null; display: string }[] = [];
    // Index leaderboard once.
    const byKey = new Map<string, LeaderboardPlayer>();
    for (const p of snapshot.players) {
      byKey.set(normalizePlayerKey(p.name), p);
    }
    for (const key of stars) {
      out.push({
        key,
        player: byKey.get(key) ?? null,
        // Title-case the key for display when we can't find the
        // leaderboard row (player is WD / not in field).
        display: key
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
      });
    }
    // Sort: in-field players first, ordered by leaderboard position;
    // missing players (likely not in the field this week) at the bottom.
    return out.sort((a, b) => {
      const aPos = a.player?.posNum ?? 999;
      const bPos = b.player?.posNum ?? 999;
      return aPos - bPos;
    });
  }, [snapshot, stars]);

  if (stars.size === 0) return null;

  return (
    <section>
      <div className="flex items-baseline justify-between mb-2">
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.2, color: "#f5c558" }}
        >
          ★ Starred golfers
        </span>
        <span
          className="num text-text-muted"
          style={{ fontSize: 10.5, letterSpacing: 0.4 }}
        >
          {stars.size} {stars.size === 1 ? "player" : "players"}
        </span>
      </div>
      <ul className="space-y-1.5">
        {matched.map(({ key, player, display }) => (
          <li
            key={key}
            className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] border border-line bg-surface-1"
          >
            <StarButton player={display} size={14} className="-ml-1" />
            <span
              className="num font-semibold text-text-dim"
              style={{ fontSize: 11, minWidth: 26 }}
            >
              {player?.posDisplay ?? "—"}
            </span>
            {player?.id ? (
              <Link
                href={`/players/${slugifyName(player.name)}`}
                className="flex-1 truncate"
                style={{
                  fontSize: 13.5,
                  color: "#f0ebe0",
                  fontWeight: 600,
                }}
              >
                {player.name}
              </Link>
            ) : (
              <span
                className="flex-1 truncate"
                style={{ fontSize: 13.5, color: "#a8b3ac" }}
              >
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
          </li>
        ))}
      </ul>
      <p
        className="text-text-muted mt-2"
        style={{ fontSize: 11, lineHeight: 1.4 }}
      >
        Tap the star on any leaderboard or player to add or remove them.
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
