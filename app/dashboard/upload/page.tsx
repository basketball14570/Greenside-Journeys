"use client";

import { useState } from "react";

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
      const b64 = Buffer.from(buf).toString("base64");
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
    <div className="max-w-3xl mx-auto space-y-8">
      <header>
        <div className="text-xs uppercase tracking-[0.2em] text-gold mb-1">
          Ingestion
        </div>
        <h1 className="font-display text-4xl mb-2">Upload a Bet Slip</h1>
        <p className="text-ink-mid">
          Drop a screenshot from DraftKings, FanDuel, PrizePicks, Underdog, or
          Caesars. We&apos;ll extract the line, odds, and stake automatically.
        </p>
      </header>

      <div className="card p-8">
        <label className="block">
          <div className="border-2 border-dashed border-cream-dark rounded-card p-12 text-center cursor-pointer hover:border-gold transition">
            {file ? (
              <div>
                <div className="font-medium">{file.name}</div>
                <div className="text-sm text-ink-light">
                  {(file.size / 1024).toFixed(1)} KB
                </div>
              </div>
            ) : (
              <div className="text-ink-mid">
                <div className="font-display text-xl mb-2">
                  Drop screenshot or click to select
                </div>
                <div className="text-sm">PNG or JPG · up to 10MB</div>
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
          className="mt-6 w-full bg-green-deep text-white py-3 rounded font-semibold disabled:opacity-40 hover:bg-green-mid"
        >
          {parsing ? "Parsing slip…" : "Extract Bets"}
        </button>

        {error && (
          <div className="mt-4 text-sm text-signal-negative">{error}</div>
        )}
      </div>

      {result && (
        <div className="space-y-3">
          <h2 className="font-display text-2xl">Extracted</h2>
          {result.map((b, i) => (
            <div key={i} className="card p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs uppercase tracking-wider text-ink-light mb-1">
                    {b.book}
                  </div>
                  <div className="font-display text-lg">{b.player}</div>
                  <div className="text-sm text-ink-mid">{b.market}</div>
                </div>
                <div className="text-right">
                  <div className="num">
                    {b.americanOdds > 0 ? "+" : ""}
                    {b.americanOdds}
                  </div>
                  <div className="num text-sm text-ink-mid">
                    ${b.stake.toFixed(2)} → ${b.toWin.toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-xs text-ink-light">
                Confidence {(b.confidence * 100).toFixed(0)}%
                {b.confidence < 0.8 ? " · Tap to confirm" : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
