import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per-user alert + threshold preferences. Backed by profiles.alert_prefs
// (jsonb) + two numeric columns. RLS lets the user read/write their own
// row, so no service-role client needed.

const PrefsSchema = z.object({
  alert_prefs: z.record(z.boolean()).optional(),
  wind_cutoff_mph: z.number().int().min(0).max(60).optional(),
  ev_cutoff_pct: z.number().int().min(0).max(40).optional(),
});

function supabaseAvailable(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function GET() {
  if (!supabaseAvailable()) {
    return NextResponse.json(
      { configured: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json(
      { configured: true, signedIn: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  const { data, error } = await supabase
    .from("profiles")
    .select("alert_prefs, wind_cutoff_mph, ev_cutoff_pct")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    {
      configured: true,
      signedIn: true,
      alert_prefs: data?.alert_prefs ?? {},
      wind_cutoff_mph: data?.wind_cutoff_mph ?? 15,
      ev_cutoff_pct: data?.ev_cutoff_pct ?? 5,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PUT(req: NextRequest) {
  if (!supabaseAvailable()) {
    return NextResponse.json({ error: "supabase not configured" }, { status: 503 });
  }
  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const body = PrefsSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .upsert(
      { id: userData.user.id, ...body.data },
      { onConflict: "id" },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, ...body.data });
}
