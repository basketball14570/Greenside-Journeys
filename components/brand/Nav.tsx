import Link from "next/link";
import { Logo } from "./Logo";

export function Nav({ dark = false }: { dark?: boolean }) {
  return (
    <nav
      className={
        "flex items-center justify-between px-6 md:px-12 py-4 " +
        (dark ? "bg-green-deep text-white" : "bg-paper text-ink")
      }
    >
      <Link href="/" className="flex items-center gap-2">
        <Logo variant={dark ? "horizontal-light" : "horizontal"} height={28} />
        <span className="hidden sm:inline font-display text-lg tracking-tight">
          Edge
        </span>
      </Link>
      <div className="flex items-center gap-6 text-sm font-medium">
        <Link href="/dashboard" className="hover:text-gold">
          Dashboard
        </Link>
        <Link href="/dashboard/conditions" className="hover:text-gold">
          Live Conditions
        </Link>
        <Link href="/dashboard/dfs" className="hover:text-gold">
          DFS
        </Link>
        <Link
          href="/dashboard/upload"
          className="bg-gold text-green-deep px-4 py-2 rounded font-semibold hover:bg-gold-light"
        >
          Upload Bet
        </Link>
      </div>
    </nav>
  );
}
