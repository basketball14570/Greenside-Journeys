"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { BrandMark } from "@/components/edge/primitives";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send magic link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg text-text flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-10 gap-3">
          <BrandMark size={42} />
          <span
            className="serif-italic"
            style={{
              fontSize: 26,
              letterSpacing: -0.3,
              fontStyle: "normal",
              color: "#f0ebe0",
            }}
          >
            Greenside
          </span>
        </div>
        <div className="rounded-[14px] bg-surface-1 border border-line p-7">
          <span
            className="num font-semibold uppercase"
            style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
          >
            ● Sign in
          </span>
          <h1
            className="serif-italic mt-1.5 mb-1"
            style={{ fontSize: 28, letterSpacing: -0.3, fontStyle: "normal" }}
          >
            Welcome back.
          </h1>
          <p
            className="text-text-dim mb-5"
            style={{ fontSize: 13.5 }}
          >
            We&apos;ll email you a magic link. No password required.
          </p>

          {sent ? (
            <div
              className="rounded-[10px] p-4"
              style={{
                background: "rgba(142,230,142,0.08)",
                border: "1px solid rgba(142,230,142,0.25)",
                color: "#8ee68e",
                fontSize: 13,
              }}
            >
              Check <span className="font-semibold">{email}</span> for your
              sign-in link.
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label
                  className="block label-mono mb-1.5"
                  style={{ fontSize: 10 }}
                >
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-2 border border-line rounded-md px-3 py-2.5 text-text focus:outline-none focus:border-fairway"
                  style={{ fontSize: 14 }}
                  placeholder="you@example.com"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full rounded-md font-bold disabled:opacity-40"
                style={{
                  background: "#8ee68e",
                  color: "#06140c",
                  padding: "12px 0",
                  fontSize: 14,
                }}
              >
                {loading ? "Sending…" : "Email me a magic link"}
              </button>
              {error && (
                <div className="text-red" style={{ fontSize: 13 }}>
                  {error}
                </div>
              )}
            </form>
          )}
        </div>
        <p
          className="text-center text-text-muted mt-6"
          style={{ fontSize: 11 }}
        >
          21+. For entertainment purposes only. Gamble responsibly.
        </p>
      </div>
    </main>
  );
}
