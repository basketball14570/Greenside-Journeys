import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { parseStandingsCsv } from "@/lib/dfs/payouts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Persists a contest (standings CSV + payout structure + format/round) so it
// can be shared by link. The uploader must be signed in; the row is written
// with the service-role client and read back by anyone via GET /[id].

const PayloadSchema = z.object({
  name: z.string().min(1).max(200),
  fee: z.number().nonnegative().nullable().optional(),
  format: z.enum(["classic", "showdown", "showdown_r4"]),
  round: z.number().int().min(1).max(8).nullable().optional(),
  payoutLadder: z.string().min(1).max(20_000),
  eventName: z.string().max(200).nullable().optional(),
  // ~3,300-entry fields are a few hundred KB; cap generously.
  standingsCsv: z.string().min(1).max(8_000_000),
});

function shareId(): string {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 4);
}

// Lists recently published contests (metadata only — never the big CSV) so
// the Cut Sweat page can show a picker. Public read, same as GET /[id].
export async function GET() {
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ contests: [] });
  const { data, error } = await admin
    .from("dfs_shared_contests")
    .select("id, name, event_name, field_size, format, round, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    return NextResponse.json({ contests: [], error: error.message }, { status: 500 });
  }
  return NextResponse.json(
    {
      contests: (data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        eventName: c.event_name,
        fieldSize: c.field_size,
        format: c.format,
        round: c.round,
        createdAt: c.created_at,
      })),
    },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } },
  );
}

export async function POST(req: NextRequest) {
  const admin = supabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "supabase not configured" }, { status: 503 });
  }

  // Only signed-in users may publish a contest.
  const { data: userData } = await supabaseServer().auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const body = PayloadSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json(
      { error: "invalid payload", issues: body.error.issues.slice(0, 5) },
      { status: 400 },
    );
  }

  // Validate the CSV actually parses into a field before storing it.
  const parsed = parseStandingsCsv(body.data.standingsCsv);
  if (parsed.entries.length === 0) {
    return NextResponse.json({ error: "standings CSV has no entries" }, { status: 400 });
  }

  const id = shareId();
  const { error } = await admin.from("dfs_shared_contests").insert({
    id,
    name: body.data.name,
    entry_fee: body.data.fee ?? null,
    format: body.data.format,
    round: body.data.round ?? null,
    payout_ladder: body.data.payoutLadder,
    event_name: body.data.eventName ?? null,
    standings_csv: body.data.standingsCsv,
    field_size: parsed.entries.length,
    created_by: userData.user.id,
  });

  if (error) {
    console.error("shared contest insert failed", { message: error.message, code: error.code });
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }

  return NextResponse.json({ id, fieldSize: parsed.entries.length });
}
