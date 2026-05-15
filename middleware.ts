import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(req: NextRequest) {
  return updateSession(req);
}

export const config = {
  matcher: [
    // Run on all routes except static assets, images, and Next internals.
    "/((?!_next/static|_next/image|favicon.ico|brand/|legacy/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
