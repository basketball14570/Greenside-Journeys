import Link from "next/link";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Nav";

export const metadata = {
  title: "404 · Greenside",
};

export default function NotFound() {
  return (
    <main className="min-h-screen bg-bg text-text flex flex-col">
      <MarketingNav />

      <section className="flex-1 flex items-center">
        <div className="max-w-3xl mx-auto px-6 lg:px-12 py-20 w-full">
          <span
            className="num font-semibold uppercase"
            style={{ fontSize: 11, letterSpacing: 1.6, color: "#f5c558" }}
          >
            ● 404 · off the green
          </span>
          <h1
            className="serif-italic mt-4 mb-5"
            style={{
              fontSize: 64,
              letterSpacing: -0.8,
              lineHeight: 1.02,
              fontStyle: "normal",
            }}
          >
            <em>That route&apos;s in the rough.</em>
          </h1>
          <p
            className="text-text-dim max-w-xl mb-8"
            style={{ fontSize: 17, lineHeight: 1.5 }}
          >
            The page you were looking for doesn&apos;t exist — either we
            shipped it under a different URL, or someone hand-typed a
            slug that never was. Try one of these instead.
          </p>

          <div className="grid sm:grid-cols-2 gap-3 max-w-xl">
            <Pin href="/" label="Marketing home" tone="green" />
            <Pin href="/dashboard" label="Dashboard" tone="green" />
            <Pin href="/dashboard/parlay" label="Live parlay" tone="dim" />
            <Pin href="/dashboard/ownership" label="Ownership DB" tone="dim" />
            <Pin href="/pricing" label="Pricing + FAQ" tone="dim" />
            <Pin href="/changelog" label="Changelog" tone="dim" />
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}

function Pin({
  href,
  label,
  tone,
}: {
  href: string;
  label: string;
  tone: "green" | "dim";
}) {
  const isGreen = tone === "green";
  return (
    <Link
      href={href}
      className="rounded-[10px] border border-line px-4 py-3 hover:bg-surface-2 transition-colors flex items-center justify-between"
      style={{
        background: isGreen ? "rgba(127,212,154,0.05)" : undefined,
        borderColor: isGreen ? "rgba(127,212,154,0.25)" : undefined,
      }}
    >
      <span
        className="num font-medium"
        style={{
          fontSize: 13.5,
          letterSpacing: 0.3,
          color: isGreen ? "#7fd49a" : "#f0ebe0",
        }}
      >
        {label}
      </span>
      <span
        className="num"
        style={{ fontSize: 14, color: isGreen ? "#7fd49a" : "#a8b3ac" }}
      >
        →
      </span>
    </Link>
  );
}
