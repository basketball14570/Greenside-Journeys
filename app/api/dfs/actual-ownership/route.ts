import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { DK_EVENT } from "@/lib/data/dfs-salaries";
import {
  getActualOwnership,
  saveActualOwnership,
} from "@/lib/dfs/actual-ownership-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Shared actual %Drafted for the current DK event. GET is public so every
// visitor sees the latest paste; POST requires sign-in and last-write-wins.

export async function GET(req: NextRequest) {
  const event = req.nextUrl.searchParams.get("event") ?? DK_EVENT;
  const saved = await getActualOwnership(event);
  return NextResponse.json({
    event,
    saved,
  });
}

const PayloadSchema = z.object({
  event: z.string().trim().min(1).optional(),
  rawText: z.string().min(1).max(50_000),
  entries: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        own: z.number().min(0).max(100),
      }),
    )
    .max(300),
});

export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "sign in to save" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "schema mismatch", issues: parsed.error.issues.slice(0, 5) },
      { status: 400 },
    );
  }

  const event = parsed.data.event ?? DK_EVENT;
  const ok = await saveActualOwnership({
    eventName: event,
    rawText: parsed.data.rawText,
    entries: parsed.data.entries,
    updatedBy: userData.user.email ?? null,
  });
  if (!ok) {
    return NextResponse.json({ error: "save failed" }, { status: 500 });
  }
  const saved = await getActualOwnership(event);
  return NextResponse.json({ event, saved });
}
