// Tee-time → wave attribution. PGA Tour pairs the field into two waves
// for R1/R2: Wave 1 plays Thursday morning + Friday afternoon; Wave 2
// plays Thursday afternoon + Friday morning. DataGolf's `am_pm` field
// on /field-updates gives us the R1 wave directly; if the tour publishes
// only timestamps, we fall back to a noon-local cutoff.
//
// Combined with the wind forecast (see lib/weather/forecast.ts), this
// tells us which wave plays in materially better conditions over the
// two-round stretch — and which good players are in that wave.

import {
  datagolfEnabled,
  getFieldUpdates,
  getPlayerSkills,
  type DGFieldPlayer,
  type DGPlayerSkill,
} from "@/lib/data/datagolf";

export type WaveAssignment = "wave1" | "wave2" | "unknown";

export type FieldWaveRow = {
  name: string;          // "First Last" display
  dgName: string;        // raw "Last, First" from DataGolf — for joins
  wave: WaveAssignment;
  r1Tee: string | null;
  r2Tee: string | null;
  sgTotal: number | null;
  status: string | null; // "WD" / "DQ" / null
};

export type FieldWaveAttribution = {
  eventName: string | null;
  lastUpdated: string | null;
  rows: FieldWaveRow[];
  wave1: FieldWaveRow[];
  wave2: FieldWaveRow[];
};

function flipName(commaName: string): string {
  const [last, first] = commaName.split(",").map((s) => s.trim());
  return [first, last].filter(Boolean).join(" ");
}

function classifyWave(p: DGFieldPlayer): WaveAssignment {
  if (p.am_pm === "am") return "wave1";
  if (p.am_pm === "pm") return "wave2";
  // Fall back to parsing the R1 tee time. DataGolf has historically used
  // "HH:MM" 24h local; "07:50" → AM, "13:20" → PM. If we get a 12h string
  // (some events) we look for "am" / "pm" suffixes.
  const tee = (p.r1_teetime ?? "").trim().toLowerCase();
  if (!tee) return "unknown";
  if (tee.endsWith("am")) return "wave1";
  if (tee.endsWith("pm")) return "wave2";
  const colon = tee.indexOf(":");
  if (colon > 0) {
    const hour = Number(tee.slice(0, colon));
    if (Number.isFinite(hour)) {
      return hour < 12 ? "wave1" : "wave2";
    }
  }
  return "unknown";
}

// Fetch the field + skill ratings and return a unified wave attribution.
// Returns null when DataGolf isn't configured OR the field hasn't been
// published yet — callers should render a neutral "tee times not out"
// state in that case.
export async function getFieldWaveAttribution(): Promise<FieldWaveAttribution | null> {
  if (!datagolfEnabled()) return null;
  try {
    const [field, skillsList] = await Promise.all([
      getFieldUpdates(),
      getPlayerSkills().catch(() => [] as DGPlayerSkill[]),
    ]);
    if (!field.field.length) return null;

    const skillByName = new Map<string, number>();
    for (const s of skillsList) skillByName.set(s.player_name, s.sg_total);

    const rows: FieldWaveRow[] = field.field
      .filter((p) => {
        const st = (p.status ?? "").toLowerCase();
        return st !== "wd" && st !== "dq" && st !== "out";
      })
      .map((p) => ({
        name: flipName(p.player_name),
        dgName: p.player_name,
        wave: classifyWave(p),
        r1Tee: p.r1_teetime ?? null,
        r2Tee: p.r2_teetime ?? null,
        sgTotal: skillByName.get(p.player_name) ?? null,
        status: p.status ?? null,
      }));

    const sortBySg = (a: FieldWaveRow, b: FieldWaveRow) =>
      (b.sgTotal ?? -99) - (a.sgTotal ?? -99);

    const wave1 = rows.filter((r) => r.wave === "wave1").sort(sortBySg);
    const wave2 = rows.filter((r) => r.wave === "wave2").sort(sortBySg);

    return {
      eventName: field.event_name,
      lastUpdated: field.last_updated,
      rows,
      wave1,
      wave2,
    };
  } catch {
    return null;
  }
}
