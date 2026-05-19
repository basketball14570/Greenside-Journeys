import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  fetchDfsPointsWithStatus,
  listDfsEvents,
  type DgDfsPlayerRow,
} from "@/lib/data/datagolf";

export type SyncResult = {
  year: number;
  eventsAttempted: number;
  eventsPersisted: number;
  rowsPersisted: number;
  // event_ids that returned data but no players (off-season probe gaps)
  emptyEventIds: number[];
  // event_ids that returned an HTTP failure or threw
  failedEventIds: number[];
  errors: string[];
};

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

// Sync one year of DFS data from DataGolf into Supabase.
// site=draftkings by default; pass others when DK isn't available.
// If listDfsEvents() returns nothing, falls back to iterating event_id
// 1..maxEventId so we still capture data when the event-list endpoint
// isn't on this DataGolf plan.
export async function syncDfsYear(
  year: number,
  opts: {
    site?: "draftkings" | "fanduel" | "yahoo";
    tour?: string;
    maxEventId?: number;
  } = {},
): Promise<SyncResult> {
  const site = opts.site ?? "draftkings";
  const tour = opts.tour ?? "pga";
  const result: SyncResult = {
    year,
    eventsAttempted: 0,
    eventsPersisted: 0,
    rowsPersisted: 0,
    emptyEventIds: [],
    failedEventIds: [],
    errors: [],
  };

  const admin = supabaseAdmin();
  if (!admin) {
    result.errors.push("supabase admin not configured");
    return result;
  }

  let eventIds: number[] = [];
  const list = await listDfsEvents(year, tour);
  if (list && list.length > 0) {
    eventIds = list.map((e) => e.event_id);
  } else {
    // Probe-based fallback. PGA Tour seasons cap around 50 events.
    const max = opts.maxEventId ?? 60;
    eventIds = Array.from({ length: max }, (_, i) => i + 1);
  }

  for (const eventId of eventIds) {
    result.eventsAttempted++;
    // 200ms between requests keeps us under DataGolf rate limits while
    // still finishing a full year in ~12-15s.
    if (result.eventsAttempted > 1) await sleep(200);

    const { data, status } = await fetchDfsPointsWithStatus(
      year,
      eventId,
      site,
      tour,
    );
    if (status >= 400) {
      result.failedEventIds.push(eventId);
      result.errors.push(`event_id=${eventId} http=${status}`);
      // 429: back off a beat before continuing.
      if (status === 429) await sleep(1500);
      continue;
    }
    if (!data || data.players.length === 0) {
      result.emptyEventIds.push(eventId);
      continue;
    }

    const id = `${tour}-${year}-${eventId}`;
    const { error: eventErr } = await admin.from("dfs_events").upsert(
      {
        id,
        tour,
        year,
        event_id: eventId,
        event_name: data.event_name || `Event ${eventId}`,
        event_date: data.date ?? null,
        course: data.course ?? null,
      },
      { onConflict: "id" },
    );
    if (eventErr) {
      result.errors.push(`event ${id}: ${eventErr.message}`);
      continue;
    }

    const rows = data.players
      .filter((p) => p.player_name)
      .map((p) => rowToRecord(id, site, p));

    // Chunk to avoid hitting the Supabase JSON body cap on large fields.
    const CHUNK = 200;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const { error: insertErr, count } = await admin
        .from("dfs_player_points")
        .upsert(slice, {
          onConflict: "event_id,site,player_name",
          count: "exact",
        });
      if (insertErr) {
        result.errors.push(`points ${id}: ${insertErr.message}`);
      } else if (count != null) {
        result.rowsPersisted += count;
      } else {
        result.rowsPersisted += slice.length;
      }
    }
    result.eventsPersisted++;
  }

  return result;
}

function rowToRecord(eventId: string, site: string, p: DgDfsPlayerRow) {
  return {
    event_id: eventId,
    site,
    player_name: p.player_name,
    dg_id: p.dg_id ?? null,
    salary: p.salary ?? null,
    ownership_pct: p.ownership ?? null,
    dfs_points: p.total_points ?? null,
    fin_text: p.fin_text ?? null,
  };
}
