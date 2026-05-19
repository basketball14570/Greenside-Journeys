import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Quick "did the backfill actually land?" check. Returns event + row counts
// per year so you can confirm before training the model on it. Same auth
// rules as /api/admin/dfs-refresh.
export async function GET(req: NextRequest) {
  const adminToken = process.env.ADMIN_REFRESH_TOKEN;
  if (adminToken) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${adminToken}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const admin = supabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "supabase admin not configured" },
      { status: 503 },
    );
  }

  const { count: eventCount, error: e1 } = await admin
    .from("dfs_events")
    .select("*", { count: "exact", head: true });
  if (e1) {
    return NextResponse.json({ error: e1.message }, { status: 500 });
  }

  const { count: pointsCount, error: e2 } = await admin
    .from("dfs_player_points")
    .select("*", { count: "exact", head: true });
  if (e2) {
    return NextResponse.json({ error: e2.message }, { status: 500 });
  }

  const { data: byYear } = await admin
    .from("dfs_events")
    .select("year, event_name, course, event_date")
    .order("event_date", { ascending: false })
    .limit(200);

  const yearGroups: Record<string, number> = {};
  for (const row of byYear ?? []) {
    const y = String(row.year);
    yearGroups[y] = (yearGroups[y] ?? 0) + 1;
  }

  return NextResponse.json({
    ok: true,
    totals: { events: eventCount ?? 0, player_rows: pointsCount ?? 0 },
    by_year: yearGroups,
    sample_recent: (byYear ?? []).slice(0, 10),
  });
}
