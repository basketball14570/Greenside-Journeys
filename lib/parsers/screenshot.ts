import { z } from "zod";
import { claude, VISION_MODEL } from "@/lib/claude";

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
- "Leaderboard Position" with ↓ N.5  →  market "R1 Top {floor(N)}" (finishing better than position N.5 means a top-N finish). Set line null.
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
          { type: "text", text: "Extract every bet visible in this slip." },
        ],
      },
    ],
  });

  const textBlock = res.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  const raw = textBlock.text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      "Couldn't read the bet slip. If it's a long parlay, screenshot it in 2 shorter images and upload each — they add to the same tickets.",
    );
  }
  const betsField = (parsed as { bets?: unknown })?.bets;
  const result = z.array(ParsedBetSchema).safeParse(betsField);
  if (!result.success) {
    throw new Error(
      "Bet slip didn't match any known sportsbook format — try a sharper crop",
    );
  }
  return result.data;
}
