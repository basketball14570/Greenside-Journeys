"use client";

// The "Search players, books, markets…" chip in the desktop app bar.
// Clicking it dispatches a synthetic Cmd+K keydown so the CommandPalette
// (which already listens for that combo globally) opens.

export function SearchChip() {
  function open() {
    const ev = new KeyboardEvent("keydown", {
      key: "k",
      code: "KeyK",
      metaKey: typeof navigator !== "undefined" && /Mac/i.test(navigator.platform),
      ctrlKey: typeof navigator !== "undefined" && !/Mac/i.test(navigator.platform),
      bubbles: true,
    });
    window.dispatchEvent(ev);
  }

  return (
    <button
      onClick={open}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-1 border border-line num text-text-dim hover:border-line-strong"
      style={{ fontSize: 11.5, letterSpacing: 0.4 }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <circle cx="11" cy="11" r="7" stroke="#6c7a72" strokeWidth="2" />
        <path d="M20 20l-3.5-3.5" stroke="#6c7a72" strokeWidth="2" strokeLinecap="round" />
      </svg>
      Search players, books, markets…
      <span className="text-text-muted ml-3">⌘K</span>
    </button>
  );
}
