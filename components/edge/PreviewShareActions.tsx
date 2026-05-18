"use client";

import { useState } from "react";

// Share / export controls on /dashboard/preview/[slug].
//
// Uses navigator.share when available (mobile), falls back to copying the
// API URL to the clipboard. The JSON download is a direct anchor — no
// extra fetch needed because the API route emits the same payload.
export default function PreviewShareActions({ slug }: { slug: string }) {
  const [status, setStatus] = useState<string | null>(null);

  const apiUrl = `/api/preview/${slug}`;
  const fullUrl =
    typeof window === "undefined"
      ? apiUrl
      : new URL(apiUrl, window.location.origin).toString();

  async function onShare() {
    setStatus(null);
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: "Greenside tournament preview",
          url: fullUrl,
        });
        return;
      } catch {
        // user cancelled or share unavailable — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(fullUrl);
      setStatus("URL copied to clipboard");
    } catch {
      setStatus("Couldn't copy — long-press the link instead");
    }
  }

  return (
    <div className="print:hidden flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onShare}
        className="rounded-[10px] border border-line px-3 py-1.5 hover:bg-surface-2 transition-colors"
        style={{ fontSize: 12 }}
      >
        Share link
      </button>
      <a
        href={apiUrl}
        target="_blank"
        rel="noreferrer"
        className="rounded-[10px] border border-line px-3 py-1.5 hover:bg-surface-2 transition-colors"
        style={{ fontSize: 12 }}
      >
        Open JSON
      </a>
      <a
        href={apiUrl}
        download={`${slug}-preview.json`}
        className="rounded-[10px] border border-line px-3 py-1.5 hover:bg-surface-2 transition-colors"
        style={{ fontSize: 12 }}
      >
        Download JSON
      </a>
      {status && (
        <span className="text-text-dim" style={{ fontSize: 11 }}>
          {status}
        </span>
      )}
    </div>
  );
}
