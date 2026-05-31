import MobileHandoffClient from "./client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Receives a Supabase access + refresh token from the native app via URL
// params and writes them into the SSR cookie jar so the user is signed
// in when the webview lands on `next`. Used only by the mobile app's
// in-app webview — see apps/mobile/lib/web-handoff.ts.
//
// Tokens travel over HTTPS query string and are immediately replaced in
// history by the router on the client side.
export default function MobileHandoffPage({
  searchParams,
}: {
  searchParams: { access_token?: string; refresh_token?: string; next?: string };
}) {
  const next = typeof searchParams.next === "string" && searchParams.next.startsWith("/")
    ? searchParams.next
    : "/dashboard";
  return (
    <MobileHandoffClient
      accessToken={searchParams.access_token ?? ""}
      refreshToken={searchParams.refresh_token ?? ""}
      next={next}
    />
  );
}
