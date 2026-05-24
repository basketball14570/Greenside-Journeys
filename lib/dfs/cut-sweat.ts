// Cut-sweat core: parse a DraftKings entries CSV, then — given live
// make-cut probabilities — compute each lineup's survival distribution
// (P of exactly k golfers making the cut) and roll it up by contest.
// Pure + deterministic so it's unit-testable without network/DB.

export type DkEntry = {
  entryId: string;
  contest: string;
  contestId: string;
  entryFee: number;
  golfers: string[]; // display names, ID suffix stripped
};

export function normalizeName(s: string): string {
  const base = s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics (é → e)
    .toLowerCase()
    // Standalone Latin letters that don't decompose under NFD — map to ASCII
    // so "Højgaard"/"Olesen" match "Hojgaard"/"Olesen" from a DK export.
    .replace(/ø/g, "o")
    .replace(/ł/g, "l")
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe")
    .replace(/ð/g, "d")
    .replace(/þ/g, "th")
    .replace(/ß/g, "ss")
    .replace(/[ıİ]/g, "i")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  // Drop single-letter tokens (middle initials) so "Jordan L. Smith" and
  // "Jordan Smith" match, then sort the remaining tokens so name ORDER no
  // longer matters: DataGolf's "Scheffler, Scottie" and a DK export's
  // "Scottie Scheffler" both reduce to "scheffler scottie". Without this the
  // live make-cut model silently fails to join to uploaded lineups.
  const tokens = base.split(" ").filter((t) => t.length > 1);
  return (tokens.length > 0 ? tokens : base.split(" ")).sort().join(" ");
}

// "lastname|firstinitial" key, ORDER PRESERVED (normalizeName sorts tokens and
// loses first/last). Used as a fuzzy fallback so a nickname or spelling variant
// still matches: "Zach Bauchou"↔"Zachary Bauchou", "John Keefer"↔"Johnny
// Keefer", "Seung-Yul Noh"↔"Seung Yul Noh".
export function lastInitialKey(raw: string): string {
  const tokens = raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ø/gi, "o")
    .replace(/å/gi, "a")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  if (tokens.length < 2) return "";
  const last = tokens[tokens.length - 1];
  const firstInitial = tokens[0][0];
  return `${last}|${firstInitial}`;
}

// Build a resolver over a set of named records (e.g. live-scoring rows). Tries
// exact token-set match first, then falls back to last-name+first-initial —
// but only when that key is UNIQUE on the source side, so we never match the
// wrong "S. Kim". Lets uploaded lineups join nickname/spelling variants from
// the live feed that normalizeName alone misses.
export function buildNameResolver<T extends { name: string }>(
  records: T[],
): (name: string) => T | null {
  const exact = new Map<string, T>();
  const byLastInitial = new Map<string, T[]>();
  for (const r of records) {
    exact.set(normalizeName(r.name), r);
    const k = lastInitialKey(r.name);
    if (k) {
      const arr = byLastInitial.get(k) ?? [];
      arr.push(r);
      byLastInitial.set(k, arr);
    }
  }
  return (name: string): T | null => {
    const hit = exact.get(normalizeName(name));
    if (hit) return hit;
    const arr = byLastInitial.get(lastInitialKey(name));
    return arr && arr.length === 1 ? arr[0] : null;
  };
}

// Minimal RFC-4180-ish line splitter: handles double-quoted fields that
// contain commas (DK contest names like "...[$30K to 1st, Single Entry]").
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function stripPlayerId(cell: string): string {
  // "Scottie Scheffler (11195220)" → "Scottie Scheffler"
  return cell.replace(/\s*\(\d+\)\s*$/, "").trim();
}

