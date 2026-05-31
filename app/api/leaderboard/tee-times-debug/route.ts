import { NextResponse } from "next/server";
import { datagolfEnabled } from "@/lib/data/datagolf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TEMPORARY diagnostic — reveals the raw shape of DataGolf's feeds so we
// can see which field actually carries the live-round tee time. Safe: it
// returns only field NAMES and one sample row, never bulk data, and never
// the API key. Delete once tee-time sourcing is fixed.
export async function GET() {
  if (!datagolfEnabled()) {
    return NextResponse.json({ error: "datagolf not enabled (no key)" });
  }
  const key = process.env.DATAGOLF_API_KEY!;
  const base = "https://feeds.datagolf.com";

  async function probe(path: string, arrayKeys: string[]) {
    try {
      const res = await fetch(`${base}${path}&key=${key}`, { cache: "no-store" });
      if (!res.ok) return { path, status: res.status, error: "non-200" };
      const json = await res.json();
      // Find the first array of player rows under any of the likely keys.
      let rows: unknown = null;
      for (const k of arrayKeys) {
        if (Array.isArray((json as Record<string, unknown>)[k])) {
          rows = (json as Record<string, unknown>)[k];
          break;
        }
      }
      const first = Array.isArray(rows) && rows.length ? rows[0] : null;
      return {
        path,
        status: res.status,
        topLevelKeys: Object.keys(json as Record<string, unknown>),
        rowCount: Array.isArray(rows) ? rows.length : 0,
        // The key question: what fields does a player row actually have?
        sampleRowKeys: first ? Object.keys(first as Record<string, unknown>) : [],
        sampleRow: first,
      };
    } catch (e) {
      return { path, error: e instanceof Error ? e.message : "fetch failed" };
    }
  }

  const [inPlay, fieldUpdates] = await Promise.all([
    probe("/preds/in-play?tour=pga&file_format=json", ["data"]),
    probe("/field-updates?tour=pga&file_format=json", ["field"]),
  ]);

  return NextResponse.json({ inPlay, fieldUpdates }, { status: 200 });
}
