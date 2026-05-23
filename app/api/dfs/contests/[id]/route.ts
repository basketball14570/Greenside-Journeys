import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Returns a shared contest by its share code. Open to any visitor — the
// service-role read is what makes a share link work without each person
// re-uploading the CSV. They still type their own DK username client-side.

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const admin = supabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "supabase not configured" }, { status: 503 });
  }

  const { data, error } = await admin
    .from("dfs_shared_contests")
    .select("id, name, entry_fee, format, round, payout_ladder, event_name, standings_csv, field_size")
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      id: data.id,
      name: data.name,
      fee: data.entry_fee,
      format: data.format,
      round: data.round,
      payoutLadder: data.payout_ladder,
      eventName: data.event_name,
      standingsCsv: data.standings_csv,
      fieldSize: data.field_size,
    },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } },
  );
}
