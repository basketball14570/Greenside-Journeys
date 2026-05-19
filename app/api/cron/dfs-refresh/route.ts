import { NextResponse } from "next/server";
import { syncDfsYear } from "@/lib/data/dfs-archive-sync";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Weekly refresh: pulls the current PGA Tour season from DataGolf and
// upserts every event we haven't seen yet plus refreshes anything that
// did exist (in case ownership values get back-edited after the fact).
//
// Schedule via vercel.json:
//   { "path": "/api/cron/dfs-refresh", "schedule": "0 12 * * 1" }
//
// Auth: same Bearer ${CRON_SECRET} pattern as the other crons. Vercel
// passes the secret in the Authorization header on scheduled runs.
function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.DATAGOLF_API_KEY) {
    return NextResponse.json(
      { error: "DATAGOLF_API_KEY not set" },
      { status: 503 },
    );
  }
  const year = new Date().getUTCFullYear();
  const result = await syncDfsYear(year);
  return NextResponse.json({ ok: true, result });
}
