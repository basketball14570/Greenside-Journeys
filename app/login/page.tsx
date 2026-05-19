"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { BrandMark } from "@/components/edge/primitives";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

type Mode = "signin" | "signup" | "magic" | "reset";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setError(null);
    setInfo(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    reset();
    setLoading(true);
    try {
      const supabase = supabaseBrowser();
      const redirect = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.replace(next);
        router.refresh();
        return;
      }

      if (mode === "signup") {
        // Server-side path creates the user pre-confirmed (email_confirm:
        // true via service role), so we can log them straight in without
        // bouncing through inbox confirmation. If the admin route isn't
        // configured we fall back to the client signUp, which respects
        // the project's confirmation setting.
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (res.ok) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (signInError) throw signInError;
          router.replace(next);
          router.refresh();
          return;
        }

        if (res.status === 501) {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: redirect },
          });
          if (error) throw error;
          if (data.session) {
            router.replace(next);
            router.refresh();
          } else {
            setInfo(
              `Account created. Check ${email} to confirm your address before signing in.`,
            );
          }
          return;
        }

        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? "Could not create account");
      }

      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirect },
        });
        if (error) throw error;
        setInfo(`Check ${email} for your sign-in link.`);
        return;
      }

      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/account/password")}`,
        });
        if (error) throw error;
        setInfo(
          `Password-reset link sent to ${email}. Click it to set a new password.`,
        );
        return;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const heading =
    mode === "signup"
      ? "Create your account."
      : mode === "magic"
        ? "Email me a link."
        : mode === "reset"
          ? "Reset your password."
          : "Welcome back.";

  const sublabel =
    mode === "signup"
      ? "Email + password. We'll log you in straight away."
      : mode === "magic"
        ? "We'll email you a one-tap sign-in link."
        : mode === "reset"
          ? "Enter your email — we'll send a link to set a new password."
          : "Sign in with the password you set when you signed up.";

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
          <Tabs mode={mode} setMode={(m) => { reset(); setMode(m); }} />
          <span
            className="num font-semibold uppercase block mt-3"
            style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
          >
            ● {mode === "signup" ? "New account" : mode === "reset" ? "Password reset" : "Sign in"}
          </span>
          <h1
            className="serif-italic mt-1.5 mb-1"
            style={{ fontSize: 28, letterSpacing: -0.3, fontStyle: "normal" }}
          >
            {heading}
          </h1>
          <p className="text-text-dim mb-5" style={{ fontSize: 13.5 }}>
            {sublabel}
          </p>

          {info ? (
            <div
              className="rounded-[10px] p-4"
              style={{
                background: "rgba(142,230,142,0.08)",
                border: "1px solid rgba(142,230,142,0.25)",
                color: "#8ee68e",
                fontSize: 13,
                lineHeight: 1.45,
              }}
            >
              {info}
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="block label-mono mb-1.5" style={{ fontSize: 10 }}>
                  Email
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-2 border border-line rounded-md px-3 py-2.5 text-text focus:outline-none focus:border-fairway"
                  style={{ fontSize: 14 }}
                  placeholder="you@example.com"
                />
              </div>

              {(mode === "signin" || mode === "signup") && (
                <div>
                  <label
                    className="label-mono mb-1.5 flex items-baseline justify-between"
                    style={{ fontSize: 10 }}
                  >
                    <span>Password</span>
                    {mode === "signin" && (
                      <button
                        type="button"
                        onClick={() => { reset(); setMode("reset"); }}
                        className="num"
                        style={{
                          fontSize: 10,
                          color: "#a8b3ac",
                          letterSpacing: 0.5,
                          textTransform: "none",
                        }}
                      >
                        Forgot?
                      </button>
                    )}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={mode === "signup" ? 8 : 1}
                    autoComplete={
                      mode === "signup" ? "new-password" : "current-password"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-surface-2 border border-line rounded-md px-3 py-2.5 text-text focus:outline-none focus:border-fairway"
                    style={{ fontSize: 14 }}
                    placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={
                  loading ||
                  !email ||
                  ((mode === "signin" || mode === "signup") && !password)
                }
                className="w-full rounded-md font-bold disabled:opacity-40"
                style={{
                  background: "#8ee68e",
                  color: "#06140c",
                  padding: "12px 0",
                  fontSize: 14,
                }}
              >
                {loading
                  ? "…"
                  : mode === "signin"
                    ? "Sign in"
                    : mode === "signup"
                      ? "Create account"
                      : mode === "magic"
                        ? "Email me a link"
                        : "Send reset link"}
              </button>

              {error && (
                <div className="text-red" style={{ fontSize: 13 }}>
                  {error}
                </div>
              )}

              <AltActions mode={mode} setMode={(m) => { reset(); setMode(m); }} />
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

function Tabs({
  mode,
  setMode,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
}) {
  // Only show the primary signin/signup tabs; reset + magic are
  // reachable via the inline links below the form.
  const active = mode === "signup" ? "signup" : "signin";
  return (
    <div className="flex gap-1 p-1 rounded-md bg-surface-2 border border-line">
      <TabButton
        active={active === "signin"}
        onClick={() => setMode("signin")}
      >
        Sign in
      </TabButton>
      <TabButton
        active={active === "signup"}
        onClick={() => setMode("signup")}
      >
        Create account
      </TabButton>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 rounded-[5px] num font-semibold uppercase transition"
      style={{
        fontSize: 10.5,
        letterSpacing: 0.9,
        padding: "7px 0",
        background: active ? "#0a1f14" : "transparent",
        color: active ? "#f0ebe0" : "#a8b3ac",
        border: active ? "1px solid #2a3a30" : "1px solid transparent",
      }}
    >
      {children}
    </button>
  );
}

function AltActions({
  mode,
  setMode,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
}) {
  // Inline secondary actions. On the signin tab, offer the magic-link
  // fallback. On magic/reset, give a way back to password sign-in.
  if (mode === "signin") {
    return (
      <p
        className="text-center text-text-dim pt-1"
        style={{ fontSize: 12.5 }}
      >
        <button
          type="button"
          onClick={() => setMode("magic")}
          className="underline"
          style={{ color: "#a8b3ac" }}
        >
          Email me a link instead
        </button>
      </p>
    );
  }
  if (mode === "magic" || mode === "reset") {
    return (
      <p
        className="text-center text-text-dim pt-1"
        style={{ fontSize: 12.5 }}
      >
        <button
          type="button"
          onClick={() => setMode("signin")}
          className="underline"
          style={{ color: "#a8b3ac" }}
        >
          Back to password sign-in
        </button>
      </p>
    );
  }
  return null;
}
