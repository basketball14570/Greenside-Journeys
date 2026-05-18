import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The signed-in user's bets, scoped by RLS. Used by /dashboard/bets to
// show real imported bets above the demo data, and by the email-confirm
// flow (PATCH to flip user_confirmed / status).

function supabaseAvailable(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function GET(req: NextRequest) {
  if (!supabaseAvailable()) {
    return NextResponse.json(
      { configured: false, bets: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json(
      { configured: true, signedIn: false, bets: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status"); // "pending" | "live" | "won" | "lost" | etc.
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);

  let q = supabase
    .from("bets")
    .select(
      "id, book, player, market, line, american_odds, stake, to_win, status, source, parse_confidence, user_confirmed, placed_at, resolved_at, resolved_payout, created_at",
    )
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    {
      configured: true,
      signedIn: true,
      bets: data ?? [],
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const PatchSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["confirm", "dismiss"]),
});

export async function PATCH(req: NextRequest) {
  if (!supabaseAvailable()) {
    return NextResponse.json({ error: "supabase not configured" }, { status: 503 });
  }
  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const body = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  if (body.data.action === "dismiss") {
    const { error } = await supabase
      .from("bets")
      .delete()
      .eq("id", body.data.id)
      .eq("user_id", userData.user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action: "dismissed" });
  }

  // Confirm: flip user_confirmed=true and pending→live.
  const { error } = await supabase
    .from("bets")
    .update({ user_confirmed: true, status: "live" })
    .eq("id", body.data.id)
    .eq("user_id", userData.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, action: "confirmed" });
}
