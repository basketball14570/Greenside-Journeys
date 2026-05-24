// Parser for the DraftKings salary export (the "DKSalaries.csv" you download
// from the lineup-upload page). We only need each player's name + salary to
// seed the ownership projection when DataGolf's DFS feed doesn't yet carry the
// in-progress event. Pure + deterministic so it can be unit-tested.

import { splitCsvLine } from "@/lib/dfs/cut-sweat";

export type SalaryEntry = { player_name: string; salary: number };

function stripPlayerId(cell: string): string {
  // "Scottie Scheffler (11195220)" → "Scottie Scheffler"
  return cell.replace(/\s*\(\d+\)\s*$/, "").trim();
}

function parseMoney(s: string): number {
  const n = Number(String(s).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

// Accepts the standard DK salaries CSV. Columns vary slightly between sports
// but always include a "Name" (or "Name + ID") and "Salary" column. We locate
// them by header so column order doesn't matter.
export function parseSalariesCsv(text: string): SalaryEntry[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());

  const iName = header.findIndex((h) => h === "name");
  const iNameId = header.findIndex((h) => h === "name + id");
  const iSalary = header.findIndex((h) => h === "salary");
  if (iSalary < 0 || (iName < 0 && iNameId < 0)) return [];

  const seen = new Set<string>();
  const out: SalaryEntry[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cells = splitCsvLine(lines[r]);
    const rawName = iName >= 0 ? cells[iName] : cells[iNameId];
    const player_name = stripPlayerId(rawName ?? "");
    const salary = parseMoney(cells[iSalary] ?? "0");
    if (!player_name || salary <= 0) continue;
    if (seen.has(player_name)) continue; // dedupe CPT/FLEX duplicate rows
    seen.add(player_name);
    out.push({ player_name, salary });
  }
  return out;
}
