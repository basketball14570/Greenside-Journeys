import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getActiveEvent, SEASON_YEAR, findEventByName } from "@/lib/data/pga-schedule";
import { getDfsPointsForEvent, resolveDgEventIdByDate } from "@/lib/data/datagolf";
import {
  projectOwnership,
  type HistoryRow,
  type FieldEntry,
} from "@/lib/dfs/ownership-model";
import { normalizeName } from "@/lib/dfs/cut-sweat";

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
  // Three fallbacks in order:
  //   1. Caller-supplied ?event_id (trust it)
  //   2. Our mirrored dfs_events table by name match (handy for archived
  //      seasons where we already have the row)
  //   3. DataGolf's /get-schedule by start date — works for the current
  //      week even before any local backfill has run.
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
    eventId = await resolveDgEventIdByDate(active.startDate);
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

// POST: project ownership from a caller-supplied field (e.g. a parsed DK
// salaries CSV) instead of DataGolf's DFS feed. This is what makes the
// projection work mid-event — DataGolf's historical-dfs feed doesn't carry an
// in-progress event, but the DK salary file does, and the model is
// deterministic given salaries + our unchanged ownership history.
//
// Body: { field: [{ player_name, salary }], site? }
export async function POST(req: NextRequest) {
  const admin = supabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "supabase admin not configured" },
      { status: 503 },
    );
  }

  let body: { field?: unknown; site?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const site =
    (body.site as "draftkings" | "fanduel" | "yahoo") ?? "draftkings";
  const rawField = Array.isArray(body.field) ? body.field : [];
  const field: FieldEntry[] = rawField
    .map((e) => e as { player_name?: unknown; salary?: unknown })
    .filter(
      (e) => typeof e.player_name === "string" && Number(e.salary) > 0,
    )
    .map((e) => ({ player_name: String(e.player_name), salary: Number(e.salary) }));

  if (field.length === 0) {
    return NextResponse.json(
      { ok: false, error: "no usable rows in uploaded field" },
      { status: 400 },
    );
  }

  const active = getActiveEvent();
  if (!active) {
    return NextResponse.json({ ok: false, error: "no active event" }, { status: 404 });
  }
  const year = SEASON_YEAR;

  // Bound the history pull to recent seasons (the recency half-life is 2y, so
  // 4y back is plenty) and resolve event metadata up front.
  const { data: eventsRows, error: eErr } = await admin
    .from("dfs_events")
    .select("id, year, course, event_name")
    .gte("year", year - 4);
  if (eErr) {
    return NextResponse.json({ ok: false, error: eErr.message }, { status: 500 });
  }
  const eventLookup = new Map((eventsRows ?? []).map((e) => [e.id, e]));
  const recentEventIds = (eventsRows ?? []).map((e) => e.id);

  // Page through the points rows for these events so we're never truncated by
  // the default 1000-row ceiling.
  type PointRow = {
    event_id: number | string;
    player_name: string;
    salary: number | null;
    ownership_pct: number | string | null;
  };
  const pointsRows: PointRow[] = [];
  if (recentEventIds.length > 0) {
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await admin
        .from("dfs_player_points")
        .select("event_id, player_name, salary, ownership_pct")
        .eq("site", site)
        .in("event_id", recentEventIds)
        .range(from, from + PAGE - 1);
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
      pointsRows.push(...((data ?? []) as PointRow[]));
      if (!data || data.length < PAGE) break;
    }
  }

  const activeNorm = normalizeName(active.name);
  const allHistory: HistoryRow[] = [];
  for (const r of pointsRows) {
    const ev = eventLookup.get(r.event_id as number);
    if (!ev) continue;
    if (normalizeName(ev.event_name) === activeNorm) continue; // don't peek at the target event
    const sched = findEventByName(ev.event_name);
    allHistory.push({
      event_id: String(r.event_id),
      year: ev.year,
      course: ev.course,
      event_name: ev.event_name,
      event_type: sched?.type ?? null,
      player_name: r.player_name,
      salary: r.salary,
      ownership_pct: r.ownership_pct == null ? null : Number(r.ownership_pct),
    });
  }

  // Group history by normalized name so DK "First Last" joins DataGolf-format
  // "Last, First" rows, then key it by each field entry's display name.
  const byNorm = new Map<string, HistoryRow[]>();
  for (const row of allHistory) {
    const k = normalizeName(row.player_name);
    const arr = byNorm.get(k) ?? [];
    arr.push(row);
    byNorm.set(k, arr);
  }
  const historyByPlayer = new Map<string, HistoryRow[]>();
  let withHistory = 0;
  for (const f of field) {
    const hist = byNorm.get(normalizeName(f.player_name)) ?? [];
    historyByPlayer.set(f.player_name, hist);
    if (hist.length > 0) withHistory++;
  }

  const projections = projectOwnership(
    { course: active.course, eventType: active.type, year },
    field,
    historyByPlayer,
    allHistory,
  );

  return NextResponse.json({
    ok: true,
    event: { name: active.name, course: active.course, year, event_id: 0, site },
    history_stats: {
      total_rows: allHistory.length,
      players_with_history: withHistory,
      field_size: field.length,
    },
    source: "uploaded_salaries",
    projections,
  });
}
