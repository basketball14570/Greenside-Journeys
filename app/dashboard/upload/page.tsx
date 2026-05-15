"use client";

import { useState } from "react";
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

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ParsedBet[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    <div className="max-w-3xl mx-auto px-5 lg:px-0 py-6 space-y-6">
      <header>
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
        >
          ● Ingestion
        </span>
        <h1
          className="serif-italic mt-1.5 mb-2"
          style={{ fontSize: 36, letterSpacing: -0.4, fontStyle: "normal" }}
        >
          <em>Upload a bet slip.</em>
        </h1>
        <p className="text-text-dim" style={{ fontSize: 14 }}>
          Drop a screenshot from DraftKings, FanDuel, PrizePicks, or Underdog.
          We&apos;ll extract the line, odds, and stake automatically.
        </p>
      </header>

      <div className="rounded-[14px] bg-surface-1 border border-line p-6">
        <label className="block cursor-pointer">
          <div
            className="rounded-[14px] p-10 text-center transition"
            style={{
              border: "2px dashed rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.18)",
            }}
          >
            {file ? (
              <div>
                <div className="text-text font-semibold">{file.name}</div>
                <div
                  className="num text-text-dim mt-1"
                  style={{ fontSize: 12 }}
                >
                  {(file.size / 1024).toFixed(1)} KB
                </div>
              </div>
            ) : (
              <div className="text-text-dim">
                <div
                  className="serif-italic mb-2"
                  style={{
                    fontSize: 20,
                    fontStyle: "normal",
                    color: "#f0ebe0",
                  }}
                >
                  Drop screenshot or click to select
                </div>
                <div
                  className="num text-text-muted"
                  style={{ fontSize: 11, letterSpacing: 0.5 }}
                >
                  PNG or JPG · up to 10MB
                </div>
              </div>
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
          className="mt-5 w-full rounded-md font-bold disabled:opacity-40"
          style={{
            background: "#8ee68e",
            color: "#06140c",
            padding: "12px 0",
            fontSize: 14,
          }}
        >
          {parsing ? "Parsing slip…" : "Extract bets"}
        </button>

        {error && (
          <div className="mt-3 text-red" style={{ fontSize: 13 }}>
            {error}
          </div>
        )}
      </div>

      {result && (
        <div className="space-y-3">
          <h2
            className="serif-italic"
            style={{ fontSize: 24, fontStyle: "normal" }}
          >
            Extracted
          </h2>
          {result.map((b, i) => {
            const bookChip = BOOK_MAP[b.book.toLowerCase()] ?? null;
            return (
              <div
                key={i}
                className="rounded-[14px] bg-surface-1 border border-line p-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      {bookChip && <BookChip book={bookChip} />}
                      <span
                        className="num text-text-muted uppercase"
                        style={{ fontSize: 10, letterSpacing: 1.1 }}
                      >
                        {b.book}
                      </span>
                    </div>
                    <div
                      className="text-text font-semibold"
                      style={{ fontSize: 15 }}
                    >
                      {b.player}
                    </div>
                    <div
                      className="text-text-dim mt-0.5"
                      style={{ fontSize: 13 }}
                    >
                      {b.market}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="num text-text font-semibold">
                      {b.americanOdds > 0 ? "+" : ""}
                      {b.americanOdds}
                    </div>
                    <div
                      className="num text-text-dim mt-0.5"
                      style={{ fontSize: 12 }}
                    >
                      ${b.stake.toFixed(2)} → ${b.toWin.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div
                  className="num text-text-muted mt-2"
                  style={{ fontSize: 11, letterSpacing: 0.5 }}
                >
                  Confidence {(b.confidence * 100).toFixed(0)}%
                  {b.confidence < 0.8 ? " · Tap to confirm" : ""}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
