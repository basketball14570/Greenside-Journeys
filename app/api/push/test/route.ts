import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { pushToUser, pushEnabled } from "@/lib/notify/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Send a test push to the signed-in user. Used by the "Send test"
// button on /dashboard/account so users can verify the wiring after
// they grant permission.
export async function POST() {
  if (!pushEnabled()) {
    return NextResponse.json(
      { error: "VAPID keys not configured" },
      { status: 503 },
    );
  }
  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const result = await pushToUser(userData.user.id, {
    title: "Greenside test alert",
    body: "Push is wired. You'll see real alerts when bets transition.",
    url: "/dashboard",
    tag: "greenside-test",
  });
  return NextResponse.json(result);
}
