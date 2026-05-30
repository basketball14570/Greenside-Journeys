import Link from "next/link";
import { BrandMark } from "./primitives";

// Brand footer so the app closes with intent instead of trailing off like
// an unfinished template. Mark + tagline, a few real links, and the
// compliance line every betting product needs.

const LINKS: { label: string; href: string }[] = [
  { label: "Today", href: "/dashboard" },
  { label: "Live", href: "/dashboard/live" },
  { label: "DFS", href: "/dashboard/dfs" },
  { label: "Leaderboard", href: "/dashboard/leaderboard" },
  { label: "Odds", href: "/dashboard/odds" },
  { label: "Ask", href: "/dashboard/ask" },
];

export function DashboardFooter() {
  return (
    <footer className="mt-12 border-t border-line">
      <div
        className="px-5 lg:px-8 py-8"
        style={{ background: "linear-gradient(180deg, rgba(127,212,154,0.03), transparent)" }}
      >
        <div className="max-w-6xl mx-auto flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3 max-w-sm">
            <BrandMark size={30} />
            <div>
              <div
                className="serif-italic"
                style={{ fontSize: 19, letterSpacing: -0.2, fontStyle: "normal", color: "#f4efe4" }}
              >
                Greenside
              </div>
              <p className="text-text-dim mt-1" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                Golf betting &amp; DFS intelligence — live scoring, model edges,
                conditions, and ownership in one place.
              </p>
            </div>
          </div>

          <nav className="grid grid-cols-3 gap-x-10 gap-y-2">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="num uppercase text-text-dim hover:text-text transition"
                style={{ fontSize: 11, letterSpacing: 0.8 }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="max-w-6xl mx-auto mt-7 pt-5 border-t border-line/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="num text-text-muted" style={{ fontSize: 10.5, letterSpacing: 0.4 }}>
            © {new Date().getFullYear()} Greenside. For entertainment purposes only.
          </span>
          <span className="num text-text-muted" style={{ fontSize: 10.5, letterSpacing: 0.4 }}>
            21+ · Gamble responsibly ·{" "}
            <Link href="/responsible-gambling" className="hover:text-text underline">
              Resources
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
