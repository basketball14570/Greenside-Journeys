import { NextResponse } from "next/server";
import { datagolfEnabled } from "@/lib/data/datagolf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TEMPORARY diagnostic — probes the DataGolf historical endpoints to
// figure out the exact parameter shape that returns rounds. Prior runs
// confirmed: tour-only and tour+year both 400. The remaining likely
// signature is tour+year+event_id (Memorial = 23 per DataGolf's own
// URL). Also probes /historical-raw-data/event-list so we can look up
// IDs for other tournaments. Safe: counts + a few sample names only.
export async function GET() {
  if (!datagolfEnabled()) {
    return NextResponse.json({ enabled: false, note: "DATAGOLF_API_KEY not set" });
  }
  const key = process.env.DATAGOLF_API_KEY!;
  const base = "https://feeds.datagolf.com";

  // Generic probe helper — runs the URL, returns status + payload keys
  // + an optional sample row + a found-array length so we can see at a
  // glance which call shape DataGolf is happy with.
  async function probe(label: string, path: string, params: Record<string, string>) {
    const search = new URLSearchParams({ ...params, file_format: "json", key });
    const url = `${base}${path}?${search.toString()}`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        // Pull a short body snippet so we can see DataGolf's own error
        // message, which usually names the missing parameter directly.
        const body = await res.text().catch(() => "");
        return {
          label,
          status: res.status,
          error: body.slice(0, 240) || "non-200",
        };
      }
      const json = (await res.json()) as Record<string, unknown>;
      const topLevelKeys = Object.keys(json);
      // Find the first array under any plausible key.
      const arrayKey = ["rounds", "data", "events", "event_list", "field"].find(
        (k) => Array.isArray(json[k]),
      );
      const rows = arrayKey ? (json[arrayKey] as unknown[]) : [];
      const first = rows[0] && typeof rows[0] === "object" ? (rows[0] as Record<string, unknown>) : null;
      return {
        label,
        status: res.status,
        topLevelKeys,
        arrayKey,
        rowCount: rows.length,
        sampleRowKeys: first ? Object.keys(first) : [],
        sampleRow: first,
      };
    } catch (e) {
      return { label, error: e instanceof Error ? e.message : "fetch failed" };
    }
  }

  const [eventList2024, roundsMemorial2024, roundsMemorial2023, field] = await Promise.all([
    probe("event-list 2024", "/historical-raw-data/event-list", { tour: "pga", year: "2024" }),
    probe("rounds 2024 + event_id=23 (Memorial)", "/historical-raw-data/rounds", {
      tour: "pga",
      year: "2024",
      event_id: "23",
    }),
    probe("rounds 2023 + event_id=23 (Memorial)", "/historical-raw-data/rounds", {
      tour: "pga",
      year: "2023",
      event_id: "23",
    }),
    probe("field-updates", "/field-updates", { tour: "pga" }),
  ]);

  return NextResponse.json(
    { eventList2024, roundsMemorial2024, roundsMemorial2023, field },
    { status: 200 },
  );
}
