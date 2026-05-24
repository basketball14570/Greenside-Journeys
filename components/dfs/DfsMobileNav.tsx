"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Mobile-only DFS sub-nav. On phones the DFS tab opens Cut Sweat (the
// optimizer is desktop-only), so this gives one-tap access between the two
// tools mobile users actually want: Cut Sweat and Ownership. Hidden on
// desktop, where the DFS dropdown already covers it.
const ITEMS = [
  { href: "/dashboard/dfs/cut-sweat", label: "Cut Sweat", match: "/dashboard/dfs/cut-sweat" },
  { href: "/dashboard/ownership", label: "Ownership", match: "/dashboard/ownership" },
];

export function DfsMobileNav() {
  const pathname = usePathname();
  return (
    <div className="lg:hidden flex gap-2">
      {ITEMS.map((it) => {
        const active = pathname?.startsWith(it.match);
        return (
          <Link
            key={it.href}
            href={it.href}
            className="num font-semibold uppercase flex-1 text-center"
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 11,
              letterSpacing: 0.8,
              color: active ? "#0a1f12" : "#a8b3ac",
              background: active ? "#2faa5f" : "transparent",
              border: `1px solid ${active ? "#2faa5f" : "rgba(255,255,255,0.1)"}`,
            }}
          >
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}
