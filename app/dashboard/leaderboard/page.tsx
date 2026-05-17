"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  fetchLeaderboard,
  type LeaderboardPlayer,
  type LeaderboardSnapshot,
} from "@/lib/espn-leaderboard";
import { useBetSlip } from "@/lib/bet-slip-store";
import { legToOpenBet, describeLeg, type SlipLeg } from "@/lib/bet-slip";
import { gradeBet, type Decision } from "@/lib/grading";

const REFRESH_MS = 30_000;

type FilterMode = "all" | "mine" | "made_cut" | "top30";
type SortKey = "pos" | "today" | "thru" | "name";

export default function LeaderboardPage() {
  const [snapshot, setSnapshot] = useState<LeaderboardSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [auto, setAuto] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [sort, setSort] = useState<SortKey>("pos");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { slip } = useBetSlip();

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    try {
      const snap = await fetchLeaderboard(ctrl.signal);
      setSnapshot(snap);
    } catch (e: unknown) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message || "Fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (auto) timerRef.current = setInterval(load, REFRESH_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [auto, load]);

  // Flash a ▲/▼ caret on rows the user has bets on whenever ESPN
  // reports a new position. Scoped to bet-owned rows to keep the
  // leaderboard from flickering across all 150 entrants.
  const prevPos = useRef<Record<string, string>>({});
  const [flashes, setFlashes] = useState<Record<string, "up" | "down" | null>>({});
  useEffect(() => {
    if (!snapshot || !slip.legs.length) return;
    const watched = new Set<string>();
    for (const leg of slip.legs) {
      watched.add(leg.player.toLowerCase());
      if (leg.kind === "matchup") watched.add(leg.opponent.toLowerCase());
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const p of snapshot.players) {
      const key = p.name.toLowerCase();
      if (!watched.has(key)) continue;
      const cur = p.posDisplay || "";
      const prev = prevPos.current[key];
      if (prev !== undefined && cur && prev !== cur) {
        const a = parseInt(prev.replace(/^T/, ""), 10);
        const b = parseInt(cur.replace(/^T/, ""), 10);
        if (!Number.isNaN(a) && !Number.isNaN(b) && a !== b) {
          const dir: "up" | "down" = b < a ? "up" : "down";
          setFlashes((f) => ({ ...f, [key]: dir }));
          timers.push(
            setTimeout(
              () => setFlashes((f) => ({ ...f, [key]: null })),
              3500,
            ),
          );
        }
      }
      prevPos.current[key] = cur;
    }
    return () => timers.forEach(clearTimeout);
  }, [snapshot, slip.legs]);

  // Pre-compute bet decisions per player so we can decorate rows.
  const decisionsByPlayer = useMemo(() => {
    const map = new Map<string, { leg: SlipLeg; decision: Decision }[]>();
    if (!snapshot) return map;
    for (const leg of slip.legs) {
      const bet = legToOpenBet(leg);
      const decision = gradeBet(bet, snapshot);
      const key = leg.player.toLowerCase();
      const arr = map.get(key) ?? [];
      arr.push({ leg, decision });
      map.set(key, arr);
      // Decorate opponent rows in matchups too
      if (leg.kind === "matchup") {
        const okey = leg.opponent.toLowerCase();
        const arr2 = map.get(okey) ?? [];
        arr2.push({ leg, decision });
        map.set(okey, arr2);
      }
    }
    return map;
  }, [snapshot, slip.legs]);

  const filtered = useMemo(() => {
    if (!snapshot) return [];
    let rows = [...snapshot.players];
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (filter === "mine") {
      const mineNames = new Set(
        slip.legs.flatMap((l) =>
          l.kind === "matchup"
            ? [l.player.toLowerCase(), l.opponent.toLowerCase()]
            : [l.player.toLowerCase()],
        ),
      );
      rows = rows.filter((p) => mineNames.has(p.name.toLowerCase()));
    } else if (filter === "made_cut") {
      rows = rows.filter((p) => !p.isCut);
    } else if (filter === "top30") {
      rows = rows.filter((p) => p.posNum !== null && p.posNum <= 30);
    }
    rows.sort((a, b) => {
      switch (sort) {
        case "today": {
          const av = a.todayLine?.strokes ?? Number.POSITIVE_INFINITY;
          const bv = b.todayLine?.strokes ?? Number.POSITIVE_INFINITY;
          return av - bv;
        }
        case "thru": {
          const av = a.todayLine?.complete ? 18 : a.todayLine?.thru ?? -1;
          const bv = b.todayLine?.complete ? 18 : b.todayLine?.thru ?? -1;
          return bv - av;
        }
        case "name":
          return a.name.localeCompare(b.name);
        case "pos":
        default: {
          if (a.isCut && !b.isCut) return 1;
          if (b.isCut && !a.isCut) return -1;
          const av = a.posNum ?? 9999;
          const bv = b.posNum ?? 9999;
          return av - bv;
        }
      }
    });
    return rows;
  }, [snapshot, query, filter, sort, slip.legs]);

  return (
    <div className="px-5 lg:px-8 py-6 space-y-5 max-w-6xl mx-auto">
      <header>
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
        >
          ● Leaderboard
        </span>
        <h1
          className="serif-italic mt-1.5"
          style={{ fontSize: 36, letterSpacing: -0.4 }}
        >
          <em>The full board, live.</em>
        </h1>
        <p className="text-text-dim mt-2 max-w-2xl" style={{ fontSize: 14 }}>
          Every player in the active ESPN field. Build a slip at{" "}
          <Link href="/dashboard/slip" className="text-text underline">
            /dashboard/slip
          </Link>{" "}
          — top-N, matchups, over/unders, make-cut — and rows decorate
          live with win / loss / live status.
        </p>
      </header>

      <EventStrap
        snapshot={snapshot}
        error={error}
        loading={loading}
        auto={auto}
        onToggleAuto={() => setAuto((a) => !a)}
        onRefresh={load}
      />

      <Controls
        query={query}
        onQuery={setQuery}
        filter={filter}
        onFilter={setFilter}
        sort={sort}
        onSort={setSort}
        slipCount={slip.legs.length}
        totalRows={filtered.length}
        totalPlayers={snapshot?.players.length ?? 0}
      />

      <div className="rounded-[14px] border border-line overflow-hidden bg-surface-1">
        <div
          className="grid gap-2 px-4 py-2.5 text-xs uppercase tracking-wider text-text-dim border-b border-line"
          style={{ gridTemplateColumns: "44px 1.7fr 70px 80px 70px 1fr" }}
        >
          <div>Pos</div>
          <div>Player</div>
          <div className="text-right">Total</div>
          <div className="text-right">Today</div>
          <div className="text-right">Thru</div>
          <div>Bets</div>
        </div>
        <div className="max-h-[640px] overflow-y-auto">
          {filtered.map((p) => (
            <Row
              key={p.id}
              player={p}
              decisions={decisionsByPlayer.get(p.name.toLowerCase()) ?? []}
              flash={flashes[p.name.toLowerCase()] ?? null}
            />
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-text-dim text-center" style={{ fontSize: 13 }}>
              No matches.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Controls({
  query,
  onQuery,
  filter,
  onFilter,
  sort,
  onSort,
  slipCount,
  totalRows,
  totalPlayers,
}: {
  query: string;
  onQuery: (v: string) => void;
  filter: FilterMode;
  onFilter: (v: FilterMode) => void;
  sort: SortKey;
  onSort: (v: SortKey) => void;
  slipCount: number;
  totalRows: number;
  totalPlayers: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="search"
        placeholder="Search player…"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        className="flex-1 min-w-[200px] rounded-[10px] border border-line bg-surface-1 px-3 py-1.5 text-text"
        style={{ fontSize: 13 }}
      />
      <div className="flex rounded-[10px] border border-line overflow-hidden">
        {(["all", "mine", "made_cut", "top30"] as FilterMode[]).map((f) => (
          <button
            key={f}
            onClick={() => onFilter(f)}
            className={`px-3 py-1.5 ${
              filter === f
                ? "bg-surface-2 text-text"
                : "bg-surface-1 text-text-dim hover:text-text"
            }`}
            style={{ fontSize: 12 }}
          >
            {f === "all"
              ? "All"
              : f === "mine"
                ? `Mine${slipCount ? ` (${slipCount})` : ""}`
                : f === "made_cut"
                  ? "Made cut"
                  : "Top 30"}
          </button>
        ))}
      </div>
      <select
        value={sort}
        onChange={(e) => onSort(e.target.value as SortKey)}
        className="rounded-[10px] border border-line bg-surface-1 px-3 py-1.5 text-text"
        style={{ fontSize: 13 }}
      >
        <option value="pos">Sort: Position</option>
        <option value="today">Sort: Today's score</option>
        <option value="thru">Sort: Thru</option>
        <option value="name">Sort: Name</option>
      </select>
      <span className="text-text-dim" style={{ fontSize: 11 }}>
        {totalRows} / {totalPlayers}
      </span>
    </div>
  );
}

function EventStrap({
  snapshot,
  error,
  loading,
  auto,
  onToggleAuto,
  onRefresh,
}: {
  snapshot: LeaderboardSnapshot | null;
  error: string | null;
  loading: boolean;
  auto: boolean;
  onToggleAuto: () => void;
  onRefresh: () => void;
}) {
  const event = snapshot?.event;
  return (
    <div className="rounded-[14px] border border-line p-4 bg-surface-1 flex flex-wrap items-baseline gap-x-6 gap-y-2">
      <div className="flex-1 min-w-0">
        <div
          className="num uppercase text-text-dim"
          style={{ fontSize: 10, letterSpacing: 1.4 }}
        >
          ● {event ? `Round ${event.period} · ${event.statusDetail || event.state}` : "Loading…"}
        </div>
        <div
          className="serif-italic mt-0.5"
          style={{ fontSize: 20, letterSpacing: -0.3 }}
        >
          <em>{event?.name ?? "—"}</em>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-text-dim" style={{ fontSize: 11 }}>
          {snapshot
            ? `Updated ${new Date(snapshot.fetchedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
            : "—"}
        </span>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="rounded-[8px] border border-line px-2.5 py-1 hover:bg-surface-2 disabled:opacity-50"
          style={{ fontSize: 11 }}
        >
          {loading ? "…" : "Refresh"}
        </button>
        <label className="flex items-center gap-1 text-text-dim" style={{ fontSize: 11 }}>
          <input type="checkbox" checked={auto} onChange={onToggleAuto} />
          Auto
        </label>
      </div>
      {error && (
        <div
          className="w-full rounded-[8px] px-3 py-1.5"
          style={{ background: "rgba(232,124,124,0.1)", color: "#e87c7c", fontSize: 12 }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

function Row({
  player,
  decisions,
  flash,
}: {
  player: LeaderboardPlayer;
  decisions: { leg: SlipLeg; decision: Decision }[];
  flash: "up" | "down" | null;
}) {
  const today = player.todayLine;
  return (
    <div
      className={`grid gap-2 px-4 py-2 border-b border-line/50 last:border-b-0 hover:bg-surface-2 ${
        decisions.length ? "bg-surface-1/70" : ""
      }`}
      style={{ gridTemplateColumns: "44px 1.7fr 70px 80px 70px 1fr" }}
    >
      <div
        className="num self-center flex items-baseline gap-1"
        style={{ fontSize: 13, color: player.isCut ? "#a8b3ac" : undefined }}
      >
        <span>{player.posDisplay || "—"}</span>
        {flash && (
          <span
            aria-hidden
            style={{
              fontSize: 9,
              lineHeight: 1,
              color: flash === "up" ? "#7fd49a" : "#e87c7c",
              animation: "greensidePulse 1.4s ease-in-out infinite",
            }}
            title={flash === "up" ? "Moved up" : "Moved down"}
          >
            {flash === "up" ? "▲" : "▼"}
          </span>
        )}
      </div>
      <div className="self-center min-w-0">
        <div className="font-medium truncate" style={{ fontSize: 13 }}>
          {player.name}
        </div>
      </div>
      <div
        className="text-right num self-center"
        style={{ fontSize: 14, color: colorForToPar(player.totalScoreNum) }}
      >
        {player.totalToPar ?? "—"}
      </div>
      <div
        className="text-right num self-center"
        style={{ fontSize: 14, color: colorForToPar(parseLeaderTotal(today?.toPar ?? null)) }}
      >
        {today?.toPar ?? "—"}
      </div>
      <div className="text-right num self-center" style={{ fontSize: 13 }}>
        {today?.complete ? "F" : (today?.thru ?? "—")}
      </div>
      <div className="self-center flex flex-wrap gap-1">
        {decisions.map(({ leg, decision }) => (
          <BetPill key={leg.id} leg={leg} decision={decision} />
        ))}
      </div>
    </div>
  );
}

function BetPill({ leg, decision }: { leg: SlipLeg; decision: Decision }) {
  const color =
    decision.status === "won"
      ? "#7fd49a"
      : decision.status === "lost"
        ? "#e87c7c"
        : decision.status === "push"
          ? "#a8b3ac"
          : decision.status === "live"
            ? "#f5c558"
            : "#a8b3ac";
  const isLive = decision.status === "live";
  return (
    <span
      title={`${describeLeg(leg)} — ${decision.reason}`}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border"
      style={{
        fontSize: 10,
        borderColor: color,
        color,
        background: `${color}1a`,
      }}
    >
      <span
        className={isLive ? "gs-status-pulse" : ""}
        style={{ width: 5, height: 5, borderRadius: 99, background: color }}
      />
      {describeLeg(leg)}
    </span>
  );
}

function parseLeaderTotal(toPar: string | null): number | null {
  if (!toPar) return null;
  if (toPar === "E") return 0;
  const n = Number(toPar.replace("+", ""));
  return Number.isNaN(n) ? null : n;
}

function colorForToPar(n: number | null): string | undefined {
  if (n === null) return undefined;
  if (n < 0) return "#7fd49a";
  if (n > 0) return "#e87c7c";
  return undefined;
}
