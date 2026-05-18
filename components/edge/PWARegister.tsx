"use client";

import { useEffect } from "react";

// Registers the service worker once on the client. Mounted from the root
// layout so it runs on every page without per-page boilerplate.
export function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        // Failure is non-fatal; the app works without the SW.
        console.warn("[Greenside] SW registration failed:", err);
      });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
  }, []);

  return null;
}
