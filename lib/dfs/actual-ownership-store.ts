import { supabaseAdmin } from "@/lib/supabase/admin";

// Shared "actual %Drafted" entries for an event. The Ownership Accuracy
// tool used to live entirely in the typer's browser; this store persists
// the latest paste so anyone visiting the page sees the same numbers.
//
// Schema lives in db/migrations/005_actual_ownership.sql.

export type ActualOwnershipEntry = { name: string; own: number };

export type SavedActualOwnership = {
  eventKey: string;
  eventName: string;
  rawText: string;
  entries: ActualOwnershipEntry[];
  updatedAt: string;
  updatedBy: string | null;
};

// Stable key for an event name. Lowercased, alphanumerics-only with dashes,
// so "Charles Schwab Challenge" -> "charles-schwab-challenge".
export function eventKeyFor(eventName: string): string {
  return eventName
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getActualOwnership(
  eventName: string,
): Promise<SavedActualOwnership | null> {
  const admin = supabaseAdmin();
  if (!admin) return null;
  const key = eventKeyFor(eventName);
  const { data, error } = await admin
    .from("actual_ownership")
    .select("event_key, event_name, raw_text, entries, updated_at, updated_by")
    .eq("event_key", key)
    .maybeSingle();
  if (error || !data) return null;
  return {
    eventKey: data.event_key,
    eventName: data.event_name,
    rawText: data.raw_text,
    entries: Array.isArray(data.entries) ? data.entries : [],
    updatedAt: data.updated_at,
    updatedBy: data.updated_by ?? null,
  };
}

export async function saveActualOwnership(args: {
  eventName: string;
  rawText: string;
  entries: ActualOwnershipEntry[];
  updatedBy: string | null;
}): Promise<boolean> {
  const admin = supabaseAdmin();
  if (!admin) return false;
  const key = eventKeyFor(args.eventName);
  const { error } = await admin.from("actual_ownership").upsert(
    {
      event_key: key,
      event_name: args.eventName,
      raw_text: args.rawText,
      entries: args.entries,
      updated_at: new Date().toISOString(),
      updated_by: args.updatedBy,
    },
    { onConflict: "event_key" },
  );
  return !error;
}
