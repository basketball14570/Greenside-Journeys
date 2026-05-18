"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { EMPTY_SLIP, type Slip, type SlipLeg } from "@/lib/bet-slip";
import { supabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";

// Slip persistence — localStorage first (works offline / signed-out),
// Supabase second (syncs across devices when signed in). Conflicts resolve
// by updatedAt; whichever is newer wins.

const LS_KEY_PREFIX = "greenside:slip:";

function lsKey(scope: string): string {
  return `${LS_KEY_PREFIX}${scope}`;
}

function readLocal(scope: string): Slip | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(lsKey(scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Slip;
    if (!parsed || !Array.isArray(parsed.legs)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLocal(scope: string, slip: Slip) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(lsKey(scope), JSON.stringify(slip));
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Distributive omit so the discriminated union survives "kind" narrowing
type DistributiveOmit<T, K extends keyof T> = T extends T ? Omit<T, K> : never;
export type NewLeg = DistributiveOmit<SlipLeg, "id" | "createdAt">;

export type UseBetSlipResult = {
  slip: Slip;
  addLeg: (leg: NewLeg) => void;
  removeLeg: (id: string) => void;
  replaceLeg: (id: string, leg: NewLeg) => void;
  clear: () => void;
  importLegs: (legs: SlipLeg[]) => void;
  ready: boolean;
  signedIn: boolean;
};

export function useBetSlip(): UseBetSlipResult {
  const supabaseConfigured = isSupabaseConfigured();
  const [userId, setUserId] = useState<string | null>(null);
  const [slip, setSlip] = useState<Slip>(EMPTY_SLIP);
  const [ready, setReady] = useState(false);
  const scopeRef = useRef<string>("guest");

  // Boot: figure out our user (if any), pick the right scope, load from
  // localStorage immediately, then reconcile with Supabase.
  useEffect(() => {
    let cancelled = false;
    async function boot() {
      let scope = "guest";
      if (supabaseConfigured) {
        const supabase = supabaseBrowser();
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          scope = data.user.id;
          setUserId(data.user.id);
        }
      }
      if (cancelled) return;
      scopeRef.current = scope;
      const local = readLocal(scope) ?? EMPTY_SLIP;
      setSlip(local);
      setReady(true);

      if (supabaseConfigured && scope !== "guest") {
        const supabase = supabaseBrowser();
        const { data } = await supabase
          .from("bet_slips")
          .select("bets, updated_at")
          .eq("user_id", scope)
          .maybeSingle();
        if (cancelled) return;
        if (data && Array.isArray(data.bets)) {
          const remote: Slip = {
            schemaVersion: 1,
            updatedAt: data.updated_at ?? new Date().toISOString(),
            legs: data.bets as SlipLeg[],
          };
          // Whichever is newer wins.
          if (remote.updatedAt > local.updatedAt) {
            setSlip(remote);
            writeLocal(scope, remote);
          }
        }
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, [supabaseConfigured]);

  // Persist whenever slip changes (post-boot).
  const lastSavedRef = useRef<string>("");
  const lastUpdatedAtRef = useRef<string>("");
  useEffect(() => {
    if (!ready) return;
    const scope = scopeRef.current;
    const serialized = JSON.stringify(slip);
    if (serialized === lastSavedRef.current) return;
    lastSavedRef.current = serialized;
    lastUpdatedAtRef.current = slip.updatedAt;
    writeLocal(scope, slip);
    if (supabaseConfigured && userId) {
      const supabase = supabaseBrowser();
      supabase
        .from("bet_slips")
        .upsert(
          {
            user_id: userId,
            bets: slip.legs,
            updated_at: slip.updatedAt,
          },
          { onConflict: "user_id" },
        )
        .then(() => {
          /* fire-and-forget */
        });
    }
  }, [slip, ready, userId, supabaseConfigured]);

  // Realtime: subscribe to bet_slips changes for this user so an edit
  // on device A flows to device B without a reload. The check against
  // lastUpdatedAtRef de-dupes the echo of our own write coming back
  // through the channel.
  useEffect(() => {
    if (!ready) return;
    if (!supabaseConfigured || !userId) return;
    const supabase = supabaseBrowser();
    const channel = supabase
      .channel(`bet_slips:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bet_slips",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as
            | { bets: SlipLeg[] | null; updated_at: string }
            | null;
          if (!row || !Array.isArray(row.bets)) return;
          // Skip our own write echoing back.
          if (row.updated_at <= lastUpdatedAtRef.current) return;
          const next: Slip = {
            schemaVersion: 1,
            updatedAt: row.updated_at,
            legs: row.bets,
          };
          lastUpdatedAtRef.current = row.updated_at;
          lastSavedRef.current = JSON.stringify(next);
          writeLocal(scopeRef.current, next);
          setSlip(next);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [ready, supabaseConfigured, userId]);

  const update = useCallback((next: Slip) => {
    setSlip({
      ...next,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const addLeg = useCallback<UseBetSlipResult["addLeg"]>(
    (legInput) => {
      const leg = {
        ...legInput,
        id: newId(),
        createdAt: new Date().toISOString(),
      } as SlipLeg;
      update({ ...slip, legs: [...slip.legs, leg] });
    },
    [slip, update],
  );

  const removeLeg = useCallback<UseBetSlipResult["removeLeg"]>(
    (id) => {
      update({ ...slip, legs: slip.legs.filter((l) => l.id !== id) });
    },
    [slip, update],
  );

  const replaceLeg = useCallback<UseBetSlipResult["replaceLeg"]>(
    (id, legInput) => {
      update({
        ...slip,
        legs: slip.legs.map((l) =>
          l.id === id
            ? ({ ...legInput, id, createdAt: l.createdAt } as SlipLeg)
            : l,
        ),
      });
    },
    [slip, update],
  );

  const clear = useCallback(() => {
    update({ ...slip, legs: [] });
  }, [slip, update]);

  const importLegs = useCallback<UseBetSlipResult["importLegs"]>(
    (legs) => {
      update({ ...slip, legs });
    },
    [slip, update],
  );

  return {
    slip,
    addLeg,
    removeLeg,
    replaceLeg,
    clear,
    importLegs,
    ready,
    signedIn: !!userId,
  };
}
