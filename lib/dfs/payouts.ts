// Contest payout + live-standings parsing for DFS ROI. The DraftKings
// contest-standings CSV holds the entire field (Rank/EntryId/Points/Lineup)
// plus a per-player ownership/points table in the same file. Paired with a
// payout ladder this yields "if it ended now" cash per entry. Pure +
// deterministic for unit testing.

import { splitCsvLine, normalizeName } from "./cut-sweat";

export type PayoutTier = { minRank: number; maxRank: number; prize: number };

// Parses the pasted DK ladder where a rank label line is followed by its
// prize line, e.g. "7th - 8th\n$4,000" or "1,401st - 2,806th\n$45".
export function parsePayoutStructure(text: string): PayoutTier[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const tiers: PayoutTier[] = [];
  const nums = (s: string) =>
    (s.match(/[\d,]+/g) ?? []).map((n) => Number(n.replace(/,/g, ""))).filter(Number.isFinite);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isPrize = /^\$/.test(line);
    if (isPrize) continue; // handled when paired with its rank label
    const rankNums = nums(line);
    if (rankNums.length === 0) continue;
    // The prize is the next line that starts with $.
    const next = lines[i + 1];
    if (!next || !/^\$/.test(next)) continue;
    const prize = nums(next)[0] ?? 0;
    tiers.push({
      minRank: rankNums[0],
      maxRank: rankNums.length > 1 ? rankNums[1] : rankNums[0],
      prize,
    });
  }
  return tiers.sort((a, b) => a.minRank - b.minRank);
}

export function prizeForRank(rank: number, tiers: PayoutTier[]): number {
  const t = tiers.find((t) => rank >= t.minRank && rank <= t.maxRank);
  return t ? t.prize : 0;
}

// DK splits prize money across tied entries: every entry tied at `rank`
// collectively occupies positions [rank, rank+tieCount-1] and each receives
// the average of those positions' prizes.
export function prizeForRankWithTies(rank: number, tieCount: number, tiers: PayoutTier[]): number {
  if (tieCount <= 1) return prizeForRank(rank, tiers);
  let sum = 0;
  for (let pos = rank; pos < rank + tieCount; pos++) sum += prizeForRank(pos, tiers);
  return sum / tieCount;
}

export type StandingEntry = {
  rank: number;
  entryId: string;
  entryName: string;
  points: number;
  golfers: string[];
};
export type StandingPlayer = { name: string; pctDrafted: number; fpts: number };
export type ContestStandings = {
  entries: StandingEntry[];
  players: StandingPlayer[];
  tieCounts: Map<number, number>; // rank → how many entries share it
};

