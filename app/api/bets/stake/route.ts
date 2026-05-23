import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Persists an edited parlay stake. The live slip lets a user set the real
// wager on odds-only parlays (stored normalized to $10); this writes the
// new stake + to-win to every leg of the ticket. RLS ("own bets") scopes
// the update to the signed-in user's rows.

const PayloadSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
  stake: z.number().positive().max(1_000_000),
  to_win: z.number().nonnegative().max(100_000_000),
});

export async function PATCH(req: NextRequest) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.json({ error: "supabase not configured" }, { status: 503 });
  }
  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const body = PayloadSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const { ids, stake, to_win } = body.data;
  const { error, count } = await supabase
    .from("bets")
    .update({ stake, to_win }, { count: "exact" })
    .in("id", ids)
    .eq("user_id", userData.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, updated: count ?? 0 });
}
