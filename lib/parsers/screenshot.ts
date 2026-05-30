import { z } from "zod";
import { claude, VISION_MODEL } from "@/lib/claude";

// Carries the raw model response when parsing fails, so the API route can
// surface it for debugging without losing the user-facing error message.
export class BetSlipParseError extends Error {
  rawResponse?: string;
  stage?: "no_text" | "unparseable" | "schema_mismatch";
  schemaIssues?: unknown;
  constructor(
    message: string,
    opts: { rawResponse?: string; stage?: BetSlipParseError["stage"]; schemaIssues?: unknown } = {},
  ) {
    super(message);
    this.rawResponse = opts.rawResponse;
    this.stage = opts.stage;
    this.schemaIssues = opts.schemaIssues;
  }
}

export const ParsedBetSchema = z.object({
  book: z.enum([
    "draftkings",
    "fanduel",
    "prizepicks",
    "underdog",
    "caesars",
    "betmgm",
    "other",
  ]),
  player: z.string(),
  market: z.string(),
  line: z.number().nullable(),
  // Share / pick-em cards often omit per-leg odds and dollar amounts.
  // Keep these nullable so a marketing-style card still validates;
  // downstream save defaults missing values to 0.
  americanOdds: z.number().nullable(),
  stake: z.number().nullable(),
  toWin: z.number().nullable(),
  confidence: z.number().min(0).max(1),
  // Matchup / 3-ball: the OTHER players in the group (not the pick).
  // Folded into the market on save so the leg grades head-to-head.
  others: z.array(z.string()).optional(),
  // Parlay/pick-em total payout multiplier (e.g. 970.65 from "WINS
  // 970.65x", or payout÷entry, or 1+odds/100 for +odds). Same value on
  // every leg of the same slip. Omit for single bets.
  parlayMultiplier: z.number().nullable().optional(),
});
export type ParsedBet = z.infer<typeof ParsedBetSchema>;

const SYSTEM_PROMPT = `You extract structured bet data from sportsbook bet-slip screenshots.

You will receive an image of a bet slip from one of: DraftKings, FanDuel, PrizePicks, Underdog, Caesars, BetMGM.

Return ONLY a JSON object matching this shape (no prose, no markdown fences):
{
  "bets": [
    {
      "book": "draftkings" | "fanduel" | "prizepicks" | "underdog" | "caesars" | "betmgm" | "other",
      "player": "Player Name" | "Matchup (e.g. Scheffler vs McIlroy)",
      "market": "Human-readable market (e.g. 'Top 10 Finish', 'Fairways Hit Over 8.5', 'Round 1 Score Under 69.5')",
      "line": number or null,
      "americanOdds": signed integer (e.g. -110, +220),
      "stake": dollar amount risked,
      "toWin": dollar amount to win (potential payout minus stake),
      "confidence": 0.0 to 1.0 — your confidence in this extraction,
      "others": ["Other Player A", "Other Player B"]  // ONLY for matchup / 3-ball legs; omit otherwise
    }
  ]
}

For PrizePicks / Underdog pick-em style slips, treat each leg as its own bet entry. Set "americanOdds" to the implied per-leg odds if visible, else null. Leave "stake"/"toWin" null when the card doesn't show dollar amounts.

UNDERDOG / PRIZEPICKS SHARE CARDS (player photos, big ↑/↓ arrows, "N correct WINS Nx", maybe a sign-up promo code): IGNORE all marketing/promo/sign-up text. Each player row is one leg. The arrow gives the side: ↑ = Higher (Over), ↓ = Lower (Under). Translate the stat label into a gradeable market, keeping the round (e.g. "R1 – Thu" → round 1):
- "Leaderboard Position" / "Finishing Position" with ↓ N.5 — TWO variants by whether a round indicator is shown next to the stat:
  - With "R1" / "R2" / "R3" / "R4" / "Round 1-4" in the label (e.g. "Better 10.5 R3 Leaderboard Position") → market "R{n} Top {floor(N)}". Round-scoped — settles at the end of that round, not the tournament. Set line null.
  - Without any round indicator → market "Top {floor(N)}" (tournament-long, FINAL finish — NO round prefix). Set line null.
  In both cases ↓ / "Better" / "Lower" / Under is the typical side; ↑ / "Worse" / "Higher" / Over is rare but possible.
- "Make the Cut" / "To Make the Cut" / "Made Cut"  →  market "Make Cut" (↑ / Higher / Yes) or "Miss Cut" (↓ / Lower / No). Tournament-long — NO round prefix. Set line null.
- "Birdies or Better"  →  market "R1 birdies or better over" (↑) / "... under" (↓), line = the number.
- "Bogeys or Worse"  →  market "R1 bogeys or worse under" (↓) / "... over" (↑), line = the number.
- "Round Strokes"  →  market "R1 round score under" (↓) / "... over" (↑), line = the number.
- OUTRIGHT WINNER picks — "Tournament Winner", "{Event} Winner 2026", "To Win the Tournament", "Winner" (often in a separate "Prediction" / "UD Predict" section, shown with NO slider/line and a single selected player) → market "Tournament Winner", line null, NO round prefix. These are outright tournament bets — never label them "Round Strokes", "round score", or any round prop.
If a player name is truncated (e.g. "Rasmus Hojgaa…"), complete it to the full PGA Tour player name.

PARLAY PAYOUT: if the slip is a parlay / pick-em with a total payout multiplier, set "parlayMultiplier" on EVERY leg to that multiplier:
- A shown multiplier like "WINS 970.65x" or "970.65x" → 970.65.
- Combined American odds like "+10565" → 1 + 10565/100 = 106.65.
- A shown entry + payout (e.g. $15 → $14,559.75) → payout ÷ entry = 970.65.
Omit parlayMultiplier for single straight bets.

MATCHUP / 3-BALL / 2-BALL legs (common on Hard Rock, DraftKings, FanDuel):
- These show a group of players (e.g. "Round 1 - Adam Svensson / Dylan Wu / Mac Meissner - 3 Ball") where ONE is the pick. The highlighted/selected name (usually listed first, above the group) is the pick.
- Set "player" to the PICK only (one golfer).
- Set "market" to include the round and matchup type, e.g. "Round 1 3-Ball" or "Round 2 2-Ball".
- Set "others" to an array of the OTHER players in the group (everyone except the pick). For a 3-ball that's 2 names; for a 2-ball that's 1 name.
- Copy player names exactly as written, including punctuation (e.g. "S.Y. Noh").

For each leg, put the round in the market string when the slip names one (e.g. "Round 1 ...").

If you can't read a field, set confidence below 0.7 and your best guess. Never fabricate — leave "line" null if not present.`;

