"use client";

import type { SlipLeg } from "@/lib/bet-slip";
import {
  type LeaderboardSnapshot,
  type LeaderboardPlayer,
  type RoundLine,
} from "@/lib/espn-leaderboard";
import { holeParFor } from "@/lib/data/course-pars";

// Shared live detail rows for matchup + 3-ball legs. Used on the Live
// parlay page and on the Upload preview so the same hole-trail + match
// state UI lights up wherever a user sees their bet. Layout collapses
// to a stacked vertical form below md so phone screens don't overflow.

export function MatchupDetail({
  leg,
  snapshot,
}: {
  leg: Extract<SlipLeg, { kind: "matchup" }>;
  snapshot: LeaderboardSnapshot | null;
}) {
  const round = leg.round;
  if (!snapshot || !round) return null;

  const mine = findPlayer(snapshot, leg.player);
  const opp = findPlayer(snapshot, leg.opponent);
  if (!mine || !opp) return null;

  const mineRound = mine.rounds.find((r) => r.period === round);
  const oppRound = opp.rounds.find((r) => r.period === round);
  const mineToPar = parseToParStr(mineRound?.toPar ?? null);
  const oppToPar = parseToParStr(oppRound?.toPar ?? null);

  // Match state — negative diff = leg-player is ahead (lower score). Render
  // as "X UP" / "AS" / "X DN" because that's how golfers describe it even
  // when the underlying scoring is stroke-play.
  const diff =
    mineToPar !== null && oppToPar !== null ? mineToPar - oppToPar : null;
  const matchLabel =
    diff === null
      ? "—"
      : diff === 0
        ? "AS"
        : diff < 0
          ? `${Math.abs(diff)} UP`
          : `${diff} DN`;
  const matchColor =
    diff === null
      ? "#a8b3ac"
      : diff === 0
        ? "#a8b3ac"
        : diff < 0
          ? "#7fd49a"
          : "#e87c7c";

  return (
    <div
      className="px-4 pb-3 pt-1"
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.18)",
      }}
    >
      <div className="flex items-center justify-between mb-2.5 gap-3">
        <div
          className="num uppercase"
          style={{ fontSize: 10, letterSpacing: 1, color: "#a8b3ac" }}
        >
          ● Match state · R{round}
        </div>
        <span
          className="num font-semibold"
          style={{
            fontSize: 16,
            letterSpacing: 0.5,
            color: matchColor,
            background: `${matchColor}1a`,
            padding: "3px 12px",
            borderRadius: 4,
            border: `1px solid ${matchColor}33`,
          }}
        >
          {matchLabel}
        </span>
      </div>
      <PlayerLine
        name={mine.name}
        toPar={mineRound?.toPar ?? null}
        thru={mineRound?.complete ? "F" : mineRound?.thru ?? "—"}
        leading={diff !== null && diff < 0}
        trail={trailForPlayerRound(leg.player, round, snapshot)}
      />
      <PlayerLine
        name={opp.name}
        toPar={oppRound?.toPar ?? null}
        thru={oppRound?.complete ? "F" : oppRound?.thru ?? "—"}
        leading={diff !== null && diff > 0}
        trail={trailForPlayerRound(leg.opponent, round, snapshot)}
      />
    </div>
  );
}

