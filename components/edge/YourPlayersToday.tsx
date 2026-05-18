"use client";

import type { SlipLeg } from "@/lib/bet-slip";
import type { LeaderboardSnapshot, LeaderboardPlayer } from "@/lib/espn-leaderboard";

// "Your players today" — horizontal scrollable strip that shows the
// live leaderboard position of every player the user has action on,
// pulled directly from their slip. Lives above the parlay container so
// people can scan "where is everyone" without scrolling through every
// leg.
//
// Includes opponents from matchup legs and the other two from 3-ball
// legs because users care about those positions too ("how's Cantlay
// doing? I'm betting against him").

type Entry = {
  name: string;
  shortName: string;
  posDisplay: string;
  totalToPar: string | null;
  thru: number | string | null;
  posNum: number | null;
  isCut: boolean;
  // Role explains why the player appears in the strip. "pick" = the
  // user is on them; "vs" = they're an opponent in a matchup or other
  // in a 3-ball.
  role: "pick" | "vs";
};

export function YourPlayersToday({
  legs,
  snapshot,
}: {
  legs: SlipLeg[];
  snapshot: LeaderboardSnapshot | null;
}) {
  if (!snapshot || legs.length === 0) return null;

  const entries = collectEntries(legs, snapshot);
  if (entries.length === 0) return null;

  return (
    <div
      className="rounded-[14px] border border-line overflow-hidden"
      style={{ background: "rgba(0,0,0,0.18)" }}
    >
      <div className="flex items-baseline justify-between px-4 pt-3 pb-2">
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.2, color: "#a8b3ac" }}
        >
          ● Your players today
        </span>
        <span
          className="num text-text-muted"
          style={{ fontSize: 10, letterSpacing: 0.5 }}
        >
          {entries.length} tracked
        </span>
      </div>
      <div
        className="flex gap-2 px-4 pb-3 overflow-x-auto"
        style={{ scrollbarWidth: "thin" }}
      >
        {entries.map((e) => (
          <PlayerChip key={`${e.name}-${e.role}`} entry={e} />
        ))}
      </div>
    </div>
  );
}

function PlayerChip({ entry }: { entry: Entry }) {
  const toParColor = parTextColor(entry.totalToPar);
  const dimmed = entry.role === "vs";
  return (
    <div
      className="shrink-0 rounded-[10px] border px-3 py-2 flex flex-col gap-0.5"
      style={{
        minWidth: 132,
        borderColor: dimmed
          ? "rgba(255,255,255,0.08)"
          : "rgba(127,212,154,0.25)",
        background: dimmed
          ? "rgba(255,255,255,0.02)"
          : "rgba(127,212,154,0.06)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="num font-semibold"
          style={{
            fontSize: 11,
            letterSpacing: 0.4,
            color: positionColor(entry),
          }}
        >
          {entry.isCut ? "CUT" : entry.posDisplay || "—"}
        </span>
        {entry.role === "vs" && (
          <span
            className="num uppercase"
            style={{
              fontSize: 8.5,
              letterSpacing: 0.6,
              color: "#7c8a82",
              padding: "1.5px 5px",
              borderRadius: 3,
              background: "rgba(255,255,255,0.04)",
            }}
          >
            vs
          </span>
        )}
      </div>
      <div
        className={`truncate ${dimmed ? "text-text-dim" : "text-text font-medium"}`}
        style={{ fontSize: 13 }}
        title={entry.name}
      >
        {entry.shortName || entry.name}
      </div>
      <div className="flex items-baseline gap-2 mt-0.5">
        <span
          className="num font-semibold"
          style={{ fontSize: 13, color: toParColor }}
        >
          {entry.totalToPar ?? "—"}
        </span>
        <span
          className="num text-text-muted"
          style={{ fontSize: 10, letterSpacing: 0.4 }}
        >
          thru {entry.thru ?? "—"}
        </span>
      </div>
    </div>
  );
}

// Pull a deduped list of (player, role) pairs from the slip. Picks
// come first (your action), opponents/others trail behind. Players who
// don't resolve in the snapshot are dropped silently.
function collectEntries(
  legs: SlipLeg[],
  snapshot: LeaderboardSnapshot,
): Entry[] {
  // Map name → role. "pick" wins over "vs" — if you're on them and
  // they're someone else's opponent in another leg, they're still your
  // pick.
  const roles = new Map<string, "pick" | "vs">();
  const addRole = (name: string, role: "pick" | "vs") => {
    const key = name.trim();
    if (!key) return;
    const prev = roles.get(key);
    if (prev === "pick") return;
    roles.set(key, role);
  };

  for (const leg of legs) {
    addRole(leg.player, "pick");
    if (leg.kind === "matchup") addRole(leg.opponent, "vs");
    if (leg.kind === "three_ball") {
      for (const other of leg.others) addRole(other, "vs");
    }
  }

  const entries: Entry[] = [];
  for (const [name, role] of roles) {
    const p = findPlayer(snapshot, name);
    if (!p) continue;
    entries.push({
      name: p.name,
      shortName: p.shortName,
      posDisplay: p.posDisplay,
      totalToPar: p.totalToPar,
      thru: deriveThru(p),
      posNum: p.posNum,
      isCut: p.isCut,
      role,
    });
  }

  // Sort: picks first, then by position (T1 → field). Cut players
  // sort last within each group.
  entries.sort((a, b) => {
    if (a.role !== b.role) return a.role === "pick" ? -1 : 1;
    if (a.isCut !== b.isCut) return a.isCut ? 1 : -1;
    const an = a.posNum ?? 9999;
    const bn = b.posNum ?? 9999;
    return an - bn;
  });
  return entries;
}

function deriveThru(p: LeaderboardPlayer): number | string | null {
  const rl = p.todayLine;
  if (!rl) return null;
  if (rl.complete) return "F";
  return rl.thru ?? null;
}

function findPlayer(
  snapshot: LeaderboardSnapshot,
  name: string,
): LeaderboardPlayer | null {
  const target = normalize(name);
  return (
    snapshot.players.find((x) => normalize(x.name) === target) ??
    snapshot.players.find((x) => normalize(x.name).includes(target)) ??
    null
  );
}

function normalize(s: string): string {
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

function parTextColor(s: string | null): string {
  if (s === null) return "#a8b3ac";
  if (s === "E") return "#f0ebe0";
  const n = Number(s.replace("+", ""));
  if (Number.isNaN(n)) return "#a8b3ac";
  if (n < 0) return "#7fd49a";
  if (n > 0) return "#e87c7c";
  return "#f0ebe0";
}

function positionColor(e: Entry): string {
  if (e.isCut) return "#e87c7c";
  if (e.posNum === null) return "#a8b3ac";
  if (e.posNum <= 5) return "#7fd49a";
  if (e.posNum <= 20) return "#f0ebe0";
  return "#a8b3ac";
}
