import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One-time fix for the two Underdog R3 Leaderboard Position legs that
// parsed before the parser learned the "R3" indicator. Re-labels Aberg
// and Matsuyama's "Top 10 Leaderboard Position" / "Top 10" entries to
// "R3 Top 10" so the grader settles them when R3 finishes instead of
// waiting for the tournament to post. Safe to call repeatedly — only
// touches rows that still match the misparsed pattern.
export async function POST() {
  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const TARGETS = ["Ludvig Aberg", "Hideki Matsuyama"];
  const { data: rows, error: readErr } = await supabase
    .from("bets")
    .select("id, player, market")
    .eq("user_id", userData.user.id)
    .in("player", TARGETS);
  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }

  const updates: { id: string; before: string; after: string }[] = [];
  for (const row of rows ?? []) {
    const m = row.market || "";
    // Only flip rows that look like the misparsed shape: top-10 leaderboard
    // position with no existing round prefix. Leaves anything already
    // round-scoped (or unrelated) alone.
    if (/\btop\s*10\b/i.test(m) && !/\br\s*\d\b/i.test(m)) {
      updates.push({ id: row.id, before: m, after: "R3 Top 10" });
    }
  }

  for (const u of updates) {
    const { error } = await supabase
      .from("bets")
      .update({ market: u.after })
      .eq("id", u.id)
      .eq("user_id", userData.user.id);
    if (error) {
      return NextResponse.json(
        { error: error.message, updated: updates.length },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true, updated: updates });
}
