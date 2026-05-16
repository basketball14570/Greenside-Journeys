import { NextResponse } from "next/server";
import { buildDailyDigest, renderHtml, renderMarkdown } from "@/lib/newsletter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Daily newsletter endpoint. `?format=` selects the wire format:
//   json (default) — structured for downstream tooling
//   markdown       — paste into Substack / Beehiiv / Discord
//   html           — drop into an email send (Mailgun, Postmark, SendGrid)
//
// Cached at the edge for 15 minutes; previews don't move that fast.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const format = (url.searchParams.get("format") ?? "json").toLowerCase();
  const nl = await buildDailyDigest();

  if (format === "markdown" || format === "md") {
    return new NextResponse(renderMarkdown(nl), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
      },
    });
  }
  if (format === "html") {
    return new NextResponse(renderHtml(nl), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
      },
    });
  }
  return NextResponse.json(nl, {
    headers: {
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
    },
  });
}
