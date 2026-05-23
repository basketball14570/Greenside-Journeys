import { supabaseAdmin } from "@/lib/supabase/admin";
import type { CourseGuide } from "./types";
import {
  COURSE_GUIDES,
  COURSE_GUIDE_LIST,
  pickCurrentGuide,
} from "./index";

// Merged guide source: hand-authored guides in code + auto-published
// guides from the Supabase `course_guides` table. Static guides win on a
// slug conflict (a human edit always trumps a generated one). All reads
// degrade to static-only when Supabase isn't configured.

async function dbGuides(): Promise<CourseGuide[]> {
  const admin = supabaseAdmin();
  if (!admin) return [];
  const { data, error } = await admin.from("course_guides").select("data");
  if (error || !data) return [];
  return data
    .map((r) => (r as { data: CourseGuide }).data)
    .filter((g): g is CourseGuide => !!g && typeof g.slug === "string");
}

export async function listGuides(): Promise<CourseGuide[]> {
  const byslug = new Map<string, CourseGuide>();
  for (const g of await dbGuides()) byslug.set(g.slug, g);
  for (const g of COURSE_GUIDE_LIST) byslug.set(g.slug, g); // static wins
  return [...byslug.values()].sort((a, b) =>
    a.tournamentStartsAt.localeCompare(b.tournamentStartsAt),
  );
}

export async function getGuide(slug: string): Promise<CourseGuide | null> {
  if (COURSE_GUIDES[slug]) return COURSE_GUIDES[slug];
  const db = await dbGuides();
  return db.find((g) => g.slug === slug) ?? null;
}

export async function currentGuide(now: Date = new Date()): Promise<CourseGuide | null> {
  return pickCurrentGuide(await listGuides(), now);
}

// True if a guide for this slug already exists in code or the DB — used by
// the cron to avoid overwriting a hand-authored guide or regenerating.
export async function guideExists(slug: string): Promise<boolean> {
  if (COURSE_GUIDES[slug]) return true;
  const db = await dbGuides();
  return db.some((g) => g.slug === slug);
}

export async function upsertGuide(
  guide: CourseGuide,
  tournamentId: string | null,
): Promise<boolean> {
  const admin = supabaseAdmin();
  if (!admin) return false;
  const { error } = await admin.from("course_guides").upsert(
    {
      slug: guide.slug,
      tournament_id: tournamentId,
      data: guide,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "slug" },
  );
  return !error;
}
