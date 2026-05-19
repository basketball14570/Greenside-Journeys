import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getActiveEvent, SEASON_YEAR, findEventByName } from "@/lib/data/pga-schedule";
import { getDfsPointsForEvent } from "@/lib/data/datagolf";
import {
  projectOwnership,
  type HistoryRow,
  type FieldEntry,
} from "@/lib/dfs/ownership-model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Returns similarity-weighted ownership projections for the upcoming
// (or active) event's field. The field + salaries come from DataGolf's
// historical-dfs-data/points feed once they've posted current-week
// salaries; history comes from our own Supabase mirror.
//
// Query params (all optional):
//   year      — defaults to season year (2026)
//   event_id  — DataGolf numeric event_id for the *upcoming* event.
//               When omitted we try the active event by name match.
//   site      — draftkings | fanduel | yahoo
export async function GET(req: NextRequest) {
  const admin = supabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "supabase admin not configured" },
      { status: 503 },
    );
  }
  if (!process.env.DATAGOLF_API_KEY) {
    return NextResponse.json(
      { error: "DATAGOLF_API_KEY not set" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year") ?? SEASON_YEAR);
  const site =
    (searchParams.get("site") as "draftkings" | "fanduel" | "yahoo") ??
    "draftkings";
  const eventIdParam = searchParams.get("event_id");

  const active = getActiveEvent();
  if (!active) {
    return NextResponse.json({ error: "no active event" }, { status: 404 });
  }

  // Figure out which DataGolf event_id to pull current-week salaries from.
  // If the caller supplied one, trust it. Otherwise look up by matching
  // event_name against our mirrored dfs_events table — handy for the
  // common case where DataGolf and our schedule use the same names.
  let eventId: number | null = eventIdParam ? Number(eventIdParam) : null;
  if (eventId == null) {
    const { data: match } = await admin
      .from("dfs_events")
      .select("event_id, event_name, course")
      .eq("year", year)
      .ilike("event_name", `%${active.name.split(" ").slice(0, 2).join(" ")}%`)
      .limit(1)
      .maybeSingle();
    if (match?.event_id) eventId = match.event_id;
  }

  if (eventId == null) {
    return NextResponse.json(
      {
        error: "could not resolve event_id — pass ?event_id=<n>",
        active_event: active.name,
      },
      { status: 404 },
    );
  }

  // Current-week field + salaries from DataGolf.
  const live = await getDfsPointsForEvent(year, eventId, site, "pga");
  if (!live || live.players.length === 0) {
    return NextResponse.json(
      {
        error: "no field/salaries published yet for this event",
        active_event: active.name,
        event_id: eventId,
      },
      { status: 404 },
    );
  }

  const field: FieldEntry[] = live.players
    .filter((p) => p.player_name && p.salary)
    .map((p) => ({ player_name: p.player_name, salary: p.salary! }));

  // Pull every historical row for these players from our Supabase mirror.
  // Single query keyed on the player list keeps it to one round-trip.
  const playerNames = field.map((f) => f.player_name);
  const { data: pointsRows, error: pErr } = await admin
    .from("dfs_player_points")
    .select("event_id, player_name, salary, ownership_pct")
    .in("player_name", playerNames)
    .eq("site", site);
  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  const eventIds = Array.from(new Set((pointsRows ?? []).map((r) => r.event_id)));
  const { data: eventsRows } = await admin
    .from("dfs_events")
    .select("id, year, course, event_name")
    .in("id", eventIds);

  const eventLookup = new Map(
    (eventsRows ?? []).map((e) => [e.id, e]),
  );

  // Annotate each historical point with its event metadata + event type
  // (derived from our schedule if name matches).
  const allHistory: HistoryRow[] = [];
  for (const r of pointsRows ?? []) {
    const ev = eventLookup.get(r.event_id);
    if (!ev) continue;
    if (r.event_id === `pga-${year}-${eventId}`) continue; // skip the target event itself
    const sched = findEventByName(ev.event_name);
    allHistory.push({
      event_id: r.event_id,
      year: ev.year,
      course: ev.course,
      event_name: ev.event_name,
      event_type: sched?.type ?? null,
      player_name: r.player_name,
      salary: r.salary,
      ownership_pct: r.ownership_pct == null ? null : Number(r.ownership_pct),
    });
  }

  const byPlayer = new Map<string, HistoryRow[]>();
  for (const row of allHistory) {
    const arr = byPlayer.get(row.player_name) ?? [];
    arr.push(row);
    byPlayer.set(row.player_name, arr);
  }

  const projections = projectOwnership(
    {
      course: live.course ?? active.course,
      eventType: active.type,
      year,
    },
    field,
    byPlayer,
    allHistory,
  );

  return NextResponse.json({
    ok: true,
    event: {
      name: live.event_name || active.name,
      course: live.course ?? active.course,
      year,
      event_id: eventId,
      site,
    },
    history_stats: {
      total_rows: allHistory.length,
      players_with_history: byPlayer.size,
      field_size: field.length,
    },
    projections,
  });
}
