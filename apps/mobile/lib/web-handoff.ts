import { supabase } from "./supabase";
import { webUrl } from "./api";

// Builds a URL that hands the native Supabase session off to the
// webview-backed pages on greensideedge.com. The handoff page (defined
// at app/auth/mobile-handoff in the Next.js app) calls
// `supabase.auth.setSession()` with the access + refresh tokens, which
// writes the SSR cookies so the user lands on `next` already signed in.
//
// Without this, the webview would render the login page even though the
// native app already has a session — different storage, different
// cookie jar.
export async function buildHandoffUrl(nextPath: string): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const s = data.session;
  if (!s) return webUrl(nextPath);
  const qs = new URLSearchParams({
    access_token: s.access_token,
    refresh_token: s.refresh_token,
    next: nextPath,
  });
  return webUrl(`/auth/mobile-handoff?${qs.toString()}`);
}
