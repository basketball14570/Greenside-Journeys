import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

// Mirror of AUTH_COOKIE_OPTIONS in client.ts — kept in sync so server and
// browser writes produce identical cookie attributes.
const AUTH_COOKIE_OPTIONS: CookieOptions = {
  maxAge: 60 * 60 * 24 * 365,
  path: "/",
  sameSite: "lax",
};

export function supabaseServer() {
  const store = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: AUTH_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return store.getAll();
        },
        setAll(toSet: CookieToSet[]) {
          try {
            toSet.forEach(({ name, value, options }) =>
              store.set(name, value, options),
            );
          } catch {
            // Server Components can't set cookies — safe to ignore when called from them.
          }
        },
      },
    },
  );
}