function parseMoney(s: string): number {
  const n = Number(String(s).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function parseEntriesCsv(text: string): DkEntry[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const header = splitCsvLine(lines[0]).map((h) => h.trim());
  const idx = (name: string) =>
    header.findIndex((h) => h.toLowerCase() === name.toLowerCase());

  const iEntry = idx("Entry ID");
  const iContest = idx("Contest Name");
  const iContestId = idx("Contest ID");
  const iFee = idx("Entry Fee");
  // DK repeats the header "G" once per roster slot (6 for golf).
  const golferCols = header.flatMap((h, i) => (h.trim().toUpperCase() === "G" ? [i] : []));

  const out: DkEntry[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cells = splitCsvLine(lines[r]);
    const golfers = golferCols
      .map((c) => stripPlayerId(cells[c] ?? ""))
      .filter((g) => g.length > 0);
    if (golfers.length === 0) continue; // skip blank/non-entry rows
    out.push({
      entryId: (cells[iEntry] ?? "").trim(),
      contest: (cells[iContest] ?? "").trim(),
      contestId: (cells[iContestId] ?? "").trim(),
      entryFee: iFee >= 0 ? parseMoney(cells[iFee] ?? "0") : 0,
      golfers,
    });
  }
  return out;
}

// P(exactly k of n independent golfers make the cut), index = k.
export function survivalDistribution(makeCutProbs: number[]): number[] {
  let dist = [1];
  for (const p of makeCutProbs) {
    const q = Math.min(1, Math.max(0, p));
    const next = new Array(dist.length + 1).fill(0);
    for (let k = 0; k < dist.length; k++) {
      next[k] += dist[k] * (1 - q); // this golfer misses
      next[k + 1] += dist[k] * q; // this golfer makes
    }
    dist = next;
  }
  return dist;
}

// Score margin vs the projected cut line, both to-par. Positive = safe by
// that many shots, negative = that many shots on the wrong side.
export function marginVsCut(scoreToPar: number, cutLineToPar: number): number {
  return cutLineToPar - scoreToPar;
}

export type CutPlayer = {
  makeCutProb: number; // 0..1
  scoreToPar: number | null;
  thru: number | null;
  isCut: boolean;
};
export type CutLookup = Map<string, CutPlayer>;

export type GolferOutlook = {
  name: string;
  found: boolean;
  makeCutProb: number;
  scoreToPar: number | null;
  margin: number | null; // vs cut line
};

export type EntryOutlook = {
  entry: DkEntry;
  golfers: GolferOutlook[];
  distribution: number[]; // index = # making cut
  expectedAlive: number;
  pAllMakeCut: number;
};

export function analyzeEntry(
  entry: DkEntry,
  lookup: CutLookup,
  cutLineToPar: number | null,
): EntryOutlook {
  const golfers: GolferOutlook[] = entry.golfers.map((name) => {
    const hit = lookup.get(normalizeName(name));
    // Unknown golfer → treat as 50/50 so it neither helps nor tanks the
    // estimate; flagged via `found:false` for the UI.
    const makeCutProb = hit ? (hit.isCut ? 0 : hit.makeCutProb) : 0.5;
    const scoreToPar = hit?.scoreToPar ?? null;
    return {
      name,
      found: !!hit,
      makeCutProb,
      scoreToPar,
      margin:
        scoreToPar !== null && cutLineToPar !== null
          ? marginVsCut(scoreToPar, cutLineToPar)
          : null,
    };
  });
  const distribution = survivalDistribution(golfers.map((g) => g.makeCutProb));
  const expectedAlive = golfers.reduce((s, g) => s + g.makeCutProb, 0);
  return {
    entry,
    golfers,
    distribution,
    expectedAlive,
    pAllMakeCut: distribution[distribution.length - 1] ?? 0,
  };
}

export type ContestSummary = {
  contest: string;
  contestId: string;
  entries: number;
  entryFee: number;
  // expected[ k ] = expected number of this contest's entries with exactly
  // k golfers surviving the cut.
  expectedByLevel: number[];
};

export function summarizeByContest(
  entries: DkEntry[],
  lookup: CutLookup,
  cutLineToPar: number | null,
): ContestSummary[] {
  const groups = new Map<string, EntryOutlook[]>();
  for (const e of entries) {
    const o = analyzeEntry(e, lookup, cutLineToPar);
    const key = e.contestId || e.contest;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(o);
  }
  const out: ContestSummary[] = [];
  for (const outlooks of groups.values()) {
    const slots = outlooks[0]?.entry.golfers.length ?? 6;
    const expectedByLevel = new Array(slots + 1).fill(0);
    for (const o of outlooks) {
      for (let k = 0; k < o.distribution.length; k++) {
        expectedByLevel[k] += o.distribution[k];
      }
    }
    const head = outlooks[0].entry;
    out.push({
      contest: head.contest,
      contestId: head.contestId,
      entries: outlooks.length,
      entryFee: head.entryFee,
      expectedByLevel,
    });
  }
  return out.sort((a, b) => b.entries - a.entries);
}
