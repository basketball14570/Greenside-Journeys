import { NextResponse, type NextRequest } from "next/server";
import {
  PostmarkInboundSchema,
  extractUserToken,
  parseBetEmail,
} from "@/lib/parsers/email";

export const runtime = "nodejs";
export const maxDuration = 30;

// Postmark Inbound webhook. Configure Postmark to POST to /api/email/inbound
// with HTTP Basic auth using POSTMARK_INBOUND_TOKEN as the password.
// Once Supabase is provisioned this endpoint also writes parsed bets to the
// `bets` table scoped to the user identified by the +token in the To address.
export async function POST(req: NextRequest) {
  const token = process.env.POSTMARK_INBOUND_TOKEN;
  if (token) {
    const auth = req.headers.get("authorization") ?? "";
    const expected = "Basic " + Buffer.from(`postmark:${token}`).toString("base64");
    if (auth !== expected) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const payload = PostmarkInboundSchema.safeParse(await req.json());
  if (!payload.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const userToken = extractUserToken(payload.data.To);
  if (!userToken) {
    // Not addressed to bets+<token>@…  — silently accept to avoid bounces.
    return NextResponse.json({ accepted: false, reason: "no user token" });
  }

  const bets = await parseBetEmail(payload.data);

  // TODO(supabase): look up user by token, write bets to DB, broadcast via
  // realtime so the dashboard updates without a refresh.
  return NextResponse.json({
    accepted: true,
    userToken,
    messageId: payload.data.MessageID,
    parsedCount: bets.length,
    bets,
  });
}
