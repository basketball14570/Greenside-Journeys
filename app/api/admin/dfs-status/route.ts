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

  // Each query wrapped so one bad row / ordering issue doesn't blow up
  // the whole status check.
  const errors: string[] = [];

  let eventCount = 0;
  try {
    const { count, error } = await admin
      .from("dfs_events")
      .select("*", { count: "exact", head: true });
    if (error) errors.push(`events count: ${error.message}`);
    else eventCount = count ?? 0;
  } catch (e) {
    errors.push(`events count: ${(e as Error).message}`);
  }

  let pointsCount = 0;
  try {
    const { count, error } = await admin
      .from("dfs_player_points")
      .select("*", { count: "exact", head: true });
    if (error) errors.push(`points count: ${error.message}`);
    else pointsCount = count ?? 0;
  } catch (e) {
    errors.push(`points count: ${(e as Error).message}`);
  }

  const yearGroups: Record<string, number> = {};
  let sampleRecent: unknown[] = [];
  try {
    const { data, error } = await admin
      .from("dfs_events")
      .select("year, event_name, course, event_date")
      .order("year", { ascending: false })
      .order("event_id", { ascending: false })
      .limit(500);
    if (error) errors.push(`recent listing: ${error.message}`);
    for (const row of data ?? []) {
      const y = String(row.year);
      yearGroups[y] = (yearGroups[y] ?? 0) + 1;
    }
    sampleRecent = (data ?? []).slice(0, 12);
  } catch (e) {
    errors.push(`recent listing: ${(e as Error).message}`);
  }

  return NextResponse.json({
    ok: errors.length === 0,
    totals: { events: eventCount, player_rows: pointsCount },
    by_year: yearGroups,
    sample_recent: sampleRecent,
    errors,
  });
}
