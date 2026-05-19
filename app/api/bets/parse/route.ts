import { NextRequest, NextResponse } from "next/server";
import { parseBetSlip } from "@/lib/parsers/screenshot";
import { supabaseServer } from "@/lib/supabase/server";

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
    return NextResponse.json({ bets });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
