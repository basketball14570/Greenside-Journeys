// Inbound-email bet parser.
//
// Postmark / SendGrid Inbound POSTs a JSON payload when a user forwards a bet
// confirmation email to bets+<userToken>@greensideedge.com. We use the
// userToken to identify the account, then hand the email body to Claude to
// extract structured bets — same schema as the screenshot parser.

import { z } from "zod";
import { claude } from "@/lib/claude";
import { ParsedBetSchema, type ParsedBet } from "@/lib/parsers/screenshot";

// Postmark inbound webhook payload (only the fields we care about).
export const PostmarkInboundSchema = z.object({
  From: z.string(),
  FromName: z.string().optional(),
  To: z.string(),
  Subject: z.string(),
  TextBody: z.string().optional(),
  HtmlBody: z.string().optional(),
  Date: z.string().optional(),
  MessageID: z.string(),
});
export type PostmarkInbound = z.infer<typeof PostmarkInboundSchema>;

// User token extraction — bets+abc123@greensideedge.com → "abc123"
export function extractUserToken(toAddress: string): string | null {
  const match = toAddress.match(/bets\+([a-zA-Z0-9_-]+)@/i);
  return match ? match[1] : null;
}

// Heuristic sender → book mapping. We pass this to Claude as a hint; Claude
// confirms by reading the email body.
const SENDER_HINTS: { match: RegExp; book: ParsedBet["book"] }[] = [
  { match: /draftkings\.com|dkng\.co/i, book: "draftkings" },
  { match: /fanduel\.com|fdpiv\.com/i, book: "fanduel" },
  { match: /prizepicks\.com/i, book: "prizepicks" },
  { match: /underdogfantasy\.com|underdog\.io/i, book: "underdog" },
  { match: /caesars\.com|williamhill\.com/i, book: "caesars" },
  { match: /betmgm\.com|mgm\.com/i, book: "betmgm" },
];

function hintBookFromSender(from: string): ParsedBet["book"] | null {
  for (const h of SENDER_HINTS) {
    if (h.match.test(from)) return h.book;
  }
  return null;
}

const SYSTEM_PROMPT = `You extract structured bet data from sportsbook bet-confirmation emails.

You will receive the plain-text or HTML body of an email from a sportsbook
(DraftKings, FanDuel, PrizePicks, Underdog, Caesars, BetMGM). The email
confirms one or more bets the user has placed.

Return ONLY a JSON object matching this shape (no prose, no markdown fences):
{
  "bets": [
    {
      "book": "draftkings" | "fanduel" | "prizepicks" | "underdog" | "caesars" | "betmgm" | "other",
      "player": "Player Name" | "Matchup (e.g. Scheffler vs McIlroy)",
      "market": "Human-readable market (e.g. 'Top 10 Finish', 'Fairways Hit Over 8.5')",
      "line": number or null,
      "americanOdds": signed integer,
      "stake": dollar amount,
      "toWin": dollar amount to win,
      "confidence": 0.0 to 1.0
    }
  ]
}

For multi-leg picks (PrizePicks, Underdog), emit one entry per leg.
If the email is NOT a bet confirmation (promotional, withdrawal, deposit, etc.),
return { "bets": [] }.`;

export async function parseBetEmail(
  email: PostmarkInbound,
): Promise<ParsedBet[]> {
  const hint = hintBookFromSender(email.From);
  const body = email.HtmlBody ?? email.TextBody ?? "";
  if (!body.trim()) return [];

  // Strip HTML tags down to text for cheaper / more reliable parsing.
  const text = email.HtmlBody
    ? email.HtmlBody
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, " ")
        .trim()
    : (email.TextBody ?? "").trim();

  const promptText =
    `From: ${email.From}\nSubject: ${email.Subject}` +
    (hint ? `\nLikely book (from sender domain): ${hint}` : "") +
    `\n\nEmail body:\n${text.slice(0, 8000)}`;

  const res = await claude().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: promptText }],
  });

  const textBlock = res.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return [];

  const raw = textBlock.text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  try {
    const parsed = JSON.parse(raw);
    return z.array(ParsedBetSchema).parse(parsed.bets ?? []);
  } catch {
    return [];
  }
}
