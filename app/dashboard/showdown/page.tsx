"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchLeaderboard,
  findTrackedPlayer,
  type LeaderboardPlayer,
  type LeaderboardSnapshot,
  type TrackedPlayer,
} from "@/lib/espn-leaderboard";

// DraftKings showdown lineup — six golfers to track live. Aliases cover
// accent variations and ESPN's occasional name reshuffles. `excludes`
// on Nicolai Hojgaard forces a clean disambiguation from Rasmus.
// Today's roster. Rasmus + Aberg get accent variants; Rasmus's excludes
// keep us from latching onto his brother Nicolai by accident.
const ROSTER: TrackedPlayer[] = [
  {
    key: "scottie-scheffler",
    display: "Scottie Scheffler",
    aliases: ["Scottie Scheffler"],
  },
  {
    key: "ludvig-aberg",
    display: "Ludvig Åberg",
    aliases: ["Ludvig Aberg", "Ludvig Åberg", "L. Aberg"],
  },
  {
    key: "rory-mcilroy",
    display: "Rory McIlroy",
    aliases: ["Rory McIlroy", "R. McIlroy"],
  },
  {
    key: "cameron-young",
    display: "Cameron Young",
    aliases: ["Cameron Young"],
  },
  {
    key: "john-parry",
    display: "John Parry",
    aliases: ["John Parry"],
  },
  {
    key: "rasmus-hojgaard",
    display: "Rasmus Højgaard",
    aliases: ["Rasmus Hojgaard", "Rasmus Højgaard", "R. Hojgaard"],
    excludes: ["Nicolai Hojgaard", "Nicolai Højgaard"],
  },
  {
    key: "andrew-novak",
    display: "Andrew Novak",
    aliases: ["Andrew Novak"],
  },
  {
    key: "sam-stevens",
    display: "Sam Stevens",
    aliases: ["Sam Stevens"],
  },
];

const REFRESH_MS = 30_000;

