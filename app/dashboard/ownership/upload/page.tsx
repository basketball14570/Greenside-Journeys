"use client";

import { useState } from "react";
import Link from "next/link";

// Ownership upload helper. Paste the same JSON shape your standalone HTML
// viewer uses; the API validates it and returns a TypeScript snippet you
// can paste into lib/data/ownership.ts. No mutation happens server-side —
// the canonical dataset lives in the repo so every change is reviewable.

const SAMPLE = `{
  "Sentry Tournament 2025": {
    "meta": { "course": "Kapalua Plantation", "type": "signature", "par": 73, "yards": 7596 },
    "players": [
      { "name": "Scottie Scheffler", "salary": 12500, "own": 28.4 },
      { "name": "Rory McIlroy", "salary": 11800, "own": 24.1 }
    ]
  }
}`;

type Summary = {
  name: string;
  field: number;
  top_chalk: string[];
};

type Result = {
  accepted: number;
  summary: Summary[];
  ts_snippet: string;
  next_steps: string[];
  error?: string;
  issues?: unknown[];
};

export default function OwnershipUploadPage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function submit() {
    setLoading(true);
    setResult(null);
    setCopied(false);
    try {
      const r = await fetch("/api/ownership/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: input,
      });
      const j = await r.json();
      setResult(j);
    } catch (e) {
      setResult({
        accepted: 0,
        summary: [],
        ts_snippet: "",
        next_steps: [],
        error: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setLoading(false);
    }
  }

  async function copySnippet() {
    if (!result?.ts_snippet) return;
    try {
      await navigator.clipboard.writeText(result.ts_snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard refused */
    }
  }

  return (
    <div className="px-5 lg:px-8 py-6 space-y-5 max-w-5xl mx-auto">
      <header>
        <Link
          href="/dashboard/ownership"
          className="text-text-dim hover:text-text"
          style={{ fontSize: 12 }}
        >
          ← Ownership browser
        </Link>
        <span
          className="num font-semibold uppercase mt-3 block"
          style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
        >
          ● Admin · Ownership upload
        </span>
        <h1
          className="serif-italic mt-1.5"
          style={{ fontSize: 32, letterSpacing: -0.4 }}
        >
          <em>Add a tournament.</em>
        </h1>
        <p className="text-text-dim mt-2 max-w-2xl" style={{ fontSize: 13.5 }}>
          Paste the same JSON your standalone viewer uses. The validator
          checks structure and returns a TypeScript snippet to drop into{" "}
          <code className="num text-text">lib/data/ownership.ts</code>.
        </p>
      </header>

      <section className="rounded-[14px] border border-line p-5 bg-surface-1 space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-medium" style={{ fontSize: 16 }}>
            JSON input
          </h2>
          <button
            onClick={() => setInput(SAMPLE)}
            className="text-text-dim hover:text-text"
            style={{ fontSize: 11 }}
          >
            Load sample
          </button>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={SAMPLE}
          rows={14}
          className="w-full rounded-[8px] border border-line bg-bg px-3 py-2 text-text"
          style={{ fontSize: 12, fontFamily: "ui-monospace, monospace" }}
        />
        <button
          onClick={submit}
          disabled={!input.trim() || loading}
          className="rounded-[10px] px-4 py-2 disabled:opacity-40"
          style={{ background: "#8ee68e", color: "#0a1f14", fontSize: 13, fontWeight: 600 }}
        >
          {loading ? "Validating…" : "Validate"}
        </button>
      </section>

      {result?.error && (
        <section
          className="rounded-[14px] border p-5"
          style={{ borderColor: "#e87c7c", background: "#e87c7c0a", color: "#e87c7c" }}
        >
          <div style={{ fontSize: 13 }}>{result.error}</div>
          {result.issues && (
            <pre
              className="mt-3 text-text-dim whitespace-pre-wrap"
              style={{ fontSize: 11, fontFamily: "ui-monospace, monospace" }}
            >
              {JSON.stringify(result.issues, null, 2)}
            </pre>
          )}
        </section>
      )}

      {result && !result.error && (
        <>
          <section className="rounded-[14px] border border-line p-5 bg-surface-1 space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="font-medium" style={{ fontSize: 16 }}>
                ✓ Validated {result.accepted} tournament
                {result.accepted === 1 ? "" : "s"}
              </h2>
            </div>
            <div className="space-y-2">
              {result.summary.map((s) => (
                <div
                  key={s.name}
                  className="rounded-[8px] border border-line/60 bg-bg/40 px-3 py-2.5"
                  style={{ fontSize: 13 }}
                >
                  <div className="text-text font-medium">{s.name}</div>
                  <div className="text-text-dim mt-0.5" style={{ fontSize: 11 }}>
                    {s.field} players · top chalk:{" "}
                    {s.top_chalk.join(" · ")}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[14px] border border-line p-5 bg-surface-1 space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="font-medium" style={{ fontSize: 16 }}>
                TypeScript snippet
              </h2>
              <button
                onClick={copySnippet}
                className="rounded-[6px] px-2.5 py-1 border border-line hover:border-line-strong"
                style={{ fontSize: 11 }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre
              className="rounded-[8px] border border-line bg-bg p-3 whitespace-pre-wrap break-all text-text overflow-auto"
              style={{
                fontSize: 11,
                fontFamily: "ui-monospace, monospace",
                maxHeight: 320,
              }}
            >
              {result.ts_snippet}
            </pre>
            <div className="text-text-dim" style={{ fontSize: 12 }}>
              <div
                className="num font-semibold uppercase mb-1.5"
                style={{ fontSize: 10, letterSpacing: 1.2, color: "#a8b3ac" }}
              >
                Next steps
              </div>
              <ol className="space-y-1 ml-5 list-decimal">
                {result.next_steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
