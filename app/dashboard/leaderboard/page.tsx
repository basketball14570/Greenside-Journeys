"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  fetchLeaderboard,
  type LeaderboardPlayer,
  type LeaderboardSnapshot,
} from "@/lib/espn-leaderboard";
import { useBetSlip } from "@/lib/bet-slip-store";
import { SkeletonRow } from "@/components/edge/Skeleton";
import { StarButton } from "@/components/edge/StarButton";
import { useStarredGolfers, normalizePlayerKey } from "@/lib/starred-golfers";
import { resolveCourseName } from "@/lib/data/course-pars";
import { buildScorecard, HoleStrip } from "@/components/edge/HoleScorecard";

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
  const { stars } = useStarredGolfers();

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

  // Starred golfers float to a "Favorites" group on top; everyone else falls
  // into "All players" below (no duplication).
  const { favorites, others } = useMemo(() => {
    const fav: LeaderboardPlayer[] = [];
    const rest: LeaderboardPlayer[] = [];
    for (const p of filtered) {
      if (stars.has(normalizePlayerKey(p.name))) fav.push(p);
      else rest.push(p);
    }
    return { favorites: fav, others: rest };
  }, [filtered, stars]);

  const courseName = resolveCourseName(
    snapshot?.event?.course ?? null,
    snapshot?.event?.name ?? null,
  );
  const holePars = snapshot?.event?.holePars;

  // Projected cut score — top 65 + ties — based on the current field. Only
  // meaningful pre-cut (R1/R2); once round 3 starts ESPN sets isCut and the
  // already-missed rows mark themselves, so we hide the divider.
  const projectedCut = useMemo(() => {
    if (!snapshot) return null;
    const period = snapshot.event?.period ?? 0;
    if (period >= 3) return null;
    const scored = snapshot.players
      .filter((p) => !p.isCut && p.totalScoreNum !== null)
      .map((p) => p.totalScoreNum as number)
      .sort((a, b) => a - b);
    if (scored.length < 10) return null;
    return scored[Math.min(64, scored.length - 1)];
  }, [snapshot]);

  // Where the cut row inserts in the position-sorted "others" list: index of
  // the first row whose score would currently miss. null when the cut isn't
  // meaningful (other sort orders, or no row is over the line yet).
  const cutInsertIndex = useMemo(() => {
    if (projectedCut === null || sort !== "pos") return null;
    for (let i = 0; i < others.length; i++) {
      const p = others[i];
      if (p.isCut) return i;
      const s = p.totalScoreNum;
      if (s === null || s > projectedCut) return i;
    }
    return null;
  }, [projectedCut, others, sort]);

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
        <div className="grid gap-2 px-4 py-2.5 text-xs uppercase tracking-wider text-text-dim border-b border-line grid-cols-[28px_30px_1fr_48px_52px_40px] md:grid-cols-[36px_44px_1.7fr_70px_80px_70px]">
          <div />
          <div>Pos</div>
          <div>Player</div>
          <div className="text-right">Total</div>
          <div className="text-right">Today</div>
          <div className="text-right">Thru</div>
        </div>
        <div className="max-h-[640px] overflow-y-auto">
          {!snapshot && loading ? (
            Array.from({ length: 12 }).map((_, i) => <SkeletonRow key={i} />)
          ) : filtered.length === 0 ? (
            <div className="px-4 py-6 text-text-dim text-center" style={{ fontSize: 13 }}>
              {query || filter !== "all"
                ? "No matches — try clearing filters."
                : "No leaderboard data yet."}
            </div>
          ) : (
            <>
              {favorites.length > 0 && (
                <>
                  <SectionLabel>★ Favorites</SectionLabel>
                  {favorites.map((p) => (
                    <Row key={p.id} player={p} courseName={courseName} holePars={holePars} />
                  ))}
                  {others.length > 0 && <SectionLabel>All players</SectionLabel>}
                </>
              )}
              {others.map((p, i) => (
                <Fragment key={p.id}>
                  {i === cutInsertIndex && <CutLineRow score={projectedCut} />}
                  <Row player={p} courseName={courseName} holePars={holePars} />
                </Fragment>
              ))}
            </>
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

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      className="num font-semibold uppercase px-4 py-1.5 border-b border-line bg-surface-2/60 sticky top-0 z-10"
      style={{ fontSize: 9.5, letterSpacing: 1.1, color: "#f5c558" }}
    >
      {children}
    </div>
  );
}

// Inline cut-line marker — sits between the last player projected to make
// the cut and the first one currently outside, like the ESPN/DK boards do.
function CutLineRow({ score }: { score: number | null }) {
  const label =
    score === null ? "E" : score === 0 ? "E" : score > 0 ? `+${score}` : `${score}`;
  return (
    <div
      className="flex items-center gap-2 px-4 py-1.5 num font-semibold uppercase"
      style={{
        fontSize: 9.5,
        letterSpacing: 1.2,
        color: "#e57373",
        background: "rgba(229,115,115,0.08)",
        borderTop: "1px dashed rgba(229,115,115,0.55)",
        borderBottom: "1px dashed rgba(229,115,115,0.55)",
      }}
    >
      <span className="flex-1 truncate">Projected cut · top 65 + ties</span>
      <span style={{ letterSpacing: 0.5 }}>{label}</span>
    </div>
  );
}

function Row({
  player,
  courseName,
  holePars,
}: {
  player: LeaderboardPlayer;
  courseName: string | null;
  holePars: number[] | undefined;
}) {
  const [open, setOpen] = useState(false);
  const today = player.todayLine;
  const scorecard = open ? buildScorecard(today, courseName, holePars) : null;
  const canExpand =
    !!today && today.holes.some((h) => h.strokes !== null && h.strokes > 0);
  return (
    <div className="border-b border-line/50 last:border-b-0">
      <div
        className="grid gap-2 px-4 py-2 hover:bg-surface-2 grid-cols-[28px_30px_1fr_48px_52px_40px] md:grid-cols-[36px_44px_1.7fr_70px_80px_70px]"
        onClick={() => canExpand && setOpen((v) => !v)}
        style={{ cursor: canExpand ? "pointer" : "default" }}
      >
        <div className="self-center -ml-1" onClick={(e) => e.stopPropagation()}>
          <StarButton player={player.name} size={14} />
        </div>
        <div
          className="num self-center"
          style={{ fontSize: 13, color: player.isCut ? "#a8b3ac" : undefined }}
        >
          {player.posDisplay || "—"}
        </div>
        <div className="self-center min-w-0 flex items-center gap-1.5">
          <span className="font-medium truncate" style={{ fontSize: 13 }}>
            {player.name}
          </span>
          {canExpand && (
            <span className="num" style={{ fontSize: 8, color: "#7e8a83" }}>
              {open ? "▲" : "▼"}
            </span>
          )}
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
          {today?.complete
            ? "F"
            : today?.thru != null
              ? today.thru
              : player.teeTime
                ? <span style={{ color: "#a8b3ac" }}>{formatTeeTime(player.teeTime)}</span>
                : "—"}
        </div>
      </div>
      {open && scorecard && (
        <div className="px-4 pb-3">
          <HoleStrip cells={scorecard} />
        </div>
      )}
    </div>
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

function formatTeeTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