export async function parseBetSlip(
  imageBase64: string,
  mediaType: "image/png" | "image/jpeg" = "image/png",
): Promise<ParsedBet[]> {
  const res = await claude().messages.create({
    model: VISION_MODEL,
    // Long parlays (10-14+ legs) produce a lot of JSON; a tight cap
    // truncates the output mid-object and the parse fails. Give it room.
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
          },
          // Explicit instruction to start the response with "{" — assistant
          // prefill isn't supported on this model, so we lean on the prompt
          // plus the lenient extractor below to recover any prose wrapping.
          {
            type: "text",
            text: "Extract every bet visible in this slip. Respond with ONLY the JSON object, starting with { and ending with }. No prose, no code fences, no preamble.",
          },
        ],
      },
    ],
  });

  const textBlock = res.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new BetSlipParseError("No text response from Claude", {
      stage: "no_text",
      rawResponse: JSON.stringify(res.content).slice(0, 2000),
    });
  }

  const raw = textBlock.text;
  const parsed = extractJson(raw);
  if (parsed === null) {
    console.error("[bet-slip parse] unparseable response:", raw.slice(0, 2000));
    throw new BetSlipParseError(
      "Couldn't read the bet slip. If it's a long parlay, screenshot it in 2 shorter images and upload each — they add to the same tickets.",
      { stage: "unparseable", rawResponse: raw.slice(0, 2000) },
    );
  }
  const betsField = (parsed as { bets?: unknown })?.bets;
  const result = z.array(ParsedBetSchema).safeParse(betsField);
  if (!result.success) {
    console.error(
      "[bet-slip parse] schema mismatch:",
      JSON.stringify(betsField).slice(0, 2000),
      result.error.issues.slice(0, 5),
    );
    throw new BetSlipParseError(
      "Bet slip didn't match any known sportsbook format — try a sharper crop",
      {
        stage: "schema_mismatch",
        rawResponse: JSON.stringify(betsField).slice(0, 2000),
        schemaIssues: result.error.issues.slice(0, 5),
      },
    );
  }
  return result.data;
}

// Try increasingly loose strategies to pull a JSON object out of a model
// response. The strict prompt + assistant prefill should make the first
// attempt always win, but real model output drifts: fences, preamble,
// trailing notes, truncation at max_tokens.
function extractJson(raw: string): unknown | null {
  const trimmed = raw.trim();

  // 1. Strict — fastest path, should hit when prefill worked.
  try {
    return JSON.parse(trimmed);
  } catch {}

  // 2. Strip surrounding code fences if present.
  const fenced = trimmed.replace(/^```(?:json)?\s*|\s*```$/g, "");
  if (fenced !== trimmed) {
    try {
      return JSON.parse(fenced);
    } catch {}
  }

  // 3. Pull the fenced block out of the middle of prose.
  const inner = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (inner) {
    try {
      return JSON.parse(inner[1].trim());
    } catch {}
  }

  // 4. Take everything from the first "{" to the last "}". Handles
  //    "Here's the data: {...}. Hope this helps." style preambles.
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {}
  }

  // 5. Truncated mid-array (hit max_tokens). Walk back to the last
  //    complete leg and close the brackets ourselves.
  if (start !== -1) {
    const head = trimmed.slice(start);
    const lastComplete = head.lastIndexOf("},");
    if (lastComplete > 0) {
      const repaired = head.slice(0, lastComplete + 1) + "]}";
      try {
        return JSON.parse(repaired);
      } catch {}
    }
  }

  return null;
}
