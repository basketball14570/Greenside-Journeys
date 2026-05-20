import { NextResponse, type NextRequest } from "next/server";

// Canonical-host redirect. The app is served on both greensideedge.com
// (apex) and www.greensideedge.com, but the auth session cookie is set
// per-origin — so a user who signs in on the apex looks signed-out on
// www (and vice versa). Force every www request to the apex so there's
// a single origin and the Supabase session is always present.
export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  if (host.toLowerCase().startsWith("www.")) {
    const url = req.nextUrl.clone();
    url.hostname = host.slice(4).split(":")[0];
    url.port = "";
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest).*)"],
};
