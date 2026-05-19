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

// Shared with API responses + client error handling so the magic string
// can't drift out of sync across the network boundary.
export const QUOTA_ERROR_CODE = "daily_limit";

export type Usage = { used: number; limit: number | null; allowed: boolean };

export type QuotaCheck = Usage & { tier: Tier };

const TIERS: readonly Tier[] = ["free", "pro", "sharp"];
function asTier(raw: unknown): Tier {
  return typeof raw === "string" && (TIERS as readonly string[]).includes(raw)
    ? (raw as Tier)
    : "free";
}

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

  const tier = asTier(profile?.tier);
  const limit = QUOTAS[kind][tier];
  const used = counter?.count ?? 0;

  return {
    allowed: limit === null || used < limit,
    used,
    limit,
    tier,
  };
}

// Atomic increment via Postgres function — concurrent calls can't
// double-spend the cap. Fire-and-forget at the call site so the user
// doesn't wait on the write before getting their response.
export async function bumpUsage(
  userId: string,
  kind: UsageKind,
): Promise<void> {
  const admin = supabaseAdmin();
  if (!admin) return;
  await admin.rpc("bump_usage_counter", {
    p_user_id: userId,
    p_kind: kind,
    p_day: todayUtc(),
  });
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}
