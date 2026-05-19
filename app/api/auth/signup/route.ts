import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Server-side signup that uses the service role to create the user with
// email_confirm: true, so the account is usable on the very next sign-in
// without waiting for a confirmation email. Falls back to the client's
// supabase.auth.signUp path when the service role isn't configured.
export async function POST(req: Request) {
  const admin = supabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "admin_not_configured" },
      { status: 501 },
    );
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  }

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    // Already exists → 409 so the client can show a clean "use sign-in"
    // message instead of falling back to signUp (which would send a
    // confirmation email to an account that already works).
    if (/already|registered|exists/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    // Anything else (bad service-role key, network glitch, Supabase
    // outage) → return 503 so the client falls back to its own
    // supabase.auth.signUp path. The account still gets created; the
    // user just has to confirm by email until the env is fixed.
    console.error("admin.createUser failed", error.message);
    return NextResponse.json(
      { error: "admin_unavailable" },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}
