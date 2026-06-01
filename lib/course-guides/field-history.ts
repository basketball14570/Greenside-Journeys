import {
  datagolfEnabled,
  getFieldUpdates,
  getCourseFieldHistory,
  type CourseHistoryRow,
} from "@/lib/data/datagolf";

export type FieldHistoryResult = {
  rows: CourseHistoryRow[];
  fieldSize: number;
  source: "datagolf" | "unavailable";
};

// Pulls this week's field from DataGolf and joins it against the
// course-history aggregate so the course guide can show "the best
// Memorial performers who are actually teeing it up this week."
//
// Takes a DataGolf event_id (Memorial = 23, etc.) — the historical
// rounds endpoint requires it; tour-only or tour+year both 400.
//
// Best-effort: returns an empty list (with source:"unavailable") when
// the DataGolf key isn't set or either upstream call fails — the guide
// page renders a graceful "history unavailable" state instead of
// breaking the build.
export async function getCourseHistoryForField(
  eventId: number,
  topN = 12,
): Promise<FieldHistoryResult> {
  if (!datagolfEnabled()) {
    return { rows: [], fieldSize: 0, source: "unavailable" };
  }
  try {
    const field = await getFieldUpdates("pga");
    // DataGolf field names arrive as "Last, First"; flip to "First Last"
    // to match the history rows' shape before set comparison.
    const fieldNames = new Set<string>();
    for (const p of field.field) {
      if (typeof p.player_name !== "string") continue;
      const parts = p.player_name.split(",").map((s) => s.trim());
      fieldNames.add(parts.length === 2 ? `${parts[1]} ${parts[0]}` : p.player_name);
    }
    const rows = await getCourseFieldHistory({ eventId, fieldNames, topN });
    return { rows, fieldSize: fieldNames.size, source: "datagolf" };
  } catch {
    return { rows: [], fieldSize: 0, source: "unavailable" };
  }
}
