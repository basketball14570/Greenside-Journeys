import { NextResponse, type NextRequest } from "next/server";
import { syncDfsYear } from "@/lib/data/dfs-archive-sync";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// On-demand DFS archive refresh. POST { years: [2024, 2025, 2026] }
// pulls those years from DataGolf into Supabase. Restricted to
// signed-in users so a random caller can't kick off a heavy import.
// For a true admin gate, set ADMIN_REFRESH_TOKEN and pass it as
// `Authorization: Bearer <token>` instead.
export async function POST(req: NextRequest) {
  const adminToken = process.env.ADMIN_REFRESH_TOKEN;
  if (adminToken) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${adminToken}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  } else {
    const supabase = supabaseServer();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      return NextResponse.json({ error: "sign in required" }, { status: 401 });
    }
  }

  if (!process.env.DATAGOLF_API_KEY) {
    return NextResponse.json(
      { error: "DATAGOLF_API_KEY not set" },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const years: number[] = Array.isArray(body.years)
    ? body.years.filter((y: unknown): y is number => typeof y === "number")
    : [new Date().getUTCFullYear()];
  const site = body.site === "fanduel" || body.site === "yahoo" ? body.site : "draftkings";

  const results = [];
  for (const y of years) {
    const r = await syncDfsYear(y, { site });
    results.push(r);
  }

  return NextResponse.json({ ok: true, results });
}
