"use client";

import { useEffect } from "react";
import Link from "next/link";

// Top-level error boundary. Logs to the console so the source map is
// usable in dev, gives the user a clear path out, and a reset button
// that retries the failing render without a full reload.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[Greenside] route error:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-bg text-text flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-xl w-full">
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 11, letterSpacing: 1.6, color: "#e87c7c" }}
        >
          ● Something broke
        </span>
        <h1
          className="serif-italic mt-4 mb-4"
          style={{
            fontSize: 44,
            letterSpacing: -0.5,
            lineHeight: 1.05,
            fontStyle: "normal",
          }}
        >
          <em>This page didn&apos;t render.</em>
        </h1>
        <p
          className="text-text-dim mb-6"
          style={{ fontSize: 15.5, lineHeight: 1.55 }}
        >
          An exception leaked through the boundary. The dashboard is still
          up — try the actions below, or refresh in a few seconds. If it
          keeps happening, the error digest is{" "}
          <code
            className="num"
            style={{
              background: "rgba(255,255,255,0.06)",
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 12.5,
            }}
          >
            {error.digest ?? "n/a"}
          </code>
          .
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded font-semibold"
            style={{ background: "#8ee68e", color: "#06140c", fontSize: 14 }}
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded font-semibold border border-line text-text hover:bg-surface-1"
            style={{ fontSize: 14 }}
          >
            Back to dashboard
          </Link>
          <Link
            href="/"
            className="px-5 py-2.5 rounded font-semibold border border-line text-text-dim hover:bg-surface-1"
            style={{ fontSize: 14 }}
          >
            Home
          </Link>
        </div>

        {process.env.NODE_ENV === "development" && error.message && (
          <pre
            className="num mt-8 p-4 rounded border border-line overflow-auto"
            style={{
              fontSize: 11.5,
              background: "rgba(255,255,255,0.02)",
              color: "#e0d8c8",
              maxHeight: 220,
            }}
          >
            {error.message}
            {error.stack && `\n\n${error.stack.split("\n").slice(0, 8).join("\n")}`}
          </pre>
        )}
      </div>
    </main>
  );
}
