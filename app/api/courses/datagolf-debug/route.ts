import { NextResponse } from "next/server";
import { datagolfEnabled } from "@/lib/data/datagolf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TEMPORARY diagnostic — probes the two DataGolf feeds the
// course-history × field section depends on, so we can see why no rows
// are showing up in the guide. Safe: returns counts and a few sample
// names, never bulk data, never the key. Remove once history section
// is verified working.
export async function GET() {
  if (!datagolfEnabled()) {
    return NextResponse.json({ enabled: false, note: "DATAGOLF_API_KEY not set" });
  }
  const key = process.env.DATAGOLF_API_KEY!;
  const base = "https://feeds.datagolf.com";

  // Probe with NO year param (matches the working signature in
  // getPlayerProfile()). The /historical-raw-data/rounds endpoint
  // returns the multi-year archive, which we'll filter client-side.
  async function probeRoundsAllYears() {
    try {
      const url = `${base}/historical-raw-data/rounds?tour=pga&file_format=json&key=${key}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return { call: "no-year", status: res.status, error: "non-200" };
      const json = await res.json();
      const topLevelKeys = Object.keys(json as Record<string, unknown>);
      // The endpoint historically returns either { rounds: [...] } or { data: [...] };
      // surface whichever array we can find plus shape metadata.
      const rows: unknown[] = Array.isArray((json as Record<string, unknown>).rounds)
        ? ((json as { rounds: unknown[] }).rounds)
        : Array.isArray((json as Record<string, unknown>).data)
          ? ((json as { data: unknown[] }).data)
          : [];
      const eventCounts: Record<string, number> = {};
      for (const r of rows) {
        if (!r || typeof r !== "object") continue;
        const ev = (r as Record<string, unknown>).event_name;
        if (typeof ev === "string") eventCounts[ev] = (eventCounts[ev] || 0) + 1;
      }
      const memorialEventNames = Object.keys(eventCounts).filter((e) =>
        e.toLowerCase().includes("memorial"),
      );
      // Count rows per year so we can see if the archive really spans
      // multiple seasons or if it's effectively current-only.
      const yearCounts: Record<string, number> = {};
      for (const r of rows) {
        if (!r || typeof r !== "object") continue;
        const y = (r as Record<string, unknown>).year;
        if (typeof y === "number") yearCounts[String(y)] = (yearCounts[String(y)] || 0) + 1;
      }
      return {
        call: "no-year",
        status: res.status,
        topLevelKeys,
        rowCount: rows.length,
        sampleRowKeys: rows[0] ? Object.keys(rows[0] as Record<string, unknown>) : [],
        totalUniqueEvents: Object.keys(eventCounts).length,
        rowsByYear: yearCounts,
        memorialEventNames: memorialEventNames.map((n) => ({
          name: n,
          count: eventCounts[n],
        })),
      };
    } catch (e) {
      return { call: "no-year", error: e instanceof Error ? e.message : "fetch failed" };
    }
  }

  async function probeField() {
    try {
      const url = `${base}/field-updates?tour=pga&file_format=json&key=${key}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return { status: res.status, error: "non-200" };
      const json = (await res.json()) as Record<string, unknown>;
      const field = Array.isArray(json.field) ? (json.field as Record<string, unknown>[]) : [];
      return {
        status: res.status,
        eventName: json.event_name ?? null,
        currentRound: json.current_round ?? null,
        fieldSize: field.length,
        sampleNames: field.slice(0, 5).map((p) => p.player_name),
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "fetch failed" };
    }
  }

  const [rounds, fieldInfo] = await Promise.all([probeRoundsAllYears(), probeField()]);
  return NextResponse.json({ rounds, field: fieldInfo });
}
