"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { BrandMark } from "@/components/edge/primitives";

export default function SetPasswordPage() {
  const router = useRouter();
  const supabase = supabaseBrowser();

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Recovery links land here with a `?code=` (PKCE) that has to be
    // exchanged for a session before updateUser will work. If there's
    // already a session (e.g. user navigated here while signed in),
    // skip straight to the form.
    async function init() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        // Strip the code from the address bar so a refresh doesn't retry
        // an already-consumed code.
        window.history.replaceState({}, "", url.pathname);
        if (error) {
          setAuthed(false);
          return;
        }
      }
      const { data } = await supabase.auth.getUser();
      setAuthed(Boolean(data.user));
    }
    init();
  }, [supabase]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setInfo("Password updated. Taking you to your dashboard…");
      setTimeout(() => {
        router.replace("/dashboard");
        router.refresh();
      }, 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-16 bg-bg">
      <BrandMark />

      <section
        className="w-full max-w-md mt-10 rounded-[16px] border border-line bg-surface-1/40 p-7"
      >
        <div
          className="num font-semibold uppercase mb-2"
          style={{ fontSize: 11, letterSpacing: 1.4, color: "#f5c558" }}
        >
          ● Set password
        </div>
        <h1
          className="serif-italic text-text mb-2"
          style={{ fontSize: 28, letterSpacing: -0.3, lineHeight: 1.15, fontStyle: "normal" }}
        >
          Choose a new password.
        </h1>
        <p
          className="text-text-dim mb-6"
          style={{ fontSize: 14, lineHeight: 1.55 }}
        >
          You&apos;ll use this with your email on the sign-in screen.
        </p>

        {authed === false ? (
          <div>
            <p className="text-text-dim mb-4" style={{ fontSize: 14 }}>
              Your reset link expired or wasn&apos;t valid. Request a new one
              from the sign-in screen.
            </p>
            <Link
              href="/login"
              className="inline-block px-5 py-2.5 rounded font-semibold"
              style={{ background: "#8ee68e", color: "#06140c", fontSize: 14 }}
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label
                className="num text-text-muted block mb-1.5"
                style={{ fontSize: 11, letterSpacing: 1 }}
              >
                NEW PASSWORD
              </label>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bg border border-line rounded px-4 py-3 text-text"
                style={{ fontSize: 15 }}
              />
            </div>
            <div>
              <label
                className="num text-text-muted block mb-1.5"
                style={{ fontSize: 11, letterSpacing: 1 }}
              >
                CONFIRM
              </label>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-bg border border-line rounded px-4 py-3 text-text"
                style={{ fontSize: 15 }}
              />
            </div>

            {error && (
              <div className="text-red-400" style={{ fontSize: 13 }}>
                {error}
              </div>
            )}
            {info && (
              <div style={{ fontSize: 13, color: "#8ee68e" }}>{info}</div>
            )}

            <button
              type="submit"
              disabled={loading || authed === null}
              className="w-full px-6 py-3 rounded font-semibold disabled:opacity-50"
              style={{ background: "#8ee68e", color: "#06140c", fontSize: 15 }}
            >
              {loading ? "Saving…" : "Save password"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
