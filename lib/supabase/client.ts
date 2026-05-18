import { createBrowserClient } from "@supabase/ssr";

// Single source of truth for "is Supabase actually usable right now."
// Validates the URL is a proper HTTPS URL because Vercel will happily
// accept env var values like 'your-supabase-url-here' that look set
// to a truthy check but blow up createBrowserClient with
// 'Invalid supabaseUrl'. Every caller of supabaseBrowser must gate
// on this — without it, the dashboard crashes on every page load
// when the env vars are absent or placeholder values.
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return false;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
