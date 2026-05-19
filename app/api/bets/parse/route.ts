import { NextRequest, NextResponse } from "next/server";
import { parseBetSlip } from "@/lib/parsers/screenshot";
import { supabaseServer } from "@/lib/supabase/server";
import { checkQuota, bumpUsage } from "@/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 30;

// Hard cap on base64-encoded payload size. 4 MB of base64 ≈ 3 MB of image,
// which covers any reasonable sportsbook screenshot. Anything larger is
// either a non-screenshot file or someone probing for abuse.
const MAX_B64_BYTES = 4 * 1024 * 1024;

export async function POST(req: NextRequest) {
  // Gate on auth — this endpoint hits Claude vision (paid). Anonymous
  // callers could otherwise drain the API budget.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.json({ error: "supabase not configured" }, { status: 503 });
  }
  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  // Quota check before parsing. Free tier hits a daily cap; pro / sharp
  // are unlimited. See lib/usage.ts for the quota table.
  const quota = await checkQuota(userData.user.id, "screenshot_parse");
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: "daily_limit",
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
    await bumpUsage(userData.user.id, "screenshot_parse");
    return NextResponse.json({
      bets,
      usage: { used: quota.used + 1, limit: quota.limit, tier: quota.tier },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
