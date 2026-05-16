import Link from "next/link";
import { BrandMark } from "@/components/edge/primitives";

export function MarketingNav() {
  return (
    <nav className="flex items-center justify-between px-6 lg:px-12 py-5 max-w-7xl mx-auto">
      <Link href="/" className="flex items-center gap-2.5">
        <BrandMark size={28} />
        <span
          className="serif-italic"
          style={{
            fontSize: 22,
            letterSpacing: -0.3,
            fontStyle: "normal",
            color: "#f0ebe0",
          }}
        >
          Greenside
        </span>
      </Link>
      <div className="hidden sm:flex items-center gap-7">
        <Link
          href="/features"
          className="text-text-dim hover:text-text"
          style={{ fontSize: 14 }}
        >
          Features
        </Link>
        <Link
          href="/pricing"
          className="text-text-dim hover:text-text"
          style={{ fontSize: 14 }}
        >
          Pricing
        </Link>
        <Link
          href="/about"
          className="text-text-dim hover:text-text"
          style={{ fontSize: 14 }}
        >
          About
        </Link>
      </div>
      <div className="flex items-center gap-3 lg:gap-6">
        <Link
          href="/login"
          className="text-text-dim hover:text-text hidden sm:inline"
          style={{ fontSize: 14 }}
        >
          Sign in
        </Link>
        <Link
          href="/login"
          className="px-4 py-2 rounded font-semibold"
          style={{
            background: "#8ee68e",
            color: "#06140c",
            fontSize: 14,
          }}
        >
          Open Dashboard
        </Link>
      </div>
    </nav>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-line">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10 grid sm:grid-cols-3 gap-6">
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <BrandMark size={22} />
            <span
              className="serif-italic"
              style={{ fontSize: 18, letterSpacing: -0.3, fontStyle: "normal", color: "#f0ebe0" }}
            >
              Greenside
            </span>
          </div>
          <p className="text-text-dim" style={{ fontSize: 12, lineHeight: 1.55 }}>
            Golf bet intelligence. An analytics product — we don&apos;t accept
            wagers.
          </p>
        </div>
        <div>
          <div
            className="num font-semibold uppercase text-text-muted mb-3"
            style={{ fontSize: 10, letterSpacing: 1.2 }}
          >
            Product
          </div>
          <ul className="space-y-1.5" style={{ fontSize: 13 }}>
            <li><Link href="/features" className="text-text-dim hover:text-text">Features</Link></li>
            <li><Link href="/pricing" className="text-text-dim hover:text-text">Pricing</Link></li>
            <li><Link href="/dashboard" className="text-text-dim hover:text-text">Dashboard</Link></li>
            <li><Link href="/dashboard/ask" className="text-text-dim hover:text-text">Ask Greenside</Link></li>
          </ul>
        </div>
        <div>
          <div
            className="num font-semibold uppercase text-text-muted mb-3"
            style={{ fontSize: 10, letterSpacing: 1.2 }}
          >
            Legal
          </div>
          <ul className="space-y-1.5" style={{ fontSize: 13 }}>
            <li><Link href="/terms" className="text-text-dim hover:text-text">Terms of service</Link></li>
            <li><Link href="/privacy" className="text-text-dim hover:text-text">Privacy</Link></li>
            <li><Link href="/responsible-gambling" className="text-text-dim hover:text-text">Responsible gambling</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-6 text-center text-text-muted" style={{ fontSize: 11 }}>
        © 2026 Greenside Journeys. 21+. For entertainment and informational purposes only. If gambling is becoming a problem, call 1-800-GAMBLER.
      </div>
    </footer>
  );
}
