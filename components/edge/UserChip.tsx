"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";

// Header user widget. Shows the signed-in email (or initials) + a
// sign-out menu when Supabase is configured; falls back to a "Sign in"
// link when env vars are absent so demo deployments still render.
export default function UserChip() {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const supabaseConfigured = isSupabaseConfigured();

  useEffect(() => {
    if (!supabaseConfigured) {
      setReady(true);
      return;
    }
    const supabase = supabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabaseConfigured]);

  async function signOut() {
    if (!supabaseConfigured) return;
    await supabaseBrowser().auth.signOut();
    setEmail(null);
    setOpen(false);
  }

  if (!ready) {
    return (
      <div
        className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-full bg-surface-1 border border-line"
        style={{ minWidth: 96 }}
      />
    );
  }

  if (!supabaseConfigured || !email) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-full bg-surface-1 border border-line hover:bg-surface-2 transition-colors"
        style={{ fontSize: 13 }}
      >
        <div
          className="w-6 h-6 rounded-full"
          style={{ background: "linear-gradient(135deg, #f5c558, #3f8a52)" }}
        />
        <span className="text-text-dim">Sign in</span>
      </Link>
    );
  }

  const initials = email
    .split("@")[0]
    .split(/[._-]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || email[0].toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-full bg-surface-1 border border-line hover:bg-surface-2 transition-colors"
        style={{ fontSize: 13 }}
      >
        <div
          className="w-6 h-6 rounded-full grid place-items-center"
          style={{
            background: "linear-gradient(135deg, #f5c558, #3f8a52)",
            fontSize: 10,
            fontWeight: 700,
            color: "#0a1f14",
          }}
        >
          {initials}
        </div>
        <span className="text-text max-w-[140px] truncate">{email}</span>
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 rounded-[10px] border border-line bg-bgDeep py-1 min-w-[180px] z-50"
          style={{ boxShadow: "0 12px 24px rgba(0,0,0,0.4)" }}
        >
          <Link
            href="/dashboard/account"
            className="block px-3 py-2 text-text-dim hover:text-text hover:bg-surface-1"
            style={{ fontSize: 13 }}
            onClick={() => setOpen(false)}
          >
            Account
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="w-full text-left px-3 py-2 text-text-dim hover:text-text hover:bg-surface-1"
            style={{ fontSize: 13 }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
