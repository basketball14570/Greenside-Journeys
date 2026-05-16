import { MarketingNav, MarketingFooter } from "./Nav";

export function LegalDoc({
  eyebrow,
  title,
  lastUpdated,
  children,
}: {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-bg text-text">
      <MarketingNav />

      <article className="max-w-3xl mx-auto px-6 lg:px-12 py-12">
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 11, letterSpacing: 1.6, color: "#f5c558" }}
        >
          {eyebrow}
        </span>
        <h1
          className="serif-italic mt-3 mb-2"
          style={{ fontSize: 48, lineHeight: 1.1, letterSpacing: -0.6, fontStyle: "normal" }}
        >
          <em>{title}</em>
        </h1>
        <p
          className="num text-text-muted mb-8"
          style={{ fontSize: 11.5, letterSpacing: 0.4 }}
        >
          Last updated · {lastUpdated}
        </p>

        <div
          className="rounded-[12px] p-4 mb-8 border border-line"
          style={{
            background: "rgba(124,192,232,0.06)",
            fontSize: 12.5,
            color: "#a8b3ac",
            lineHeight: 1.5,
          }}
        >
          <strong className="text-text">Notice:</strong> This document is a
          template provided as a starting point. It has not been reviewed by
          legal counsel. Before launch, have a lawyer review and tailor each
          clause to your jurisdiction, business structure, and the
          sports-wagering laws in every state where you operate.
        </div>

        <div
          className="legal-body space-y-5 text-text-dim"
          style={{ fontSize: 14.5, lineHeight: 1.65 }}
        >
          {children}
        </div>
      </article>

      <MarketingFooter />
    </main>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="serif-italic text-text mt-10 mb-2"
      style={{ fontSize: 24, letterSpacing: -0.3, fontStyle: "normal" }}
    >
      {children}
    </h2>
  );
}

export function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-text mt-6 mb-1 font-semibold"
      style={{ fontSize: 15.5 }}
    >
      {children}
    </h3>
  );
}
