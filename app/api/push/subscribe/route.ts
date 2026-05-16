import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Web Push subscription registry. The browser registers via the service
// worker and POSTs the PushSubscription JSON here. We dedupe by endpoint
// and store the list (multi-device) on profiles.push_subscription.

const SubscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

function supabaseAvailable(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function POST(req: NextRequest) {
  if (!supabaseAvailable()) {
    return NextResponse.json({ error: "supabase not configured" }, { status: 503 });
  }
  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const body = SubscriptionSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "invalid subscription" }, { status: 400 });
  }
  const newSub = body.data;

  const { data: existing } = await supabase
    .from("profiles")
    .select("push_subscription")
    .eq("id", userData.user.id)
    .maybeSingle();

  const current = normalize(existing?.push_subscription);
  // Dedup by endpoint — replace if it already exists, append otherwise.
  const without = current.filter((s) => s.endpoint !== newSub.endpoint);
  const next = [...without, newSub];

  const { error } = await supabase
    .from("profiles")
    .upsert(
      { id: userData.user.id, push_subscription: next },
      { onConflict: "id" },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, count: next.length });
}

export async function DELETE(req: NextRequest) {
  if (!supabaseAvailable()) {
    return NextResponse.json({ error: "supabase not configured" }, { status: 503 });
  }
  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const endpoint = typeof body.endpoint === "string" ? body.endpoint : null;

  const { data: existing } = await supabase
    .from("profiles")
    .select("push_subscription")
    .eq("id", userData.user.id)
    .maybeSingle();
  const current = normalize(existing?.push_subscription);
  const next = endpoint ? current.filter((s) => s.endpoint !== endpoint) : [];

  const { error } = await supabase
    .from("profiles")
    .update({ push_subscription: next.length ? next : null })
    .eq("id", userData.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, count: next.length });
}

type StoredSub = z.infer<typeof SubscriptionSchema>;

function normalize(raw: unknown): StoredSub[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  const out: StoredSub[] = [];
  for (const item of list) {
    const parsed = SubscriptionSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}
