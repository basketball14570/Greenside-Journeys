import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role Supabase client for server-side jobs that legitimately need
// to bypass RLS: cron settlers, the Postmark inbound webhook, etc. Never
// import this from a client component — the service-role key would leak.
//
// Returns null when env isn't configured, so callers can no-op gracefully
// in local / demo environments.

let cached: SupabaseClient | null | undefined;

export function supabaseAdmin(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    cached = null;
    return null;
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export function adminEnabled(): boolean {
  return supabaseAdmin() !== null;
}
