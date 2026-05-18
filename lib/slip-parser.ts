// Slip-paste import. Takes free-form text from a DraftKings / FanDuel /
// PrizePicks / Underdog bet slip (copy-pasted by the user or OCR'd from a
// screenshot) and returns an array of SlipLeg candidates. Parses
// heuristically — markets vary across books, so the regex is permissive
// and falls back to flagging ambiguous lines for the user.
//
// This module is intentionally separate from the slip-store and UI so it
// can be unit-tested and reused by the screenshot-OCR ingestion path.

import type { SlipLeg } from "@/lib/bet-slip";

// Distributive omit preserves the discriminated union across "kind" narrowing.
type DistributiveOmit<T, K extends keyof T> = T extends T ? Omit<T, K> : never;
type Parsed = DistributiveOmit<SlipLeg, "id" | "createdAt">;

const STAKE_RX = /(?:stake|risk|wager|bet)[:\s]+\$?(\d+(?:\.\d+)?)/i;
const ODDS_RX = /(?<![\d.])([+-]\d{2,5})(?![\d.])/;

export function parseSlipText(input: string): {
  parsed: Parsed[];
  rejected: { line: string; reason: string }[];
} {
  const parsed: Parsed[] = [];
  const rejected: { line: string; reason: string }[] = [];

  // Split into logical chunks. Sportsbook UIs typically put one bet per
  // 2-3 lines; we treat blank lines as chunk separators. Also fold
  // "market" + "selection" pairs (common on PrizePicks) onto one line.
  const chunks = chunkify(input);

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    const leg = parseOne(trimmed);
    if (leg) parsed.push(leg);
    else rejected.push({ line: trimmed.slice(0, 120), reason: "No grader matched" });
  }
  return { parsed, rejected };
}

function chunkify(text: string): string[] {
  // Normalize whitespace, strip currency symbols, collapse multi-blank
  // lines into a single separator.
  const norm = text
    .replace(/\r\n?/g, "\n")
    .replace(/ /g, " ")
    .replace(/–|—/g, "-");
  return norm.split(/\n{2,}/).map((s) => s.replace(/\n+/g, " ").trim());
}

function parseOne(line: string): Parsed | null {
  const player = extractPlayer(line);
  if (!player) return null;

  const stake = numberFrom(STAKE_RX, line) ?? 1;
  const odds = parseAmericanOdds(line) ?? -110;
  const book = detectBook(line);
  const base = { player, stake, americanOdds: odds, book } as const;

  // Order matters — most specific first.
  const matchup = matchMatchup(line, base);
  if (matchup) return matchup;

  const threeBall = matchThreeBall(line, base);
  if (threeBall) return threeBall;

  const prop = matchRoundProp(line, base);
  if (prop) return prop;

  const cut = matchMakeCut(line, base);
  if (cut) return cut;

  const topN = matchTopN(line, base);
  if (topN) return topN;

  const winner = matchWinner(line, base);
  if (winner) return winner;

  return null;
}

// ── Extractors ───────────────────────────────────────────────────

function extractPlayer(line: string): string | null {
  // Heuristic: the first two consecutive Capitalized tokens with at least
  // one being 3+ chars. Skips known leading prefixes like "TO WIN", "TOP",
  // and bookmaker names.
  const stripped = line
    .replace(/^\s*(to win|top\s*\d+|outright|matchup|3\s*ball|round\s*\d|r\d|over|under|o\d|u\d)\s*[:\-]?\s*/i, "")
    .replace(/^[a-z]{1,3}\s+/i, ""); // strip "DK", "FD" prefixes
  const tokens = stripped.split(/[\s,/]+/).filter(Boolean);
  const out: string[] = [];
  for (const t of tokens) {
    if (/^[A-Z][A-Za-zÀ-ÿ.'’-]{1,}$/.test(t) && t.toLowerCase() !== "tour") {
      out.push(t);
      if (out.length === 2 && (out[0].length >= 3 || out[1].length >= 3)) break;
    } else if (out.length >= 1) {
      // Stop on a non-name token after we've started; helps with
      // "Scottie Scheffler -120" — we stop at the -120.
      break;
    }
  }
  if (out.length < 1) return null;
  return out.join(" ");
}

function parseAmericanOdds(line: string): number | null {
  const m = line.match(ODDS_RX);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (Number.isNaN(n)) return null;
  // Filter out year-like numbers e.g. +2026
  if (Math.abs(n) > 5000) return null;
  return n;
}

function numberFrom(rx: RegExp, line: string): number | null {
  const m = line.match(rx);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) ? n : null;
}

