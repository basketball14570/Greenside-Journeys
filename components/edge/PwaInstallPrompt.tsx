"use client";

import { useEffect, useState } from "react";

// PWA install prompt. Listens for the browser's `beforeinstallprompt`
// event (Chrome/Edge/Android), stores the deferred prompt, and surfaces
// a small bottom-right card that the user can dismiss or accept.
//
// Persistence: once the user dismisses or installs, we stash a flag in
// localStorage so we don't nag them again. Re-shows after 14 days if
// dismissed (configurable via DISMISS_DAYS).
//
// iOS Safari note: Safari doesn't fire beforeinstallprompt — for iOS
// users we'd need to detect `standalone` mode + iOS userAgent and show
// "tap share → Add to Home Screen" instructions. That's a follow-up.

type DeferredPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "greenside:pwa-install-dismissed";
const DISMISS_DAYS = 14;

export function PwaInstallPrompt() {
  const [prompt, setPrompt] = useState<DeferredPrompt | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Skip entirely if already running as PWA, or if the user dismissed
    // us recently. Otherwise hold onto the deferred prompt and show the
    // card once it fires.
    if (typeof window === "undefined") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    const dismissedAt = readDismissed();
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86_400_000) {
      return;
    }

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setPrompt(e as DeferredPrompt);
    }
    function onInstalled() {
      setPrompt(null);
      writeDismissed();
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!prompt) return;
    setBusy(true);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "dismissed") writeDismissed();
      setPrompt(null);
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    writeDismissed();
    setPrompt(null);
  }

  if (!prompt) return null;

  return (
    <div
      className="fixed z-[90]"
      style={{ bottom: 20, right: 20, maxWidth: 320 }}
    >
      <div
        className="rounded-[12px] border border-line bg-surface-1 p-4 shadow-2xl"
        style={{
          boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
        }}
      >
        <div
          className="num font-semibold uppercase mb-1"
          style={{ fontSize: 10, letterSpacing: 1.2, color: "#8ee68e" }}
        >
          ● Install Greenside
        </div>
        <p className="text-text mb-1" style={{ fontSize: 14, fontWeight: 500 }}>
          Add to your home screen.
        </p>
        <p
          className="text-text-dim mb-3"
          style={{ fontSize: 12, lineHeight: 1.5 }}
        >
          Faster launch, push notifications when bets transition, and a
          standalone window — no browser chrome.
        </p>
        <div className="flex gap-2">
          <button
            onClick={install}
            disabled={busy}
            className="rounded-[6px] px-3 py-1.5 font-semibold disabled:opacity-40"
            style={{ background: "#8ee68e", color: "#0a1f14", fontSize: 12 }}
          >
            {busy ? "Installing…" : "Install"}
          </button>
          <button
            onClick={dismiss}
            className="rounded-[6px] px-3 py-1.5 text-text-dim hover:text-text"
            style={{ fontSize: 12 }}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

function readDismissed(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(DISMISS_KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

function writeDismissed() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* private mode etc. */
  }
}
