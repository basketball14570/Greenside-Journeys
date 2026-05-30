// DraftKings lineup CSV exporter. DK's "Import Lineups" wizard accepts a
// classic-format CSV with six golfer columns (G,G,G,G,G,G) where each cell
// must be "Player Name (PlayerID)". We don't carry DK player IDs in our
// salary file — they come from the DK salary CSV the user downloads from
// DraftKings. This module parses that CSV, builds a name → ID map, and
// emits the lineup CSV in the exact format DK expects.
//
// Standard DK PGA salary CSV columns (header row):
//   Position,Name + ID,Name,ID,Roster Position,Salary,Game Info,TeamAbbrev,AvgPointsPerGame

import type { DfsPlayer } from "@/lib/demo-dfs";

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

// Tolerant CSV row splitter — handles a quoted "Name, Suffix" field.
function splitCsvRow(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export type DkIdMap = Map<string, { id: string; nameAndId: string; name: string }>;

// Parse the DK salary CSV and return a Map keyed by normalized player name.
// The values carry both the DK player ID and the exact "Name (ID)" string
// (since DK's own CSV pre-builds that column and it's safer to echo it).
export function parseDkSalaryCsv(text: string): DkIdMap {
  const map: DkIdMap = new Map();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return map;

  const header = splitCsvRow(lines[0]).map((h) => h.toLowerCase());
  const idCol = header.findIndex((h) => h === "id");
  const nameCol = header.findIndex((h) => h === "name");
  const nameAndIdCol = header.findIndex((h) => h === "name + id" || h === "name+id");
  if (nameCol === -1 || idCol === -1) return map;

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvRow(lines[i]);
    const name = cells[nameCol];
    const id = cells[idCol];
    if (!name || !id) continue;
    const nameAndId = nameAndIdCol !== -1 && cells[nameAndIdCol] ? cells[nameAndIdCol] : `${name} (${id})`;
    map.set(normalizeName(name), { id, nameAndId, name });
  }
  return map;
}

export type DkExportResult = {
  csv: string;
  exported: number;
  missing: string[]; // names we couldn't match — surfaced to the user
};

// Build the lineups CSV DK's "Import Lineups" wizard accepts. Every lineup
// becomes one row of six "Name (ID)" cells; a leading header row mirrors
// DK's expected G,G,G,G,G,G column shape.
export function buildDkLineupsCsv(
  lineups: { picks: DfsPlayer[] }[],
  idMap: DkIdMap,
): DkExportResult {
  const missing = new Set<string>();
  const rows: string[] = [];
  rows.push(["G", "G", "G", "G", "G", "G"].join(","));

  let exported = 0;
  for (const lu of lineups) {
    const cells: string[] = [];
    let ok = true;
    for (const p of lu.picks) {
      const hit = idMap.get(normalizeName(p.name));
      if (!hit) {
        missing.add(p.name);
        ok = false;
        cells.push(p.name);
        continue;
      }
      // Quote because some "Name (ID)" values can include commas in suffixes.
      cells.push(`"${hit.nameAndId.replace(/"/g, '""')}"`);
    }
    rows.push(cells.join(","));
    if (ok) exported++;
  }
  return { csv: rows.join("\n"), exported, missing: [...missing] };
}

// Trigger a browser download. Lives here so callers don't repeat the same
// blob-link dance every time.
export function downloadCsv(filename: string, csv: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
