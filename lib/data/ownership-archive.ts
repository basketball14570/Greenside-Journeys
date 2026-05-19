// Dataset-parameterized version of the legacy ownership helpers in
// lib/data/ownership.ts. Same logic, but takes the data as input instead
// of reading from a global const — so the ownership page can hydrate
// from the live Supabase archive on mount and run the same aggregations
// over a much larger dataset (2021-2026, ~300+ events).
//
// We keep the legacy static module untouched so existing consumers
// (DFS optimizer, Ask Greenside tools) stay on the curated 2026-only set.

import type {
  OwnershipMeta,
  TournamentOwnership,
  PlayerHistory,
  CourseHistory,
} from "@/lib/data/ownership";

export type ArchiveDataset = {
  data: Record<string, TournamentOwnership>;
  order: string[]; // tournament names in display order (most recent first)
};

export type ArchiveApiEvent = {
  name: string;
  course: string | null;
  year: number;
  type: string | null;
  par: number | null;
  yards: number | null;
  players: { name: string; salary: number; own: number }[];
};

// Build an ArchiveDataset from the /api/dfs/archive response. Events
// already arrive sorted by date desc, so we just preserve that order.
export function buildArchive(events: ArchiveApiEvent[]): ArchiveDataset {
  const data: Record<string, TournamentOwnership> = {};
  const order: string[] = [];
  for (const ev of events) {
    if (ev.players.length === 0) continue;
    const meta: OwnershipMeta = {
      course: ev.course ?? "—",
      type: (ev.type ?? "full_cut") as OwnershipMeta["type"],
      par: ev.par ?? 0,
      yards: ev.yards ?? 0,
    };
    data[ev.name] = { meta, players: ev.players };
    order.push(ev.name);
  }
  return { data, order };
}

// Fetch + build the dataset. Returns null on any failure so the caller
// can fall back to whatever static dataset it was rendering.
export async function loadArchiveDataset(): Promise<ArchiveDataset | null> {
  try {
    const res = await fetch("/api/dfs/archive", { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { events?: ArchiveApiEvent[] };
    if (!json.events || json.events.length === 0) return null;
    return buildArchive(json.events);
  } catch {
    return null;
  }
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/g, "");
}

function avg(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function listTournaments(
  ds: ArchiveDataset,
): { name: string; meta: OwnershipMeta; count: number }[] {
  return ds.order
    .filter((t) => ds.data[t])
    .map((t) => ({
      name: t,
      meta: ds.data[t].meta,
      count: ds.data[t].players.length,
    }));
}

function buildNameIndex(
  ds: ArchiveDataset,
): Map<string, { tournament: string; entry: { name: string; salary: number; own: number } }[]> {
  const idx = new Map<
    string,
    { tournament: string; entry: { name: string; salary: number; own: number } }[]
  >();
  for (const [tournament, td] of Object.entries(ds.data)) {
    for (const entry of td.players) {
      const key = normalizeName(entry.name);
      const arr = idx.get(key) ?? [];
      arr.push({ tournament, entry });
      idx.set(key, arr);
    }
  }
  return idx;
}

export function getPlayerHistory(
  ds: ArchiveDataset,
  name: string,
  idx?: ReturnType<typeof buildNameIndex>,
): PlayerHistory | null {
  const index = idx ?? buildNameIndex(ds);
  const rows = index.get(normalizeName(name));
  if (!rows || rows.length === 0) return null;
  const history = rows
    .map((r) => ({ tournament: r.tournament, own: r.entry.own, salary: r.entry.salary }))
    .sort((a, b) => ds.order.indexOf(a.tournament) - ds.order.indexOf(b.tournament));
  const owns = history.map((h) => h.own);
  const salaries = history.map((h) => h.salary);
  return {
    name: rows[0].entry.name,
    appearances: history.length,
    avgOwn: avg(owns),
    minOwn: Math.min(...owns),
    maxOwn: Math.max(...owns),
    avgSalary: avg(salaries),
    history,
  };
}

export function listPlayers(ds: ArchiveDataset): PlayerHistory[] {
  const idx = buildNameIndex(ds);
  const out: PlayerHistory[] = [];
  for (const key of idx.keys()) {
    const h = getPlayerHistory(ds, key, idx);
    if (h) out.push(h);
  }
  return out.sort((a, b) => b.avgOwn - a.avgOwn);
}

export function listCourses(
  ds: ArchiveDataset,
): { course: string; eventCount: number; meta: OwnershipMeta }[] {
  const map = new Map<string, { events: number; meta: OwnershipMeta }>();
  for (const t of Object.values(ds.data)) {
    const existing = map.get(t.meta.course);
    if (existing) existing.events++;
    else map.set(t.meta.course, { events: 1, meta: t.meta });
  }
  return [...map.entries()]
    .map(([course, v]) => ({ course, eventCount: v.events, meta: v.meta }))
    .sort((a, b) => b.eventCount - a.eventCount || a.course.localeCompare(b.course));
}

export function getCourseHistory(
  ds: ArchiveDataset,
  course: string,
): CourseHistory | null {
  const events: { tournament: string; meta: OwnershipMeta }[] = [];
  const perPlayer = new Map<
    string,
    { displayName: string; owns: number[]; salaries: number[] }
  >();

  for (const tName of ds.order) {
    const t = ds.data[tName];
    if (!t || t.meta.course !== course) continue;
    events.push({ tournament: tName, meta: t.meta });
    for (const p of t.players) {
      const key = normalizeName(p.name);
      const row = perPlayer.get(key) ?? { displayName: p.name, owns: [], salaries: [] };
      row.owns.push(p.own);
      row.salaries.push(p.salary);
      perPlayer.set(key, row);
    }
  }
  if (events.length === 0) return null;

  const playerStats = [...perPlayer.values()]
    .map((r) => ({
      name: r.displayName,
      appearances: r.owns.length,
      avgOwn: avg(r.owns),
      avgSalary: avg(r.salaries),
      maxOwn: Math.max(...r.owns),
      minOwn: Math.min(...r.owns),
    }))
    .sort((a, b) => b.avgOwn - a.avgOwn);

  return { course, events, playerStats };
}

// Build an ArchiveDataset from the legacy static module, so the page
// has something to render on first paint before the API call resolves.
export function fromLegacy(
  legacyData: Record<string, TournamentOwnership>,
  legacyOrder: string[],
): ArchiveDataset {
  return { data: { ...legacyData }, order: [...legacyOrder] };
}
