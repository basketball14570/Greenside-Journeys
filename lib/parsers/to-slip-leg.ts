import type { SlipLeg } from "@/lib/bet-slip";

// Loose shape — matches what either Claude's vision parser or a
// hand-entered form would produce. The function tolerates any book
// string (normalized via bookFromString).
type ParsedBet = {
  book: string;
  player: string;
  market: string;
  line: number | null;
  americanOdds: number;
  stake: number;
  toWin: number;
  confidence: number;
};

// Map a vision-parsed ParsedBet into the typed SlipLeg shape so the
// live tracker can grade it. Returns null when the market string can't
// be confidently classified — the upload UI surfaces those as
// "needs manual edit" cards.
//
// Classification is text-pattern based: sportsbook market strings
// follow consistent conventions across DK / FD / Hard Rock that we
// can pattern-match. Examples we handle:
//
//   "3 Ball - Spaun / Matsuyama / Homa"     → three_ball
//   "2 Ball - Hovland / Cantlay"             → matchup
//   "Round 2 Matchup: Hovland vs Cantlay"    → matchup
//   "Top 10 Finish"                           → top_n (n=10)
//   "Tournament Winner" / "Outright"          → winner
//   "Round 4 Birdies Over 3.5"                → round_prop
//   "Make the Cut" / "Miss the Cut"           → make_cut

export function parsedBetToSlipLeg(
  b: ParsedBet,
  index: number,
): SlipLeg | null {
  const market = b.market || "";
  const m = market.toLowerCase();
  const id = `imported-${index}-${Date.now()}`;
  const createdAt = new Date().toISOString();
  const book = bookFromString(b.book);

  // Round detection — "Round 2", "R2", "(R2)", "rd 2", etc.
  const roundMatch = m.match(/(?:^|[^a-z])(?:round|rd|r)\s*([1-4])\b/);
  const round = roundMatch ? parseInt(roundMatch[1], 10) : undefined;

  const base = {
    id,
    createdAt,
    player: b.player,
    stake: b.stake || 1,
    americanOdds: b.americanOdds || -110,
    book,
  };

  // 3-ball detection — must come before 2-ball + generic matchup since
  // "3 ball" contains "ball" too.
  if (/\b3[\s-]?ball\b/.test(m) || /\bthree[\s-]?ball\b/.test(m)) {
    const others = extractOthers(market, b.player, 2);
    if (!round || others.length < 2) return null;
    return {
      ...base,
      kind: "three_ball",
      round,
      others: [others[0], others[1]],
    };
  }

  // 2-ball / generic matchup
  if (
    /\b2[\s-]?ball\b/.test(m) ||
    /\btwo[\s-]?ball\b/.test(m) ||
    /\bmatchup\b/.test(m) ||
    /\bh2h\b/.test(m) ||
    / vs /.test(m) ||
    / v\.? /.test(m)
  ) {
    const others = extractOthers(market, b.player, 1);
    if (others.length < 1) return null;
    return {
      ...base,
      kind: "matchup",
      opponent: others[0],
      round,
    };
  }

  // Top N
  const topMatch = m.match(/top\s*(\d{1,2})/);
  if (topMatch) {
    const n = parseInt(topMatch[1], 10);
    if ([5, 10, 20, 30, 40].includes(n)) {
      return { ...base, kind: "top_n", n };
    }
  }

  // Tournament winner / outright
  if (/(tournament\s+)?winner|outright|to\s+win/.test(m)) {
    return { ...base, kind: "winner" };
  }

  // Round props — birdies / bogeys / eagles / strokes / fairways / greens
  const propMatch = m.match(
    /(birdie|bogey|eagle|stroke|fairway|green)s?.*?(over|under|o|u)\s*([0-9.]+)/i,
  );
  if (propMatch && round) {
    const metricRaw = propMatch[1].toLowerCase();
    const side = /^o/i.test(propMatch[2]) ? "over" : "under";
    const line = parseFloat(propMatch[3]);
    const metric = mapMetric(metricRaw);
    if (metric && !isNaN(line)) {
      return { ...base, kind: "round_prop", metric, side, line, round };
    }
  }

  // Alternate format: "Birdies Over 3.5" with line on b.line + round
  // in market text. Catches "Round 2 Birdies" + line=3.5.
  if (round && b.line !== null && /(birdie|bogey|eagle)/.test(m)) {
    const metric = mapMetric(
      (m.match(/(birdie|bogey|eagle)/) || [""])[1],
    );
    if (metric) {
      const side = /under|^u\b/.test(m) ? "under" : "over";
      return { ...base, kind: "round_prop", metric, side, line: b.line, round };
    }
  }

  // Make / miss cut
  if (/make.*cut/.test(m)) return { ...base, kind: "make_cut", side: "make" };
  if (/miss.*cut/.test(m)) return { ...base, kind: "make_cut", side: "miss" };

  return null;
}

// Extract the other player(s) from market strings like:
//   "3 Ball - Spaun / Matsuyama / Homa"
//   "Round 2 - Reed / Grillo / Coody"
//   "Matchup: Hovland vs Cantlay"
// Returns the players that aren't the picked one. `expected` is how
// many companions we expect (1 for 2-ball, 2 for 3-ball).
function extractOthers(market: string, picked: string, expected: number): string[] {
  const pickedNorm = normalizeName(picked);
  // Prefer the slash-delimited group, then "X vs Y", then any sequence
  // of TitleCase words separated by /.
  const slashGroup = market.match(/([A-ZÅÉÖØÆ][\wåéöøæ.'-]+(?:\s+[A-ZÅÉÖØÆ][\wåéöøæ.'-]+)*(?:\s*\/\s*[A-ZÅÉÖØÆ][\wåéöøæ.'-]+(?:\s+[A-ZÅÉÖØÆ][\wåéöøæ.'-]+)*){1,})/);
  if (slashGroup) {
    const names = slashGroup[1]
      .split("/")
      .map((s) => s.trim())
      .filter((s) => s.length > 1);
    const others = names.filter((n) => normalizeName(n) !== pickedNorm);
    if (others.length >= expected) return others.slice(0, expected);
  }
  const vsMatch = market.match(/([A-Z][\w.'-]+(?:\s+[A-Z][\w.'-]+)*)\s+(?:vs|v\.?)\s+([A-Z][\w.'-]+(?:\s+[A-Z][\w.'-]+)*)/i);
  if (vsMatch) {
    const left = vsMatch[1].trim();
    const right = vsMatch[2].trim();
    const candidate = normalizeName(left) === pickedNorm ? right : left;
    return [candidate];
  }
  return [];
}

function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim();
}

function mapMetric(s: string): "birdies" | "bogeys" | "eagles" | "strokes" | "fairways" | "greens" | null {
  const k = s.toLowerCase();
  if (k.startsWith("birdie")) return "birdies";
  if (k.startsWith("bogey")) return "bogeys";
  if (k.startsWith("eagle")) return "eagles";
  if (k.startsWith("stroke")) return "strokes";
  if (k.startsWith("fairway")) return "fairways";
  if (k.startsWith("green")) return "greens";
  return null;
}

function bookFromString(s: string): "DK" | "FD" | "PP" | "UD" {
  const k = s.toLowerCase();
  if (k.includes("draft")) return "DK";
  if (k.includes("fan")) return "FD";
  if (k.includes("prize")) return "PP";
  if (k.includes("under")) return "UD";
  return "DK"; // fallback — the UI surfaces book chip anyway
}
