import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CSV/JSON export of the signed-in user's settled bets. Tax accountants
// love a CSV. Powers the /dashboard/bets "Export" buttons.
//
//   GET /api/bets/export?format=csv   (default)
//   GET /api/bets/export?format=json

type ExportBet = {
  resolved_at: string | null;
  book: string;
  player: string;
  market: string;
  line: number | null;
  stake: number;
  american_odds: number;
  to_win: number;
  status: string;
  resolved_payout: number | null;
  created_at: string;
};

function supabaseAvailable(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function netPnl(b: ExportBet): number {
  if (typeof b.resolved_payout === "number") return Number(b.resolved_payout);
  if (b.status === "won") return Number(b.to_win);
  if (b.status === "lost") return -Number(b.stake);
  return 0;
}

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(bets: ExportBet[]): string {
  const headers = [
    "resolved_at",
    "book",
    "player",
    "market",
    "line",
    "stake_units",
    "american_odds",
    "to_win_units",
    "result",
    "net_pnl_units",
  ];
  const rows = bets.map((b) =>
    [
      b.resolved_at ?? b.created_at,
      b.book,
      b.player,
      b.market,
      b.line ?? "",
      b.stake,
      b.american_odds,
      b.to_win,
      b.status,
      netPnl(b),
    ]
      .map(csvEscape)
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n") + "\n";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const format = (url.searchParams.get("format") ?? "csv").toLowerCase();

  if (!supabaseAvailable()) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("bets")
    .select(
      "resolved_at, book, player, market, line, stake, american_odds, to_win, status, resolved_payout, created_at",
    )
    .eq("user_id", userData.user.id)
    .in("status", ["won", "lost", "void"])
    .order("resolved_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const bets = (data ?? []) as ExportBet[];

  if (format === "json") {
    return NextResponse.json(
      { count: bets.length, bets },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const csv = toCsv(bets);
  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="greenside-bets-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