export function ThreeBallDetail({
  leg,
  snapshot,
}: {
  leg: Extract<SlipLeg, { kind: "three_ball" }>;
  snapshot: LeaderboardSnapshot | null;
}) {
  if (!snapshot) return null;
  const round = leg.round;
  const mine = findPlayer(snapshot, leg.player);
  const a = findPlayer(snapshot, leg.others[0]);
  const b = findPlayer(snapshot, leg.others[1]);
  if (!mine || !a || !b) return null;

  type Entry = {
    name: string;
    isMine: boolean;
    round: RoundLine | undefined;
    toParNum: number | null;
  };
  const entries: Entry[] = [mine, a, b].map((p, i) => {
    const rl = p.rounds.find((r) => r.period === round);
    return {
      name: p.name,
      isMine: i === 0,
      round: rl,
      toParNum: parseToParStr(rl?.toPar ?? null),
    };
  });

  // Lower to-par wins. Unstarted players sort last (999 sentinel).
  const ranked = [...entries].sort((x, y) => {
    const xn = x.toParNum ?? 999;
    const yn = y.toParNum ?? 999;
    return xn - yn;
  });

  return (
    <div
      className="px-4 pb-3 pt-1"
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.18)",
      }}
    >
      <div className="flex items-center justify-between mb-2.5 gap-3">
        <div
          className="num uppercase"
          style={{ fontSize: 10, letterSpacing: 1, color: "#a8b3ac" }}
        >
          ● 3-Ball · R{round}
        </div>
      </div>
      {ranked.map((e, i) => (
        <ThreeBallPlayerLine
          key={e.name}
          position={i + 1}
          name={e.name}
          isMine={e.isMine}
          toPar={e.round?.toPar ?? null}
          thru={e.round?.complete ? "F" : e.round?.thru ?? "—"}
          trail={trailForPlayerRound(e.name, round, snapshot)}
        />
      ))}
    </div>
  );
}

// ─── Internal: player line components ──────────────────────────
//
// Desktop layout: name | to-par | thru | trail in a single horizontal row
// using flex with fixed pixel widths for the numeric columns.
//
// Mobile: header row (leading dot + name + to-par + thru) then trail
// below on its own line. Trail naturally wraps because each chip is
// 14px wide and gap is 3px.

function PlayerLine({
  name,
  toPar,
  thru,
  leading,
  trail,
}: {
  name: string;
  toPar: string | null;
  thru: number | string | null;
  leading: boolean;
  trail: HoleResult[] | null;
}) {
  return (
    <div className="py-1.5">
      {/* Mobile: header row */}
      <div className="md:hidden flex items-center gap-2">
        {leading && <span style={{ color: "#7fd49a", fontSize: 10 }}>●</span>}
        <span
          className="text-text font-medium truncate flex-1 min-w-0"
          style={{ fontSize: 13 }}
        >
          {name}
        </span>
        <span
          className="num shrink-0"
          style={{ fontSize: 13, color: toParColor(toPar) }}
        >
          {toPar ?? "—"}
        </span>
        <span
          className="num text-text-dim shrink-0"
          style={{ fontSize: 10.5 }}
        >
          thru {thru ?? "—"}
        </span>
      </div>
      {trail && (
        <div className="md:hidden mt-1">
          <HoleTrail trail={trail} />
        </div>
      )}
      {/* Desktop: single horizontal row */}
      <div className="hidden md:flex items-center gap-3">
        <div
          className="flex items-baseline gap-2 min-w-0"
          style={{ width: 220 }}
        >
          {leading && (
            <span style={{ color: "#7fd49a", fontSize: 11 }}>●</span>
          )}
          <span
            className="text-text font-medium truncate"
            style={{ fontSize: 13 }}
          >
            {name}
          </span>
        </div>
        <span
          className="num"
          style={{
            fontSize: 14,
            width: 40,
            color: toParColor(toPar),
          }}
        >
          {toPar ?? "—"}
        </span>
        <span
          className="num text-text-dim"
          style={{ fontSize: 11, width: 60 }}
        >
          thru {thru ?? "—"}
        </span>
        <div className="flex-1 min-w-0">
          {trail && <HoleTrail trail={trail} />}
        </div>
      </div>
    </div>
  );
}

