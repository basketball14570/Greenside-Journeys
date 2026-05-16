"use client";

import { useEffect, useState } from "react";
import { BookChip, type Book } from "@/components/edge/primitives";

type ParsedBet = {
  book: string;
  player: string;
  market: string;
  line: number | null;
  americanOdds: number;
  stake: number;
  toWin: number;
  confidence: number;
};

const BOOK_MAP: Record<string, Book> = {
  draftkings: "DK",
  fanduel: "FD",
  prizepicks: "PP",
  underdog: "UD",
};

// Fallback shown until the per-user address resolves. The forwarding API
// returns the real bets+<token>@<domain> when the user is signed in.
const FALLBACK_INBOUND = "bets+yourtoken@greensidejourneys.com";

export default function UploadPage() {
  return (
    <div className="px-5 lg:px-8 py-6 space-y-6 max-w-5xl mx-auto">
      <header>
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
        >
          ● Ingestion
        </span>
        <h1
          className="serif-italic mt-1.5"
          style={{ fontSize: 36, letterSpacing: -0.4, fontStyle: "normal" }}
        >
          <em>Bring your bets in.</em>
        </h1>
        <p className="text-text-dim mt-2 max-w-2xl" style={{ fontSize: 14 }}>
          Two paths. Email forwarding is the easy one — set it up once, never
          think about it again. Screenshot upload is the fallback.
        </p>
      </header>

      <div className="grid lg:grid-cols-2 gap-5">
        <EmailForwardCard />
        <ScreenshotCard />
      </div>

      <div
        className="rounded-[14px] p-5 border border-line"
        style={{ background: "rgba(124,192,232,0.05)" }}
      >
        <div className="flex items-baseline gap-2 mb-2">
          <span style={{ fontSize: 14, color: "#7cc0e8" }}>ℹ</span>
          <span
            className="num font-semibold uppercase"
            style={{ fontSize: 10.5, letterSpacing: 1.2, color: "#7cc0e8" }}
          >
            Coming soon
          </span>
        </div>
        <p className="text-text-dim" style={{ fontSize: 13.5, lineHeight: 1.45 }}>
          <span className="text-text font-semibold">Mobile share sheet</span> —
          when the native app ships, you&apos;ll tap the share button on any
          bet slip in DraftKings, FanDuel, PrizePicks, or Underdog and pick
          &quot;Share to Greenside.&quot; Zero typing, zero screenshots, zero
          forwards. The lowest-friction path possible.
        </p>
      </div>
    </div>
  );
}

