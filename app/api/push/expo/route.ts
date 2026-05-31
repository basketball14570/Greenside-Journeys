import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthedUser } from "@/lib/supabase/request-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Expo Push token registry — sibling to /api/push/subscribe (web push).
// The native app calls this on every foreground; we upsert on the token
// itself so duplicate calls are no-ops and a re-installed app naturally
// replaces its prior entry.
//
// Tokens are stored as a jsonb array on profiles.expo_push_tokens:
//   [{ token, platform, updated_at }]
// The grading cron walks both push_subscription (web) and
// expo_push_tokens (native) when fanning notifications.

const BodySchema = z.object({
  token: z
    .string()
    .min(1)
    .refine((t) => t.startsWith("ExponentPushToken[") || t.startsWith("ExpoPushToken["), {
      message: "Not an Expo push token",
    }),
  platform: z.enum(["ios", "android"]),
});

type StoredToken = {
  token: string;
  platform: "ios" | "android";
  updated_at: string;
};

function supabaseAvailable(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function normalize(raw: unknown): StoredToken[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry): StoredToken | null => {
      if (!entry || typeof entry !== "object") return null;
      const e = entry as Record<string, unknown>;
      if (typeof e.token !== "string") return null;
      const platform = e.platform === "ios" || e.platform === "android" ? e.platform : null;
      if (!platform) return null;
      const updated_at = typeof e.updated_at === "string" ? e.updated_at : new Date().toISOString();
      return { token: e.token, platform, updated_at };
    })
    .filter((t): t is StoredToken => t !== null);
}

export async function POST(req: NextRequest) {
  if (!supabaseAvailable()) {
    return NextResponse.json({ error: "supabase not configured" }, { status: 503 });
  }
  // Resolve the user from either the SSR cookie session or the
  // Authorization: Bearer token the native app sends.
  const user = await getAuthedUser(req);
  if (!user) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  // DB work goes through the service-role client: a Bearer-authed request
  // has no cookie session for RLS to key off, and we've already
  // authenticated the user above and only ever touch their own row.
  const admin = supabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "supabase admin not configured" }, { status: 503 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const incoming: StoredToken = {
    token: parsed.data.token,
    platform: parsed.data.platform,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await admin
    .from("profiles")
    .select("expo_push_tokens")
    .eq("id", user.id)
    .maybeSingle();

  const current = normalize(existing?.expo_push_tokens);
  const without = current.filter((t) => t.token !== incoming.token);
  const next = [...without, incoming];

  const { error } = await admin
    .from("profiles")
    .upsert(
      { id: user.id, expo_push_tokens: next },
      { onConflict: "id" },
    );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, count: next.length });
}
