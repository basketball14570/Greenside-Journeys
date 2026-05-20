"use client";

import { useCallback, useEffect, useState } from "react";

// Starred golfers. Persists to localStorage (per-device) so users can
// track players they care about without having a bet on them. Later
// move to a `starred_golfers` Supabase table for cross-device sync,
// but for the immediate "I just want to watch these guys" use case,
// browser storage is the right ergonomics — no auth required, instant
// toggle, and the key list is short.
//
// Player identity uses a normalized name string ("scottie scheffler")
// so the same star matches a player whether the source is ESPN
// ("Scottie Scheffler") or DataGolf ("Scheffler, Scottie").

const STORAGE_KEY = "greenside:starred-golfers:v1";

// Backward-compatible event so listeners in other components on the
// same tab pick up changes too — the browser only fires `storage`
// across tabs.
const SAME_TAB_EVENT = "greenside:starred-golfers:change";

export function normalizePlayerKey(name: string): string {
  // Handle both "First Last" (sportsbook / ESPN) and "Last, First"
  // (DataGolf) by flipping the comma form first.
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

function readStorage(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((v): v is string => typeof v === "string"));
  } catch {
    return new Set();
  }
}

function writeStorage(stars: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...stars]));
    window.dispatchEvent(new CustomEvent(SAME_TAB_EVENT));
  } catch {
    // Quota exceeded / private mode — best-effort.
  }
}

export function useStarredGolfers() {
  const [stars, setStars] = useState<Set<string>>(() => new Set<string>());

  // Hydrate on mount. SSR returns an empty set so the initial render is
  // stable; we sync after hydration to avoid a hydration mismatch.
  useEffect(() => {
    setStars(readStorage());
    const refresh = () => setStars(readStorage());
    window.addEventListener("storage", refresh);
    window.addEventListener(SAME_TAB_EVENT, refresh as EventListener);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(SAME_TAB_EVENT, refresh as EventListener);
    };
  }, []);

  const toggle = useCallback((name: string) => {
    const key = normalizePlayerKey(name);
    if (!key) return;
    const next = new Set(readStorage());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    writeStorage(next);
    setStars(next);
  }, []);

  const isStarred = useCallback(
    (name: string) => stars.has(normalizePlayerKey(name)),
    [stars],
  );

  return { stars, isStarred, toggle };
}
