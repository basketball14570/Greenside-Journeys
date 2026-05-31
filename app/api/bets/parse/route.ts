import { NextRequest, NextResponse } from "next/server";
import { parseBetSlip, BetSlipParseError } from "@/lib/parsers/screenshot";
import { getAuthedUser } from "@/lib/supabase/request-auth";
import { checkQuota, bumpUsage, QUOTA_ERROR_CODE } from "@/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 30;

// Hard cap on base64-encoded payload size. 4 MB of base64 ≈ 3 MB of image,
// which covers any reasonable sportsbook screenshot. Anything larger is
// either a non-screenshot file or someone probing for abuse.
const MAX_B64_BYTES = 4 * 1024 * 1024;

export async function POST(req: NextRequest) {
  // Gate on auth — this endpoint hits Claude vision (paid). Anonymous
  // callers could otherwise drain the API budget. Resolves either the
  // SSR cookie session (web) or the Authorization: Bearer header that
  // the native mobile app sends.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.json({ error: "supabase not configured" }, { status: 503 });
  }
  const user = await getAuthedUser(req);
  if (!user) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const quota = await checkQuota(user.id, "screenshot_parse");
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: QUOTA_ERROR_CODE,
        message: `You've used all ${quota.limit} screenshot parses today. Upgrade to Pro for unlimited.`,
        used: quota.used,
        limit: quota.limit,
        tier: quota.tier,
      },
      { status: 429 },
    );
  }

  try {
    const { imageBase64, mediaType } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return NextResponse.json({ error: "imageBase64 required" }, { status: 400 });
    }
    if (imageBase64.length > MAX_B64_BYTES) {
      return NextResponse.json(
        { error: "image too large — keep screenshots under 3 MB" },
        { status: 413 },
      );
    }
    const mt =
      mediaType === "image/jpeg" || mediaType === "image/jpg"
        ? "image/jpeg"
        : "image/png";
    const bets = await parseBetSlip(imageBase64, mt);
    // Only bump after a successful parse so users aren't penalized for
    // upstream Claude errors.
    await bumpUsage(user.id, "screenshot_parse");
    return NextResponse.json({
      bets,
      usage: { used: quota.used + 1, limit: quota.limit, allowed: true, tier: quota.tier },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    // For parse-specific failures, include the raw model response and stage
    // in the body (not user-visible — for devtools/log inspection). Helps
    // diagnose "the message looks the same but I don't know why" cases.
    if (err instanceof BetSlipParseError) {
      return NextResponse.json(
        {
          error: msg,
          debug: {
            stage: err.stage,
            rawResponse: err.rawResponse,
            schemaIssues: err.schemaIssues,
          },
        },
        { status: 500 },
      );
    }
    // Anthropic SDK errors carry a numeric status; surface it in debug so
    // we can tell upstream 4xx (bad model/image/auth) from our own 5xx.
    const status = (err as { status?: number })?.status;
    return NextResponse.json(
      { error: msg, debug: status ? { upstreamStatus: status } : undefined },
      { status: 500 },
    );
  }
}