export default function ShowdownPage() {
  const [snapshot, setSnapshot] = useState<LeaderboardSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [auto, setAuto] = useState(true);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (auto) {
      timerRef.current = setInterval(load, REFRESH_MS);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [auto, load]);

  const tracked = useMemo(() => {
    if (!snapshot) return [];
    return ROSTER.map((t) => ({
      tracked: t,
      player: findTrackedPlayer(snapshot, t),
    }));
  }, [snapshot]);

  const sorted = useMemo(() => {
    return [...tracked].sort((a, b) => {
      const av = a.player?.totalScoreNum ?? Number.POSITIVE_INFINITY;
      const bv = b.player?.totalScoreNum ?? Number.POSITIVE_INFINITY;
      return av - bv;
    });
  }, [tracked]);

  return (
    <div className="px-5 lg:px-8 py-6 space-y-6 max-w-5xl mx-auto">
      <header>
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
        >
          ● DraftKings Showdown
        </span>
        <h1
          className="serif-italic mt-1.5"
          style={{ fontSize: 36, letterSpacing: -0.4 }}
        >
          <em>Your six, live.</em>
        </h1>
        <p className="text-text-dim mt-2 max-w-2xl" style={{ fontSize: 14 }}>
          Tracks your DraftKings showdown roster against the live ESPN
          scoreboard. Today&apos;s round, today&apos;s score to par, and
          overall tournament position — updated every 30 seconds. Round
          auto-detects from ESPN, so R3 today, R4 tomorrow.
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

      <div className="rounded-[14px] border border-line overflow-hidden bg-surface-1">
        <div
          className="grid gap-2 px-4 py-3 text-xs uppercase tracking-wider text-text-dim border-b border-line"
          style={{ gridTemplateColumns: "44px 1.6fr 70px 80px 70px 80px" }}
        >
          <div>Pos</div>
          <div>Player</div>
          <div className="text-right">Total</div>
          <div className="text-right">Today (R{snapshot?.event?.period ?? "—"})</div>
          <div className="text-right">Thru</div>
          <div className="text-right">Status</div>
        </div>
        {sorted.map(({ tracked, player }) => (
          <PlayerRow key={tracked.key} tracked={tracked} player={player} />
        ))}
      </div>

      <UnmatchedNotice tracked={tracked} />
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
  const stateColor =
    event?.state === "in"
      ? "#8ee68e"
      : event?.state === "post"
        ? "#a8b3ac"
        : "#f5c558";
  return (
    <div className="rounded-[14px] border border-line p-5 bg-surface-1 flex flex-wrap items-baseline gap-x-6 gap-y-3">
      <div className="flex-1 min-w-0">
        <div
          className="num uppercase text-text-dim"
          style={{ fontSize: 10, letterSpacing: 1.4 }}
        >
          ● {event ? `Round ${event.period} · ${event.statusDetail || event.state}` : "Loading…"}
        </div>
        <div
          className="serif-italic mt-1"
          style={{ fontSize: 24, letterSpacing: -0.3 }}
        >
          <em>{event?.name ?? "—"}</em>
        </div>
        {event && (
          <div className="text-text-dim mt-0.5" style={{ fontSize: 13 }}>
            {event.course ?? "Course TBD"}
            {event.location ? ` · ${event.location}` : ""}
            {event.coursePar ? ` · Par ${event.coursePar}` : ""}
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-2" style={{ fontSize: 12 }}>
          <span style={{ color: stateColor }}>●</span>
          <span className="text-text-dim">
            {snapshot
              ? `Updated ${new Date(snapshot.fetchedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}`
              : "—"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="rounded-[8px] border border-line px-3 py-1 hover:bg-surface-2 transition-colors disabled:opacity-50"
            style={{ fontSize: 12 }}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <label className="flex items-center gap-1.5 text-text-dim" style={{ fontSize: 12 }}>
            <input
              type="checkbox"
              checked={auto}
              onChange={onToggleAuto}
            />
            Auto 30s
          </label>
        </div>
      </div>
      {error && (
        <div
          className="w-full rounded-[10px] px-3 py-2"
          style={{
            background: "rgba(232,124,124,0.1)",
            color: "#e87c7c",
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

function PlayerRow({
  tracked,
  player,
}: {
  tracked: TrackedPlayer;
  player: LeaderboardPlayer | null;
}) {
  if (!player) {
    return (
      <div
        className="grid gap-2 px-4 py-3 border-b border-line/50 last:border-b-0"
        style={{ gridTemplateColumns: "44px 1.6fr 70px 80px 70px 80px" }}
      >
        <div className="text-text-dim num" style={{ fontSize: 13 }}>
          —
        </div>
        <div>
          <div className="font-medium" style={{ fontSize: 14 }}>
            {tracked.display}
          </div>
          <div className="text-text-dim mt-0.5" style={{ fontSize: 11 }}>
            Not found in current field
          </div>
        </div>
        <div className="text-right text-text-dim num self-center" style={{ fontSize: 13 }}>
          —
        </div>
        <div className="text-right text-text-dim num self-center" style={{ fontSize: 13 }}>
          —
        </div>
        <div className="text-right text-text-dim num self-center" style={{ fontSize: 13 }}>
          —
        </div>
        <div className="text-right text-text-dim self-center" style={{ fontSize: 11 }}>
          off field
        </div>
      </div>
    );
  }

  const today = player.todayLine;
  const todayToPar = today?.toPar ?? null;
  const totalColor = colorForToPar(player.totalScoreNum);
  const todayColor = colorForToPar(parseLeaderTotal(todayToPar));

  let statusText = "";
  let statusColor = "#a8b3ac";
  if (player.isCut) {
    statusText = "CUT";
    statusColor = "#e87c7c";
  } else if (today?.complete) {
    statusText = "Done";
  } else if (today?.thru) {
    statusText = "Live";
    statusColor = "#f5c558";
  } else if (player.teeTime) {
    const t = new Date(player.teeTime);
    if (!Number.isNaN(t.getTime())) {
      statusText = t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } else {
      statusText = "Pre";
    }
  } else {
    statusText = "Pre";
  }

  return (
    <div
      className="grid gap-2 px-4 py-3 border-b border-line/50 last:border-b-0 hover:bg-surface-2 transition-colors"
      style={{ gridTemplateColumns: "44px 1.6fr 70px 80px 70px 80px" }}
    >
      <div className="num self-center" style={{ fontSize: 14 }}>
        {player.posDisplay || "—"}
      </div>
      <div className="self-center min-w-0">
        <div className="font-medium truncate" style={{ fontSize: 14 }}>
          {player.name}
        </div>
        {player.name.toLowerCase() !== tracked.display.toLowerCase() && (
          <div className="text-text-dim mt-0.5" style={{ fontSize: 10 }}>
            tracking as {tracked.display}
          </div>
        )}
      </div>
      <div
        className="text-right num self-center"
        style={{ fontSize: 16, color: totalColor }}
      >
        {player.totalToPar ?? "—"}
      </div>
      <div
        className="text-right num self-center"
        style={{ fontSize: 16, color: todayColor }}
      >
        {todayToPar ?? "—"}
      </div>
      <div className="text-right num self-center" style={{ fontSize: 14 }}>
        {today?.complete ? "F" : (today?.thru ?? "—")}
      </div>
      <div
        className="text-right self-center num uppercase"
        style={{ fontSize: 11, color: statusColor, letterSpacing: 0.5 }}
      >
        {statusText}
      </div>
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

function UnmatchedNotice({
  tracked,
}: {
  tracked: { tracked: TrackedPlayer; player: LeaderboardPlayer | null }[];
}) {
  const missing = tracked.filter((t) => !t.player);
  if (!missing.length) return null;
  return (
    <div
      className="rounded-[14px] p-4 border border-line"
      style={{ background: "rgba(245,197,88,0.06)" }}
    >
      <div className="flex items-baseline gap-2" style={{ fontSize: 13 }}>
        <span style={{ color: "#f5c558" }}>●</span>
        <strong>Missing from current ESPN field:</strong>
        <span className="text-text-dim">
          {missing.map((m) => m.tracked.display).join(", ")}
        </span>
      </div>
      <div className="text-text-dim mt-1.5" style={{ fontSize: 12 }}>
        Either they&apos;re not entered this week, or ESPN&apos;s name
        spelling drifted. Check tee sheets and update the aliases in
        <code className="ml-1" style={{ background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 4 }}>
          ROSTER
        </code>{" "}
        if needed.
      </div>
    </div>
  );
}
