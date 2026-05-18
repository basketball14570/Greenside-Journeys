import { NextResponse } from "next/server";
import { SETTLED_BETS } from "@/lib/demo-history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CSV export of settled bets. Tax accountants love a CSV. Powers
// /dashboard/bets "Export" button and any user who wants their full
// history in a spreadsheet.
//
//   GET /api/bets/export?format=csv   (default)
//   GET /api/bets/export?format=json

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(): string {
  const headers = [
    "resolved_at",
    "tournament",
    "book",
    "player",
    "market",
    "line",
    "stake_units",
    "decimal_odds",
    "wave",
    "result",
    "net_pnl_units",
  ];
  const rows = SETTLED_BETS.map((b) =>
    [
      b.resolvedAt,
      b.tournament,
      b.book,
      b.player,
      b.market,
      b.line,
      b.stake,
      b.payout,
      b.wave ?? "",
      b.won ? "won" : "lost",
      b.resolvedPayout,
    ]
      .map(csvEscape)
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n") + "\n";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const format = (url.searchParams.get("format") ?? "csv").toLowerCase();
  if (format === "json") {
    return NextResponse.json(
      { count: SETTLED_BETS.length, bets: SETTLED_BETS },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  }
  const csv = toCsv();
  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="greenside-bets-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
