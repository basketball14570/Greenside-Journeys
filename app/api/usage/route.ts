import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { checkQuota, type UsageKind } from "@/lib/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Returns the signed-in user's daily quota state for every Claude-calling
// surface. Drives the "3 of 5 today" badges on the upload + ask pages
// without each page needing its own counter query.
export async function GET() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.json(
      { signedIn: false, configured: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json(
      { signedIn: false, configured: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const kinds: UsageKind[] = ["screenshot_parse", "ask"];
  const results = await Promise.all(
    kinds.map((k) => checkQuota(userData.user!.id, k)),
  );

  const usage = Object.fromEntries(
    kinds.map((k, i) => [
      k,
      {
        used: results[i].used,
        limit: results[i].limit,
        allowed: results[i].allowed,
      },
    ]),
  );

  return NextResponse.json(
    { signedIn: true, tier: results[0].tier, usage },
    { headers: { "Cache-Control": "no-store" } },
  );
}
