import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Returns the signed-in user's email-forwarding address — bets+<token>@<domain>
// — used by /dashboard/account. Creates the profile row + token on first
// visit so users don't have to mash a "generate" button.
export async function GET() {
  const domain = process.env.POSTMARK_INBOUND_DOMAIN || "greensidejourneys.com";

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.json(
      { configured: false, reason: "supabase not configured" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return NextResponse.json(
      { configured: true, signedIn: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const admin = supabaseAdmin();
  if (!admin) {
    // Service role missing — we can still read via RLS (own row), but not
    // create a profile if it doesn't exist.
    const { data } = await supabase
      .from("profiles")
      .select("bets_token")
      .eq("id", user.id)
      .maybeSingle();
    return NextResponse.json({
      configured: true,
      signedIn: true,
      token: data?.bets_token ?? null,
      address: data?.bets_token ? `bets+${data.bets_token}@${domain}` : null,
      domain,
    });
  }

  // Upsert profile to guarantee a token exists.
  const { data: existing } = await admin
    .from("profiles")
    .select("bets_token")
    .eq("id", user.id)
    .maybeSingle();
  let token = existing?.bets_token ?? null;
  if (!token) {
    const { data: inserted, error } = await admin
      .from("profiles")
      .upsert({ id: user.id }, { onConflict: "id" })
      .select("bets_token")
      .single();
    if (error) {
      return NextResponse.json(
        { configured: true, signedIn: true, error: error.message },
        { status: 500 },
      );
    }
    token = inserted?.bets_token ?? null;
  }

  return NextResponse.json(
    {
      configured: true,
      signedIn: true,
      token,
      address: token ? `bets+${token}@${domain}` : null,
      domain,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

// POST rotates the token — invalidates the old forwarding address.
export async function POST() {
  const domain = process.env.POSTMARK_INBOUND_DOMAIN || "greensidejourneys.com";
  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const admin = supabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "service role required to rotate" },
      { status: 503 },
    );
  }

  const newToken = crypto.randomUUID().replace(/-/g, "");
  const { error } = await admin
    .from("profiles")
    .upsert(
      { id: user.id, bets_token: newToken },
      { onConflict: "id" },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    token: newToken,
    address: `bets+${newToken}@${domain}`,
    domain,
  });
}