function detectBook(line: string): string {
  const l = line.toLowerCase();
  if (/draftkings|\bdk\b/.test(l)) return "DK";
  if (/fanduel|\bfd\b/.test(l)) return "FD";
  if (/prizepicks|\bpp\b/.test(l)) return "PP";
  if (/underdog|\bud\b/.test(l)) return "UD";
  if (/caesars|\bcz\b/.test(l)) return "CZR";
  if (/betmgm|\bmgm\b/.test(l)) return "MGM";
  return "";
}

// ── Market matchers ──────────────────────────────────────────────

function matchTopN(
  line: string,
  base: { player: string; stake: number; americanOdds: number; book?: string },
): Parsed | null {
  const m = line.match(/top[-\s]*(\d{1,3})/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (![3, 5, 10, 20, 30, 40, 50].includes(n)) return null;
  return { kind: "top_n", ...base, n };
}

function matchWinner(
  line: string,
  base: { player: string; stake: number; americanOdds: number; book?: string },
): Parsed | null {
  if (!/\b(to\s*win|outright|winner|tournament\s*winner)\b/i.test(line)) return null;
  return { kind: "winner", ...base };
}

function matchMatchup(
  line: string,
  base: { player: string; stake: number; americanOdds: number; book?: string },
): Parsed | null {
  // "Scheffler vs McIlroy" / "Scheffler over McIlroy" — pull the opponent.
  const m = line.match(
    /([A-Z][A-Za-zÀ-ÿ.'’-]+(?:\s[A-Z][A-Za-zÀ-ÿ.'’-]+)?)\s+(?:vs?\.?|over|to beat|against)\s+([A-Z][A-Za-zÀ-ÿ.'’-]+(?:\s[A-Z][A-Za-zÀ-ÿ.'’-]+)?)/,
  );
  if (!m) return null;
  const round = parseRound(line);
  return {
    kind: "matchup",
    ...base,
    player: m[1],
    opponent: m[2],
    round: round ?? undefined,
  };
}

function matchThreeBall(
  line: string,
  base: { player: string; stake: number; americanOdds: number; book?: string },
): Parsed | null {
  if (!/\b3\s*ball|three\s*ball\b/i.test(line)) return null;
  // Try to find three names separated by slashes or commas.
  const names = (line.match(/[A-Z][A-Za-zÀ-ÿ.'’-]+(?:\s[A-Z][A-Za-zÀ-ÿ.'’-]+)/g) ?? []).slice(0, 3);
  if (names.length < 3) return null;
  const round = parseRound(line) ?? 1;
  return {
    kind: "three_ball",
    ...base,
    player: names[0],
    others: [names[1], names[2]],
    round,
  };
}

function matchRoundProp(
  line: string,
  base: { player: string; stake: number; americanOdds: number; book?: string },
): Parsed | null {
  const round = parseRound(line);
  if (round === null) return null;
  const overUnder = line.match(/\b(over|under|o|u)\s*(\d+(?:\.\d+)?)/i);
  if (!overUnder) return null;
  const side: "over" | "under" = /^o/i.test(overUnder[1]) ? "over" : "under";
  const lineN = parseFloat(overUnder[2]);
  const metric =
    /birdie/i.test(line)
      ? ("birdies" as const)
      : /bogey/i.test(line)
        ? ("bogeys" as const)
        : /eagle/i.test(line)
          ? ("eagles" as const)
          : /fairway|fir/i.test(line)
            ? ("fairways" as const)
            : /green.*regulation|\bgir\b/i.test(line)
              ? ("greens" as const)
              : ("strokes" as const);
  return {
    kind: "round_prop",
    ...base,
    round,
    side,
    line: lineN,
    metric,
  };
}

function matchMakeCut(
  line: string,
  base: { player: string; stake: number; americanOdds: number; book?: string },
): Parsed | null {
  if (/\bmake\s*(the\s*)?cut\b/i.test(line)) return { kind: "make_cut", ...base, side: "make" };
  if (/\bmiss\s*(the\s*)?cut\b/i.test(line)) return { kind: "make_cut", ...base, side: "miss" };
  return null;
}

function parseRound(line: string): number | null {
  const m = line.match(/\br\s*([1-4])\b|round\s*([1-4])/i);
  if (!m) return null;
  return parseInt(m[1] ?? m[2], 10);
}
