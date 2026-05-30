"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  fetchLeaderboard,
  type LeaderboardPlayer,
  type LeaderboardSnapshot,
} from "@/lib/espn-leaderboard";

// One shared leaderboard fetch for the whole dashboard. Widgets used to each
// run their own poll which meant the Today screen alone fired 4-5 identical
// requests on load and again every 60s. Now there's one poll at the layout
// level and every consumer reads from this context.

type LeaderboardState = {
  snapshot: LeaderboardSnapshot | null;
  loading: boolean;
  error: Error | null;
  // Loose name → player lookup. Each consumer used to reinvent this; centralized
  // here so "C. Bezuidenhout" and "Christiaan Bezuidenhout" resolve the same way
  // everywhere.
  findPlayer: (name: string) => LeaderboardPlayer | null;
};

const LeaderboardContext = createContext<LeaderboardState | null>(null);

const POLL_MS = 60_000;

const nameKey = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function LeaderboardProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<LeaderboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      inFlight.current?.abort();
      const ctrl = new AbortController();
      inFlight.current = ctrl;
      try {
        const snap = await fetchLeaderboard(ctrl.signal);
        if (cancelled) return;
        setSnapshot(snap);
        setError(null);
      } catch (e) {
        if (cancelled || ctrl.signal.aborted) return;
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    const id = setInterval(run, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
      inFlight.current?.abort();
    };
  }, []);

  const findPlayer = useMemo(() => {
    const m = new Map<string, LeaderboardPlayer>();
    for (const p of snapshot?.players ?? []) m.set(nameKey(p.name), p);
    return (name: string) => m.get(nameKey(name)) ?? null;
  }, [snapshot]);

  const value = useMemo<LeaderboardState>(
    () => ({ snapshot, loading, error, findPlayer }),
    [snapshot, loading, error, findPlayer],
  );

  return (
    <LeaderboardContext.Provider value={value}>
      {children}
    </LeaderboardContext.Provider>
  );
}

export function useLeaderboard(): LeaderboardState {
  const ctx = useContext(LeaderboardContext);
  if (!ctx) {
    // Soft-fall back to an inert state so a widget rendered outside the
    // provider (e.g. an isolated page) doesn't crash — it just won't have data.
    return {
      snapshot: null,
      loading: false,
      error: null,
      findPlayer: () => null,
    };
  }
  return ctx;
}