function ThreeBallPlayerLine({
  position,
  name,
  isMine,
  toPar,
  thru,
  trail,
}: {
  position: number;
  name: string;
  isMine: boolean;
  toPar: string | null;
  thru: number | string | null;
  trail: HoleResult[] | null;
}) {
  const posLabel = position === 1 ? "1st" : position === 2 ? "2nd" : "3rd";
  const posColor = position === 1 ? "#7fd49a" : "#a8b3ac";
  return (
    <div className="py-1.5">
      {/* Mobile: stacked */}
      <div className="md:hidden flex items-center gap-2">
        <span
          className="num font-semibold shrink-0"
          style={{
            fontSize: 10.5,
            letterSpacing: 0.5,
            color: posColor,
            width: 24,
          }}
        >
          {posLabel}
        </span>
        {isMine && <span style={{ color: "#7fd49a", fontSize: 10 }}>●</span>}
        <span
          className={`truncate flex-1 min-w-0 ${
            isMine ? "text-text font-semibold" : "text-text-dim"
          }`}
          style={{ fontSize: 13 }}
        >
          {name}
        </span>
        <span
          className="num shrink-0"
          style={{ fontSize: 13, color: toParColor(toPar) }}
        >
          {toPar ?? "—"}
        </span>
        <span
          className="num text-text-dim shrink-0"
          style={{ fontSize: 10.5 }}
        >
          thru {thru ?? "—"}
        </span>
      </div>
      {trail && (
        <div className="md:hidden mt-1 pl-6">
          <HoleTrail trail={trail} />
        </div>
      )}
      {/* Desktop: single horizontal row */}
      <div className="hidden md:flex items-center gap-3">
        <span
          className="num font-semibold"
          style={{
            fontSize: 11,
            letterSpacing: 0.5,
            color: posColor,
            width: 28,
          }}
        >
          {posLabel}
        </span>
        <div
          className="flex items-baseline gap-2 min-w-0"
          style={{ width: 200 }}
        >
          {isMine && <span style={{ color: "#7fd49a", fontSize: 11 }}>●</span>}
          <span
            className={`truncate ${
              isMine ? "text-text font-semibold" : "text-text-dim"
            }`}
            style={{ fontSize: 13 }}
          >
            {name}
          </span>
        </div>
        <span
          className="num"
          style={{
            fontSize: 14,
            width: 40,
            color: toParColor(toPar),
          }}
        >
          {toPar ?? "—"}
        </span>
        <span
          className="num text-text-dim"
          style={{ fontSize: 11, width: 60 }}
        >
          thru {thru ?? "—"}
        </span>
        <div className="flex-1 min-w-0">
          {trail && <HoleTrail trail={trail} />}
        </div>
      </div>
    </div>
  );
}

// ─── Internal: hole-trail + helpers (shared) ───────────────────

export type HoleResult = {
  hole: number;
  played: boolean;
  diff: number | null;
};

export function HoleTrail({ trail }: { trail: HoleResult[] }) {
  return (
    <div className="flex items-center gap-[3px] flex-wrap">
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

export function trailForPlayerRound(
  playerName: string,
  round: number,
  snapshot: LeaderboardSnapshot | null,
): HoleResult[] | null {
  if (!snapshot) return null;
  const p = findPlayer(snapshot, playerName);
  if (!p) return null;
  const rl: RoundLine | undefined = p.rounds.find((r) => r.period === round);
  if (!rl || rl.holes.length === 0) return null;
  return rl.holes.map((h) => {
    const par = h.par ?? holeParFor(snapshot.event?.course ?? null, h.hole);
    const played = h.strokes !== null && h.strokes > 0;
    return {
      hole: h.hole,
      played,
      diff: played ? (h.strokes as number) - par : null,
    };
  });
}

export function parseToParStr(s: string | null): number | null {
  if (s === null) return null;
  if (s === "E") return 0;
  const n = Number(s.replace("+", ""));
  return Number.isNaN(n) ? null : n;
}

export function toParColor(s: string | null): string {
  const n = parseToParStr(s);
  if (n === null) return "#a8b3ac";
  if (n < 0) return "#7fd49a";
  if (n > 0) return "#e87c7c";
  return "#f0ebe0";
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

function findPlayer(
  snapshot: LeaderboardSnapshot,
  name: string,
): LeaderboardPlayer | null {
  const target = normalizePlayerName(name);
  return (
    snapshot.players.find((x) => normalizePlayerName(x.name) === target) ??
    snapshot.players.find((x) =>
      normalizePlayerName(x.name).includes(target),
    ) ??
    null
  );
}

function normalizePlayerName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .replace(/æ/g, "ae")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