function parseLineup(cell: string): string[] {
  // "G Si Woo Kim G Jordan Spieth G Sungjae Im ..." → six names.
  return cell
    .replace(/^\s*G\s+/, "")
    .split(/\s+G\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function pct(s: string): number {
  const n = Number(String(s).replace(/[%\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function parseStandingsCsv(text: string): ContestStandings {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { entries: [], players: [], tieCounts: new Map() };
  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const iRank = col("rank");
  const iEntryId = col("entryid");
  const iEntryName = col("entryname");
  const iPoints = col("points");
  const iLineup = col("lineup");
  const iPlayer = col("player");
  const iPct = col("%drafted");
  const iFpts = col("fpts");

  const entries: StandingEntry[] = [];
  const players: StandingPlayer[] = [];
  const tieCounts = new Map<number, number>();

  for (let r = 1; r < lines.length; r++) {
    const c = splitCsvLine(lines[r]);
    const rankRaw = c[iRank]?.trim();
    if (rankRaw && /^\d+$/.test(rankRaw)) {
      const rank = Number(rankRaw);
      entries.push({
        rank,
        entryId: (c[iEntryId] ?? "").trim(),
        entryName: (c[iEntryName] ?? "").trim(),
        points: Number(c[iPoints] ?? 0) || 0,
        golfers: iLineup >= 0 ? parseLineup(c[iLineup] ?? "") : [],
      });
      tieCounts.set(rank, (tieCounts.get(rank) ?? 0) + 1);
    }
    if (iPlayer >= 0) {
      const name = (c[iPlayer] ?? "").trim();
      if (name) {
        players.push({
          name,
          pctDrafted: iPct >= 0 ? pct(c[iPct] ?? "") : 0,
          fpts: iFpts >= 0 ? Number(c[iFpts] ?? 0) || 0 : 0,
        });
      }
    }
  }
  return { entries, players, tieCounts };
}

export type RoiResult = {
  entries: number;
  fees: number;
  prizes: number;
  net: number;
  roi: number;
  cashes: number;
  detail: { entryId: string; entryName: string; rank: number; prize: number }[];
};

// "If it ended now" cash for a set of the user's entries (matched out of the
// full standings), using current ranks + payout ladder.
export function currentRoi(
  mine: StandingEntry[],
  tiers: PayoutTier[],
  tieCounts: Map<number, number>,
  entryFee: number,
): RoiResult {
  const detail = mine.map((e) => ({
    entryId: e.entryId,
    entryName: e.entryName,
    rank: e.rank,
    prize: prizeForRankWithTies(e.rank, tieCounts.get(e.rank) ?? 1, tiers),
  }));
  const prizes = detail.reduce((s, d) => s + d.prize, 0);
  const fees = mine.length * entryFee;
  const cashes = detail.filter((d) => d.prize > 0).length;
  return {
    entries: mine.length,
    fees,
    prizes,
    net: prizes - fees,
    roi: fees ? (prizes - fees) / fees : 0,
    cashes,
    detail,
  };
}

export type ProjectedEntry = StandingEntry & {
  projectedPoints: number;
  projectedRank: number;
  matchedGolfers: number; // how many of the 6 had a live point value
};

// Recompute every entry's total from a per-golfer points map and re-rank the
// whole field. Standard competition ranking (1,2,2,4) so ties share a rank.
// Golfers missing from the map contribute 0 and lower `matchedGolfers`, which
// flags an entry whose projection is incomplete.
export function reRankField(
  field: StandingEntry[],
  pointsByName: Map<string, number>,
): { ranked: ProjectedEntry[]; tieCounts: Map<number, number> } {
  const scored: ProjectedEntry[] = field.map((e) => {
    let pts = 0;
    let matched = 0;
    for (const g of e.golfers) {
      const p = pointsByName.get(normalizeName(g));
      if (p !== undefined) {
        pts += p;
        matched++;
      }
    }
    return { ...e, projectedPoints: +pts.toFixed(2), projectedRank: 0, matchedGolfers: matched };
  });

  scored.sort((a, b) => b.projectedPoints - a.projectedPoints);
  const tieCounts = new Map<number, number>();
  let rank = 0;
  let prev: number | null = null;
  scored.forEach((e, i) => {
    if (prev === null || e.projectedPoints < prev) {
      rank = i + 1;
      prev = e.projectedPoints;
    }
    e.projectedRank = rank;
    tieCounts.set(rank, (tieCounts.get(rank) ?? 0) + 1);
  });
  return { ranked: scored, tieCounts };
}

export type ProjectedRoiResult = RoiResult & {
  // golfers across the user's entries that we had no live point for
  unmatchedGolfers: string[];
};

// Projected "where it's heading" ROI: re-rank the field from live points,
// then price the user's entries at their PROJECTED ranks.
export function projectedRoi(
  field: StandingEntry[],
  pointsByName: Map<string, number>,
  opts: { entryIds?: Set<string>; username?: string },
  tiers: PayoutTier[],
  entryFee: number,
): ProjectedRoiResult {
  const { ranked, tieCounts } = reRankField(field, pointsByName);
  const useIds = !!opts.entryIds && opts.entryIds.size > 0;
  const wantUser = opts.username ? normalizeName(opts.username.replace(/\s*\(.*$/, "")) : null;
  const mine = ranked.filter((e) => {
    if (useIds) return opts.entryIds!.has(e.entryId);
    if (wantUser) return normalizeName(e.entryName.replace(/\s*\(.*$/, "")) === wantUser;
    return false;
  });
  const detail = mine.map((e) => ({
    entryId: e.entryId,
    entryName: e.entryName,
    rank: e.projectedRank,
    prize: prizeForRankWithTies(e.projectedRank, tieCounts.get(e.projectedRank) ?? 1, tiers),
  }));
  const prizes = detail.reduce((s, d) => s + d.prize, 0);
  const fees = mine.length * entryFee;

  const unmatched = new Set<string>();
  for (const e of mine)
    for (const g of e.golfers)
      if (!pointsByName.has(normalizeName(g))) unmatched.add(g);

  return {
    entries: mine.length,
    fees,
    prizes,
    net: prizes - fees,
    roi: fees ? (prizes - fees) / fees : 0,
    cashes: detail.filter((d) => d.prize > 0).length,
    detail,
    unmatchedGolfers: [...unmatched],
  };
}

// Find the user's entries within the full field by EntryId (preferred) or,
// failing that, by a username prefix on EntryName (DK appends "(33/150)").
export function findMyEntries(
  standings: StandingEntry[],
  opts: { entryIds?: Set<string>; username?: string },
): StandingEntry[] {
  if (opts.entryIds && opts.entryIds.size > 0) {
    return standings.filter((e) => opts.entryIds!.has(e.entryId));
  }
  if (opts.username) {
    const u = normalizeName(opts.username.replace(/\s*\(.*$/, ""));
    return standings.filter((e) => normalizeName(e.entryName.replace(/\s*\(.*$/, "")) === u);
  }
  return [];
}
