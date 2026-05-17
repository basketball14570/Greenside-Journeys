import { NextResponse, type NextRequest } from "next/server";

// Temporarily a no-op. The previous Supabase-SSR middleware was pulling
// a Node-only module into the Edge runtime bundle, which blocked the
// Vercel build. Auth gating is enforced server-side in the dashboard
// layout instead. Restore proper middleware-based auth once the
// @supabase/ssr Edge incompatibility is patched.
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand/|legacy/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
