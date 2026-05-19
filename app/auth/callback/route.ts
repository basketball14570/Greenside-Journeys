import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Supabase auth redirect lands here with a `code` query param. Covers
// magic-link sign-ins, password-reset confirmations, and email-confirm
// links — they all hit this single callback.
//
// IMPORTANT: cookies have to be set on the redirect response directly,
// not via `cookies()` from next/headers. The implicit response that
// Next attaches `cookies()` writes to is discarded when we return a
// `NextResponse.redirect(...)`, which means the session cookie never
// makes it to the browser and the user appears unauthenticated on the
// next request. Build the response up-front and hand it to the Supabase
// client so its `setAll` writes onto the response that actually ships.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  let target = next;
  // Mutable so we can swap the redirect target after we know whether
  // the user needs onboarding. The cookies we've already written stay
  // on the response object.
  let response = NextResponse.redirect(new URL(target, url.origin));

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(toSet: { name: string; value: string; options?: CookieOptions }[]) {
            for (const { name, value, options } of toSet) {
              response.cookies.set(name, value, options);
            }
          },
        },
      },
    );

    const { data: session } = await supabase.auth.exchangeCodeForSession(code);
    const user = session?.user;
    const admin = supabaseAdmin();
    // Password-reset links land here too. Don't drag the user through
    // onboarding before they've even set their password — let them set
    // it first, then they can hit /dashboard normally.
    const isPasswordReset = next === "/account/password";
    if (user && admin && !isPasswordReset) {
      const { data: profile } = await admin
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile) {
        await admin.from("profiles").upsert({ id: user.id }, { onConflict: "id" });
        const onboardingUrl = new URL("/onboarding", url.origin);
        if (next !== "/dashboard") onboardingUrl.searchParams.set("next", next);
        target = onboardingUrl.pathname + onboardingUrl.search;
        // Rebuild the redirect at the new target, copying the cookies
        // the Supabase client already wrote.
        const newResponse = NextResponse.redirect(new URL(target, url.origin));
        for (const c of response.cookies.getAll()) {
          newResponse.cookies.set(c);
        }
        response = newResponse;
      }
    }
  }

  return response;
}
