import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Supabase magic-link redirect lands here with a `code` query param.
// We exchange it for a session. First-time sign-ins (no profiles row yet)
// get routed to /onboarding so they pick books / alerts / forwarding
// address. Returning users go to `next` (default: /dashboard).
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  let target = next;

  if (code) {
    const supabase = supabaseServer();
    const { data: session } = await supabase.auth.exchangeCodeForSession(code);
    const user = session?.user;
    const admin = supabaseAdmin();
    if (user && admin) {
      const { data: profile } = await admin
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile) {
        // First sign-in. Create the profile row so the default
        // bets_token + alert_prefs columns populate, then route to
        // the onboarding flow. Caller's `next` param is preserved
        // as a query so we can deep-link after setup.
        await admin.from("profiles").upsert({ id: user.id }, { onConflict: "id" });
        const onboardingUrl = new URL("/onboarding", url.origin);
        if (next !== "/dashboard") onboardingUrl.searchParams.set("next", next);
        target = onboardingUrl.pathname + onboardingUrl.search;
      }
    }
  }

  return NextResponse.redirect(new URL(target, url.origin));
}
