import { supabaseAdmin } from "@/lib/supabase/admin";

// Quota system — caps free-tier Claude spend. Hooks into every endpoint
// that makes a paid Anthropic call. Pro / sharp tiers bypass entirely.
//
// Daily counters reset at UTC midnight (Postgres `current_date`). That's
// roughly midnight Pacific for the bettor flow, which is fine — most golf
// bets land Mon-Wed pre-tournament and Thu-Sun in-round, well clear of
// the rollover boundary.

export type UsageKind = "screenshot_parse" | "ask";

export type Tier = "free" | "pro" | "sharp";

// Daily caps. `null` = unlimited. Add new kinds here as more Claude-calling
// endpoints get wired in.
const QUOTAS: Record<UsageKind, Record<Tier, number | null>> = {
  screenshot_parse: {
    free: 5,
    pro: null,
    sharp: null,
  },
  ask: {
    free: 10,
    pro: null,
    sharp: null,
  },
};

export type QuotaCheck = {
  allowed: boolean;
  used: number;
  limit: number | null;
  tier: Tier;
};

// Read-only check. Use before performing the paid work so we can return
// 429 without spending tokens; bump() after the work succeeds.
export async function checkQuota(
  userId: string,
  kind: UsageKind,
): Promise<QuotaCheck> {
  const admin = supabaseAdmin();
  if (!admin) {
    // Without service role we can't enforce — fail open so the app still
    // works in local/dev. Production has the service role set.
    return { allowed: true, used: 0, limit: null, tier: "free" };
  }

  const [{ data: profile }, { data: counter }] = await Promise.all([
    admin.from("profiles").select("tier").eq("id", userId).maybeSingle(),
    admin
      .from("usage_counters")
      .select("count")
      .eq("user_id", userId)
      .eq("day", todayUtc())
      .eq("kind", kind)
      .maybeSingle(),
  ]);

  const tier = (profile?.tier as Tier) ?? "free";
  const limit = QUOTAS[kind][tier];
  const used = counter?.count ?? 0;

  return {
    allowed: limit === null || used < limit,
    used,
    limit,
    tier,
  };
}

// Increment after a successful paid call. Idempotent on conflict — same
// (user, day, kind) row gets bumped instead of duplicated. We don't bump
// on failure so users aren't penalized for upstream errors.
export async function bumpUsage(
  userId: string,
  kind: UsageKind,
): Promise<void> {
  const admin = supabaseAdmin();
  if (!admin) return;

  const day = todayUtc();
  // Read-then-write rather than a raw SQL upsert+increment because the
  // Supabase JS client doesn't expose `RETURNING count + 1`. The race
  // window is small enough that a stray double-bump is acceptable —
  // worst case a heavy user gets one fewer parse than the nominal cap.
  const { data } = await admin
    .from("usage_counters")
    .select("count")
    .eq("user_id", userId)
    .eq("day", day)
    .eq("kind", kind)
    .maybeSingle();

  const next = (data?.count ?? 0) + 1;
  await admin.from("usage_counters").upsert(
    { user_id: userId, day, kind, count: next },
    { onConflict: "user_id,day,kind" },
  );
}

function todayUtc(): string {
  // YYYY-MM-DD in UTC — matches Postgres `current_date` semantics.
  return new Date().toISOString().slice(0, 10);
}
