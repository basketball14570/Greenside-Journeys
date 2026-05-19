"use client";

import { useCallback, useEffect, useState } from "react";
import type { Usage, UsageKind } from "@/lib/usage";

// Fetches the signed-in user's current daily quota for one kind, plus
// gives the page a setter so it can update from API responses without
// a refetch. Returns null while loading or when the user isn't signed in.
export function useQuota(kind: UsageKind): {
  usage: Usage | null;
  setUsage: (u: Usage | null) => void;
} {
  const [usage, setUsage] = useState<Usage | null>(null);

  const apply = useCallback((u: Usage | null) => setUsage(u), []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/usage", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const u = j?.signedIn ? j?.usage?.[kind] : null;
        if (u) setUsage(u);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [kind]);

  return { usage, setUsage: apply };
}
