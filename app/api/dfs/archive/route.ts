import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { findEventByName } from "@/lib/data/pga-schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Returns the entire DFS archive in the same shape as the legacy static
// `OWNERSHIP_DATA` so the ownership browser can render it without any
// further transformation. One round-trip, cached at the edge for 15
// minutes since the data only changes on the weekly cron.
//
// Shape:
//   { events: [{ name, course, year, type, par, yards, players: [...] }] }
//
// `type` is best-effort: looked up from our 2026 PGA schedule when the
// event name matches; otherwise null. par/yards are left null when not
// present in the source data.
type ArchiveEvent = {
  name: string;
  course: string | null;
  year: number;
  type: string | null;
  par: number | null;
  yards: number | null;
  players: { name: string; salary: number; own: number }[];
};

export async function GET() {
  const admin = supabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "supabase admin not configured" },
      { status: 503 },
    );
  }

  const { data: events, error: e1 } = await admin
    .from("dfs_events")
    .select("id, event_name, course, year, event_date")
    .order("event_date", { ascending: false, nullsFirst: false });
  if (e1) {
    return NextResponse.json({ error: e1.message }, { status: 500 });
  }

  if (!events || events.length === 0) {
    return NextResponse.json({ events: [] });
  }

  // Pull every DraftKings row for these events in one go. RLS allows
  // service role full access; we filter in memory below.
  const { data: rows, error: e2 } = await admin
    .from("dfs_player_points")
    .select("event_id, player_name, salary, ownership_pct")
    .eq("site", "draftkings");
  if (e2) {
    return NextResponse.json({ error: e2.message }, { status: 500 });
  }

  const byEvent = new Map<string, { name: string; salary: number; own: number }[]>();
  for (const r of rows ?? []) {
    if (r.ownership_pct == null || r.salary == null) continue;
    const arr = byEvent.get(r.event_id) ?? [];
    arr.push({
      name: r.player_name,
      salary: r.salary,
      own: Number(r.ownership_pct),
    });
    byEvent.set(r.event_id, arr);
  }

  const archive: ArchiveEvent[] = events.map((ev) => {
    const sched = findEventByName(ev.event_name);
    const players = (byEvent.get(ev.id) ?? []).sort((a, b) => b.own - a.own);
    // Display name reflects the year so the Tournaments table can
    // distinguish e.g. "Truist Championship 2024" vs "...2025".
    const displayName =
      /\b20\d{2}\b/.test(ev.event_name)
        ? ev.event_name
        : `${ev.event_name} ${ev.year}`;
    return {
      name: displayName,
      course: ev.course,
      year: ev.year,
      type: sched?.type ?? null,
      par: null,
      yards: null,
      players,
    };
  });

  return NextResponse.json(
    { events: archive },
    {
      headers: {
        // Mirror the cron cadence — fresh enough but doesn't hammer DB.
        "Cache-Control": "public, max-age=0, s-maxage=900, stale-while-revalidate=3600",
      },
    },
  );
}
