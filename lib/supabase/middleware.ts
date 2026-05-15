import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function updateSession(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // No Supabase yet (e.g. local demo with placeholder env): skip auth gating.
  if (!url || !anon) return res;

  const supabase = createServerClient(
    url,
    anon,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(toSet: CookieToSet[]) {
          toSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          toSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = req.nextUrl.pathname;
  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/alerts");
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/auth");

  if (isProtected && !user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && user && pathname !== "/auth/callback") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return res;
}
