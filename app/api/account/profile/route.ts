import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Manage the signed-in user's public profile: claim/change a handle and
// toggle visibility. Handle uniqueness + format are enforced by the DB
// (unique index + check constraint from db/public_profile.sql).

const PayloadSchema = z.object({
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{3,20}$/, "3-20 chars: lowercase letters, numbers, dashes")
    .optional(),
  public: z.boolean().optional(),
  dkUsername: z.string().trim().max(50).optional(),
});

export async function GET() {
  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const { data } = await supabase
    .from("profiles")
    .select("public_handle, public_profile, dk_username")
    .eq("id", userData.user.id)
    .maybeSingle();
  return NextResponse.json({
    handle: data?.public_handle ?? null,
    public: data?.public_profile ?? false,
    dkUsername: data?.dk_username ?? null,
  });
}

export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const body = PayloadSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message ?? "invalid" }, { status: 400 });
  }

  const update: Record<string, unknown> = { id: userData.user.id };
  if (body.data.handle !== undefined) update.public_handle = body.data.handle;
  if (body.data.public !== undefined) update.public_profile = body.data.public;
  if (body.data.dkUsername !== undefined)
    update.dk_username = body.data.dkUsername || null;

  const { error } = await supabase.from("profiles").upsert(update, { onConflict: "id" });
  if (error) {
    // 23505 = unique violation (handle taken).
    const taken = error.code === "23505";
    return NextResponse.json(
      { error: taken ? "That handle is taken." : error.message },
      { status: taken ? 409 : 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
