"use client";

import { useState } from "react";
import Link from "next/link";

// Generic hover-or-click dropdown used by both the "More" menu and the
// DFS submenu. The chip stays highlighted when the active route lives
// inside the dropdown so the user can still tell where they are.

export type MoreTab = { label: string; href: string };

export function MoreDropdown({
  label = "More",
  active,
  tabs,
}: {
  label?: string;
  active: string;
  tabs: MoreTab[];
}) {
  const [open, setOpen] = useState(false);
  const activeInMore = tabs.some((t) => t.label === active);
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`px-3 py-1.5 rounded-md text-sm transition flex items-center gap-1 ${
          activeInMore
            ? "bg-surface-2 text-text font-semibold"
            : "text-text-dim hover:text-text"
        }`}
        style={{ fontSize: 13.5 }}
      >
        {label}
        <span style={{ fontSize: 9, opacity: 0.6 }}>▾</span>
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1 rounded-[10px] border border-line bg-bgDeep py-1 min-w-[180px] z-50"
          style={{ boxShadow: "0 12px 24px rgba(0,0,0,0.4)" }}
        >
          {tabs.map((t) => (
            <Link
              key={t.label}
              href={t.href}
              className={`block px-3 py-1.5 text-sm transition ${
                t.label === active
                  ? "bg-surface-2 text-text font-semibold"
                  : "text-text-dim hover:text-text hover:bg-surface-1"
              }`}
              style={{ fontSize: 13 }}
            >
              {t.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
