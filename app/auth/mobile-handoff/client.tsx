"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabaseBrowser } from "@/lib/supabase/client";

type Props = {
  accessToken: string;
  refreshToken: string;
  next: string;
};

// Calls supabase.auth.setSession() with the tokens passed from the
// native app. setSession writes the SSR auth cookies via the configured
// cookieOptions in lib/supabase/client.ts, so the subsequent
// router.replace(next) navigates with the user already signed in.
export default function MobileHandoffClient({ accessToken, refreshToken, next }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !refreshToken) {
      setError("Missing session tokens.");
      return;
    }
    if (!isSupabaseConfigured()) {
      setError("Supabase not configured on the server.");
      return;
    }
    const supa = supabaseBrowser();
    supa.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error: err }) => {
        if (err) {
          setError(err.message);
          return;
        }
        router.replace(next);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Handoff failed."));
  }, [accessToken, refreshToken, next, router]);

  return (
    <main style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      backgroundColor: "#0a1f14",
      color: "#9bb0a3",
      fontFamily: "system-ui, sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        {error ? (
          <>
            <p style={{ color: "#e0625a", marginBottom: 8 }}>Sign-in handoff failed</p>
            <p style={{ fontSize: 13 }}>{error}</p>
          </>
        ) : (
          <p>Signing you in…</p>
        )}
      </div>
    </main>
  );
}
