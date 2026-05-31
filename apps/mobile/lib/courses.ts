import Constants from "expo-constants";
import type { LatLng } from "./geo";

// Course-data model for the rangefinder. We only need green target
// points (front / center / back) per hole to compute yardages — the
// minimal shape that still delivers a real rangefinder. Fairway/hazard
// polygons can be layered on later without changing this contract.
export type GreenTargets = {
  front?: LatLng;
  center?: LatLng;
  back?: LatLng;
};

export type Hole = {
  number: number;
  par: number | null;
  green: GreenTargets;
};

export type Course = {
  id: string;
  name: string;
  city?: string;
  holes: Hole[];
  // Where this course's geometry came from, so the UI can be honest
  // about precision (a crowdsourced/sample course vs a licensed one).
  source: "sample" | "open" | "licensed";
};

export type CourseSummary = {
  id: string;
  name: string;
  city?: string;
};

// ── Budget data strategy ─────────────────────────────────────────────
// The course API URL is configurable via app.json -> extra.courseApiUrl.
// Leaving it unset keeps the app on the bundled sample course (zero
// cost, works offline, good for demos and TestFlight). Point it at a
// free provider (OpenGolfAPI / an OSM-derived endpoint) for real
// coverage, or a licensed endpoint later — the screen code doesn't
// change, only the data source does.
const COURSE_API_URL = (Constants.expoConfig?.extra?.courseApiUrl as string | undefined) || null;

// A real, hand-traced sample so the rangefinder is fully functional with
// no data deal in place. Pebble Beach #7 (the famous par-3) and a couple
// neighbors — coordinates approximate, clearly labeled source: "sample".
const SAMPLE_COURSE: Course = {
  id: "sample-pebble",
  name: "Pebble Beach (Sample)",
  city: "Pebble Beach, CA",
  source: "sample",
  holes: [
    {
      number: 7,
      par: 3,
      green: {
        front: { lat: 36.5598, lon: -121.9499 },
        center: { lat: 36.5597, lon: -121.9501 },
        back: { lat: 36.5596, lon: -121.9503 },
      },
    },
    {
      number: 8,
      par: 4,
      green: {
        front: { lat: 36.5619, lon: -121.9462 },
        center: { lat: 36.5621, lon: -121.946 },
        back: { lat: 36.5623, lon: -121.9458 },
      },
    },
    {
      number: 9,
      par: 4,
      green: {
        front: { lat: 36.5652, lon: -121.9475 },
        center: { lat: 36.5654, lon: -121.9477 },
        back: { lat: 36.5656, lon: -121.9479 },
      },
    },
  ],
};

// Narrow an unknown JSON record from a provider into our Course shape.
// Tolerant by design — providers disagree on field names, so we accept a
// few common spellings and skip anything we can't map.
function coerceCourse(raw: unknown): Course | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = String(r.id ?? r.course_id ?? r.slug ?? "");
  const name = String(r.name ?? r.club_name ?? r.course_name ?? "");
  if (!id || !name) return null;

  const holesRaw = Array.isArray(r.holes) ? r.holes : [];
  const holes: Hole[] = holesRaw
    .map((h): Hole | null => {
      if (!h || typeof h !== "object") return null;
      const hr = h as Record<string, unknown>;
      const number = Number(hr.number ?? hr.hole ?? hr.hole_number);
      if (!Number.isFinite(number)) return null;
      const par = Number.isFinite(Number(hr.par)) ? Number(hr.par) : null;
      const green = (hr.green ?? {}) as Record<string, unknown>;
      const pt = (v: unknown): LatLng | undefined => {
        if (!v || typeof v !== "object") return undefined;
        const p = v as Record<string, unknown>;
        const lat = Number(p.lat ?? p.latitude);
        const lon = Number(p.lon ?? p.lng ?? p.longitude);
        return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : undefined;
      };
      return {
        number,
        par,
        green: { front: pt(green.front), center: pt(green.center), back: pt(green.back) },
      };
    })
    .filter((h): h is Hole => h !== null);

  return {
    id,
    name,
    city: typeof r.city === "string" ? r.city : undefined,
    holes,
    source: "open",
  };
}

export async function searchCourses(query: string): Promise<CourseSummary[]> {
  if (!COURSE_API_URL) {
    // Sample-only mode: surface the one bundled course when it matches.
    const q = query.trim().toLowerCase();
    return !q || SAMPLE_COURSE.name.toLowerCase().includes(q)
      ? [{ id: SAMPLE_COURSE.id, name: SAMPLE_COURSE.name, city: SAMPLE_COURSE.city }]
      : [];
  }
  const res = await fetch(`${COURSE_API_URL}/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Course search failed (${res.status})`);
  const json = await res.json();
  const list = Array.isArray(json) ? json : Array.isArray(json?.courses) ? json.courses : [];
  return list
    .map((c: Record<string, unknown>) => ({
      id: String(c.id ?? c.course_id ?? ""),
      name: String(c.name ?? c.club_name ?? c.course_name ?? ""),
      city: typeof c.city === "string" ? c.city : undefined,
    }))
    .filter((c: CourseSummary) => c.id && c.name);
}

export async function getCourse(id: string): Promise<Course | null> {
  if (!COURSE_API_URL || id === SAMPLE_COURSE.id) return SAMPLE_COURSE;
  const res = await fetch(`${COURSE_API_URL}/courses/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Course load failed (${res.status})`);
  return coerceCourse(await res.json());
}

export function isSampleMode(): boolean {
  return !COURSE_API_URL;
}