// ─── Email forwarding card ──────────────────────────────────
function EmailForwardCard() {
  const [copied, setCopied] = useState(false);
  const [address, setAddress] = useState<string>(FALLBACK_INBOUND);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/account/forwarding", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.signedIn && j.address) {
          setAddress(j.address);
          setSignedIn(true);
        } else {
          setSignedIn(!!j.signedIn);
        }
      })
      .catch(() => undefined);
  }, []);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Older browsers / no permission — fall through silently.
    }
  }

  return (
    <div className="rounded-[14px] bg-surface-1 border border-line p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="num font-semibold uppercase"
          style={{
            fontSize: 9.5,
            letterSpacing: 1.2,
            color: "#8ee68e",
            padding: "3px 8px",
            borderRadius: 4,
            background: "rgba(142,230,142,0.13)",
            border: "1px solid rgba(142,230,142,0.3)",
          }}
        >
          ★ Recommended
        </span>
        <span
          className="num text-text-muted"
          style={{ fontSize: 10.5, letterSpacing: 0.6 }}
        >
          Set up once · works forever
        </span>
      </div>

      <div
        className="serif-italic text-text mb-1"
        style={{ fontSize: 22, letterSpacing: -0.3, fontStyle: "normal" }}
      >
        Forward bet emails
      </div>
      <p className="text-text-dim mb-4" style={{ fontSize: 13.5, lineHeight: 1.45 }}>
        Every sportsbook emails a confirmation when you place a bet. Forward
        that email to your unique address and we&apos;ll parse the line, odds,
        and stake automatically.
      </p>

      <div
        className="rounded-[10px] p-3 mb-4 flex items-center gap-3"
        style={{
          background: "rgba(0,0,0,0.3)",
          border: "1px dashed rgba(255,255,255,0.12)",
        }}
      >
        <span
          className="num text-text flex-1 truncate"
          style={{ fontSize: 13, letterSpacing: 0.3 }}
        >
          {address}
        </span>
        <button
          onClick={copyAddress}
          className="font-semibold transition"
          style={{
            background: copied ? "#8ee68e" : "#1e4030",
            color: copied ? "#06140c" : "#f0ebe0",
            padding: "6px 11px",
            borderRadius: 5,
            fontSize: 11.5,
            letterSpacing: 0.4,
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div
        className="num font-semibold uppercase text-text-muted mb-2"
        style={{ fontSize: 9.5, letterSpacing: 1.2 }}
      >
        Or auto-forward from your inbox
      </div>
      <div className="space-y-2 text-text-dim" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
        <Step
          n="1"
          body={
            <>
              In Gmail, open Settings → <em>Forwarding and POP/IMAP</em> →
              add the address above.
            </>
          }
        />
        <Step
          n="2"
          body={
            <>
              Create a filter: from{" "}
              <span className="num text-text">@draftkings.com</span>,{" "}
              <span className="num text-text">@fanduel.com</span>,{" "}
              <span className="num text-text">@prizepicks.com</span>,{" "}
              <span className="num text-text">@underdogfantasy.com</span> →
              forward + mark as read.
            </>
          }
        />
        <Step
          n="3"
          body={<>That&apos;s it. Every future bet shows up in your dashboard within ~30 seconds of placement.</>}
        />
      </div>

      <div
        className="mt-4 pt-3 border-t border-line num text-text-muted"
        style={{ fontSize: 10.5, letterSpacing: 0.4 }}
      >
        {signedIn === null
          ? "Loading address…"
          : signedIn
            ? "This is your unique address — rotate it from /dashboard/account."
            : "Sign in to claim your unique forwarding address."}
      </div>
    </div>
  );
}

function Step({ n, body }: { n: string; body: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span
        className="num font-semibold shrink-0"
        style={{
          fontSize: 10,
          color: "#8ee68e",
          width: 20,
          height: 20,
          borderRadius: 99,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(142,230,142,0.13)",
          border: "1px solid rgba(142,230,142,0.3)",
        }}
      >
        {n}
      </span>
      <span>{body}</span>
    </div>
  );
}

// ─── Screenshot card ────────────────────────────────────────
function ScreenshotCard() {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ParsedBet[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  async function saveToBets() {
    if (!result || result.length === 0) return;
    setSaving(true);
    setSaved(null);
    setError(null);
    try {
      const r = await fetch("/api/bets/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bets: result, source: "screenshot" }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
      setSaved(`Saved ${j.inserted}. Confirm them on /dashboard/bets.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!file) return;
    setParsing(true);
    setError(null);
    setResult(null);
    try {
      const buf = await file.arrayBuffer();
      const b64 = btoa(
        new Uint8Array(buf).reduce((s, b) => s + String.fromCharCode(b), ""),
      );
      const res = await fetch("/api/bets/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: b64, mediaType: file.type }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data.bets);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse");
    } finally {
      setParsing(false);
    }
  }

  return (
    <div className="rounded-[14px] bg-surface-1 border border-line p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="num font-semibold uppercase"
          style={{
            fontSize: 9.5,
            letterSpacing: 1.2,
            color: "#a8b3ac",
            padding: "3px 8px",
            borderRadius: 4,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          Fallback
        </span>
        <span
          className="num text-text-muted"
          style={{ fontSize: 10.5, letterSpacing: 0.6 }}
        >
          For bets that don&apos;t email
        </span>
      </div>

      <div
        className="serif-italic text-text mb-1"
        style={{ fontSize: 22, letterSpacing: -0.3, fontStyle: "normal" }}
      >
        Upload a screenshot
      </div>
      <p className="text-text-dim mb-4" style={{ fontSize: 13.5, lineHeight: 1.45 }}>
        Drop a bet slip image. Claude vision extracts the structured fields with
        a confidence score — low-confidence parses prompt for a one-tap edit.
      </p>

      <label className="block cursor-pointer flex-1">
        <div
          className="rounded-[12px] p-8 text-center transition h-full flex flex-col items-center justify-center"
          style={{
            border: "2px dashed rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.18)",
          }}
        >
          {file ? (
            <>
              <div className="text-text font-semibold mb-1">{file.name}</div>
              <div className="num text-text-muted" style={{ fontSize: 11 }}>
                {(file.size / 1024).toFixed(1)} KB
              </div>
            </>
          ) : (
            <>
              <div
                className="serif-italic mb-1.5"
                style={{
                  fontSize: 18,
                  fontStyle: "normal",
                  color: "#f0ebe0",
                }}
              >
                Drop or click to select
              </div>
              <div
                className="num text-text-muted"
                style={{ fontSize: 10.5, letterSpacing: 0.5 }}
              >
                PNG or JPG · up to 10MB
              </div>
            </>
          )}
          <input
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </label>

      <button
        disabled={!file || parsing}
        onClick={handleSubmit}
        className="mt-4 font-bold rounded-md disabled:opacity-40"
        style={{
          background: "#8ee68e",
          color: "#06140c",
          padding: "10px 0",
          fontSize: 13.5,
        }}
      >
        {parsing ? "Parsing slip…" : "Extract bets"}
      </button>

      {error && (
        <div className="mt-3 text-red" style={{ fontSize: 12.5 }}>
          {error}
        </div>
      )}

      {result && result.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-3">
            <button
              onClick={saveToBets}
              disabled={saving}
              className="rounded-[8px] px-3 py-1.5 font-semibold disabled:opacity-40"
              style={{ background: "#8ee68e", color: "#0a1f14", fontSize: 12 }}
            >
              {saving ? "Saving…" : `Save ${result.length} to my bets`}
            </button>
            {saved && (
              <span className="text-text-dim" style={{ fontSize: 11 }}>
                {saved}
              </span>
            )}
          </div>
          {result.map((b, i) => {
            const bookChip = BOOK_MAP[b.book.toLowerCase()] ?? null;
            return (
              <div
                key={i}
                className="rounded-[10px] border border-line p-3"
                style={{ background: "rgba(0,0,0,0.18)" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  {bookChip && <BookChip book={bookChip} />}
                  <span
                    className="text-text font-semibold flex-1 truncate"
                    style={{ fontSize: 13.5 }}
                  >
                    {b.player}
                  </span>
                  <span
                    className="num text-text"
                    style={{ fontSize: 12 }}
                  >
                    {b.americanOdds > 0 ? "+" : ""}
                    {b.americanOdds}
                  </span>
                </div>
                <div className="text-text-dim" style={{ fontSize: 12 }}>
                  {b.market}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
