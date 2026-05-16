import { NextResponse } from "next/server";
import { buildDailyDigest, renderMarkdown, renderHtml } from "@/lib/newsletter";
import { dispatchAll } from "@/lib/notify/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Vercel cron handler — builds the daily digest and fans it out to every
// configured webhook (Discord / Slack / generic). Schedule with vercel.json:
//
//   { "crons": [{ "path": "/api/cron/newsletter", "schedule": "0 13 * * *" }] }
//
// Vercel posts a GET with the header `Authorization: Bearer ${CRON_SECRET}`
// — we verify it when CRON_SECRET is set so random callers can't trigger
// notifications.

function authorized(req: Request): { ok: true } | { ok: false; reason: string } {
  const secret = process.env.CRON_SECRET;
  if (!secret) return { ok: true };
  const auth = req.headers.get("authorization") ?? "";
  if (auth === `Bearer ${secret}`) return { ok: true };
  return { ok: false, reason: "Bad or missing CRON_SECRET" };
}

export async function GET(req: Request) {
  const gate = authorized(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: 401 });
  }

  const nl = await buildDailyDigest();
  const markdown = renderMarkdown(nl);
  const html = renderHtml(nl);
  const origin = new URL(req.url).origin;

  const outcomes = await dispatchAll({
    title: nl.title,
    markdown,
    html,
    url: `${origin}/dashboard/newsletter`,
  });

  const anyOk = outcomes.some((o) => o.ok);
  return NextResponse.json(
    {
      sent: anyOk,
      sections: nl.sections.length,
      generated_at: nl.generatedAt,
      outcomes,
    },
    { status: anyOk ? 200 : 502 },
  );
}

// POST mirrors GET so you can curl from a non-Vercel scheduler.
export const POST = GET;
