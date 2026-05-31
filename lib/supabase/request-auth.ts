import { createClient, type User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { supabaseServer } from "./server";

// Resolves the signed-in user from a Next.js request, supporting both
// the website (SSR cookie session via @supabase/ssr) and the native
// mobile app (Authorization: Bearer <access_token>).
//
// The mobile RN client stores its session in AsyncStorage and can't share
// cookies with this server, so it includes the access token explicitly on
// every request. supabase.auth.getUser(jwt) validates the JWT against
// the project's JWT secret and returns the resolved user.
export async function getAuthedUser(req: NextRequest): Promise<User | null> {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (auth && /^bearer\s+/i.test(auth)) {
    const token = auth.replace(/^bearer\s+/i, "").trim();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon || !token) return null;
    // No persistence, no auto-refresh — this client only exists to
    // verify a single JWT for one request.
    const client = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  }

  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
