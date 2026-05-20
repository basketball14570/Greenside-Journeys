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
  americanOdds: z.number(),
  stake: z.number(),
  toWin: z.number(),
  confidence: z.number().min(0).max(1),
  // Matchup / 3-ball: the OTHER players in the group (not the pick).
  // Folded into the market on save so the leg grades head-to-head.
  others: z.array(z.string()).optional(),
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

For PrizePicks / Underdog pick-em style slips, treat each leg as its own bet entry. Set "americanOdds" to the implied per-leg odds if visible, else -120 as a sensible default and lower confidence.

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
    max_tokens: 1500,
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
      "Couldn't read the bet slip — try a clearer screenshot with all fields visible",
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
