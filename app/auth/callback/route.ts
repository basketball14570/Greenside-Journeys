import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// Supabase magic-link redirect lands here with a `code` query param.
// We exchange it for a session, then bounce the user to `next` (default: /dashboard).
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = supabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
