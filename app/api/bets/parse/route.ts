import { NextRequest, NextResponse } from "next/server";
import { parseBetSlip } from "@/lib/parsers/screenshot";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mediaType } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return NextResponse.json({ error: "imageBase64 required" }, { status: 400 });
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
