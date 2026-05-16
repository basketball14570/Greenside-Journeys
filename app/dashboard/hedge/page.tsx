"use client";

import { useMemo, useState } from "react";
import { BookChip, type Book } from "@/components/edge/primitives";
import { DEMO_BETS } from "@/lib/demo-data";
import {
  americanToDecimal,
  hedgeAtStake,
  impliedProbability,
  optimalEqualizeHedge,
} from "@/lib/hedge";

// Synthetic cross-book live prices on the inverse side of each open bet.
// Real impl pulls from The Odds API.
const HEDGE_PRICES: Record<string, { book: Book; odds: number; label: string }[]> = {
  "Rory McIlroy": [
    { book: "FD", odds: +145, label: "R2 Score Over 70" },
    { book: "DK", odds: +135, label: "R2 Score Over 70" },
    { book: "PP", odds: +120, label: "R2 Score Over 69.5" },
  ],
  "Scottie Scheffler": [
    { book: "FD", odds: -180, label: "Outside Top 10" },
    { book: "DK", odds: -195, label: "Outside Top 10" },
  ],
  "Collin Morikawa": [
    { book: "DK", odds: -130, label: "Outside Top 20" },
    { book: "FD", odds: -125, label: "Outside Top 20" },
  ],
  "Patrick Cantlay": [
    { book: "FD", odds: -110, label: "Fairways Hit Under 8.5" },
    { book: "DK", odds: -105, label: "Fairways Hit Under 8.5" },
  ],
};

export default function HedgePage() {
  const liveBets = DEMO_BETS.filter((b) => b.status === "live");
  const [betId, setBetId] = useState(liveBets[2].player);

  const bet = liveBets.find((b) => b.player === betId)!;
  const americanOdds = parseAmerican(bet.line);

  const hedgeOptions = HEDGE_PRICES[bet.player] ?? [];
  const [selectedHedge, setSelectedHedge] = useState(0);
  const hedge = hedgeOptions[selectedHedge] ?? hedgeOptions[0];

  const optimal = useMemo(
    () =>
      hedge && americanOdds
        ? optimalEqualizeHedge(bet.stake, americanOdds, hedge.odds)
        : null,
    [bet.stake, americanOdds, hedge],
  );

  const [customStake, setCustomStake] = useState<number | null>(null);
  const custom = useMemo(
    () =>
      hedge && americanOdds && customStake != null
        ? hedgeAtStake(bet.stake, americanOdds, hedge.odds, customStake)
        : null,
    [bet.stake, americanOdds, hedge, customStake],
  );

  const noHedgeProfit = americanOdds
    ? +(bet.stake * (americanToDecimal(americanOdds) - 1)).toFixed(2)
    : 0;

  return (
    <div className="px-5 lg:px-8 py-6 space-y-6 max-w-6xl mx-auto">
      <header>
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
        >
          ● Hedge Lab
        </span>
        <h1
          className="serif-italic mt-1.5"
          style={{ fontSize: 36, letterSpacing: -0.4, fontStyle: "normal" }}
        >
          <em>Lock the profit.</em>
        </h1>
        <p className="text-text-dim mt-2 max-w-2xl" style={{ fontSize: 14 }}>
          Pick any live bet and see the optimal cross-book hedge — the stake
          size that guarantees the same payout whether your original wins or
          loses.
        </p>
      </header>

      {/* Bet picker */}
      <div className="rounded-[14px] bg-surface-1 border border-line p-5">
        <span
          className="num font-semibold uppercase text-text-muted"
          style={{ fontSize: 9.5, letterSpacing: 1.2 }}
        >
          Choose a live bet
        </span>
        <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {liveBets.map((b) => {
            const active = b.player === betId;
            return (
              <button
                key={b.player}
                onClick={() => {
                  setBetId(b.player);
                  setSelectedHedge(0);
                  setCustomStake(null);
                }}
                className="text-left p-3 rounded-[10px] transition"
                style={{
                  background: active ? "rgba(142,230,142,0.08)" : "rgba(0,0,0,0.18)",
                  border: active
                    ? "1px solid rgba(142,230,142,0.35)"
                    : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <BookChip book={b.book} />
                  <span className="flex-1" />
                  <span
                    className="num text-text-dim"
                    style={{ fontSize: 11 }}
                  >
                    {b.line}
                  </span>
                </div>
                <div
                  className="text-text font-semibold truncate"
                  style={{ fontSize: 13 }}
                >
                  {b.player}
                </div>
                <div className="text-text-dim mt-0.5" style={{ fontSize: 11.5 }}>
                  {b.market}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {hedgeOptions.length > 0 && hedge && optimal && (
        <div className="grid lg:grid-cols-2 gap-5">
          <HedgePickerCard
            options={hedgeOptions}
            selected={selectedHedge}
            onPick={(i) => {
              setSelectedHedge(i);
              setCustomStake(null);
            }}
          />

          <div className="rounded-[14px] bg-surface-1 border border-line p-5">
            <span
              className="num font-semibold uppercase text-text-muted"
              style={{ fontSize: 9.5, letterSpacing: 1.2 }}
            >
              Optimal equalizing hedge
            </span>

            <div className="mt-3 grid grid-cols-2 gap-4">
              <KV label="Stake on hedge" value={`${optimal.hedgeStake}u`} />
              <KV label="On" value={`${hedge.book} ${hedge.odds > 0 ? "+" : ""}${hedge.odds}`} />
            </div>

            <div
              className="mt-5 p-4 rounded-[12px]"
              style={{
                background: "rgba(142,230,142,0.08)",
                border: "1px solid rgba(142,230,142,0.3)",
              }}
            >
              <div
                className="num font-semibold uppercase mb-1"
                style={{ fontSize: 10, letterSpacing: 1.1, color: "#8ee68e" }}
              >
                Locked profit · either outcome
              </div>
              <div
                className="serif-italic"
                style={{
                  fontSize: 48,
                  lineHeight: 1,
                  fontStyle: "italic",
                  color: "#8ee68e",
                }}
              >
                {optimal.guaranteed > 0 ? "+" : ""}
                {optimal.guaranteed.toFixed(2)}
                <span
                  className="num"
                  style={{ fontSize: 14, fontStyle: "normal", marginLeft: 4 }}
                >
                  u
                </span>
              </div>
              <div
                className="num text-text-dim mt-2"
                style={{ fontSize: 11.5, letterSpacing: 0.4 }}
              >
                vs. {noHedgeProfit > 0 ? "+" : ""}
                {noHedgeProfit}u upside if you don&apos;t hedge
              </div>
            </div>

            {/* Custom stake explorer */}
            <div className="mt-5">
              <div
                className="num font-semibold uppercase text-text-muted mb-2"
                style={{ fontSize: 9.5, letterSpacing: 1.2 }}
              >
                Or pick your own hedge stake
              </div>
              <input
                type="range"
                min={0}
                max={optimal.hedgeStake * 2}
                step={0.05}
                value={customStake ?? optimal.hedgeStake}
                onChange={(e) => setCustomStake(+e.target.value)}
                className="w-full"
                style={{ accentColor: "#8ee68e" }}
              />
              <div className="flex justify-between num text-text-muted mt-1"
                style={{ fontSize: 10.5, letterSpacing: 0.4 }}
              >
                <span>0u</span>
                <span>
                  Picked:{" "}
                  <span className="text-text font-semibold">
                    {(customStake ?? optimal.hedgeStake).toFixed(2)}u
                  </span>
                </span>
                <span>{(optimal.hedgeStake * 2).toFixed(2)}u</span>
              </div>
            </div>

            {custom && customStake != null && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Scenario
                  label="If original wins"
                  value={custom.profitIfOriginalWins}
                />
                <Scenario
                  label="If hedge wins"
                  value={custom.profitIfHedgeWins}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {hedgeOptions.length === 0 && (
        <div className="rounded-[14px] bg-surface-1 border border-line p-10 text-center text-text-dim" style={{ fontSize: 13 }}>
          No cross-book hedge prices available for this bet right now. Live odds
          feed (The Odds API) will populate this when the API key is set.
        </div>
      )}

      <div className="rounded-[14px] bg-surface-1 border border-line p-5">
        <span
          className="num font-semibold uppercase text-text-muted"
          style={{ fontSize: 9.5, letterSpacing: 1.2 }}
        >
          The math
        </span>
        {americanOdds && (
          <p className="text-text-dim mt-3" style={{ fontSize: 13, lineHeight: 1.55 }}>
            Your original bet at{" "}
            <span className="num text-text font-semibold">
              {americanOdds > 0 ? "+" : ""}
              {americanOdds}
            </span>{" "}
            implies a{" "}
            <span className="num text-text font-semibold">
              {(impliedProbability(americanOdds) * 100).toFixed(1)}%
            </span>{" "}
            win chance. Hedging at{" "}
            <span className="num text-text font-semibold">
              {hedge && (hedge.odds > 0 ? "+" : "")}
              {hedge?.odds ?? "—"}
            </span>{" "}
            on the inverse side covers the other{" "}
            <span className="num text-text font-semibold">
              {hedge ? `${(impliedProbability(hedge.odds) * 100).toFixed(1)}%` : "—"}
            </span>{" "}
            of outcomes. Combined book vig is the gap between locked profit and
            the no-hedge upside.
          </p>
        )}
      </div>
    </div>
  );
}

function HedgePickerCard({
  options,
  selected,
  onPick,
}: {
  options: { book: Book; odds: number; label: string }[];
  selected: number;
  onPick: (i: number) => void;
}) {
  return (
    <div className="rounded-[14px] bg-surface-1 border border-line p-5">
      <span
        className="num font-semibold uppercase text-text-muted"
        style={{ fontSize: 9.5, letterSpacing: 1.2 }}
      >
        Available hedge prices · live across books
      </span>
      <div className="mt-3 space-y-2">
        {options.map((o, i) => {
          const active = i === selected;
          return (
            <button
              key={i}
              onClick={() => onPick(i)}
              className="w-full flex items-center gap-3 p-3 rounded-[10px] transition text-left"
              style={{
                background: active ? "rgba(142,230,142,0.08)" : "rgba(0,0,0,0.18)",
                border: active
                  ? "1px solid rgba(142,230,142,0.35)"
                  : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <BookChip book={o.book} />
              <span
                className="text-text flex-1"
                style={{ fontSize: 13 }}
              >
                {o.label}
              </span>
              <span
                className="num font-semibold text-text"
                style={{ fontSize: 14 }}
              >
                {o.odds > 0 ? "+" : ""}
                {o.odds}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        className="num font-semibold uppercase text-text-muted"
        style={{ fontSize: 9.5, letterSpacing: 1.2 }}
      >
        {label}
      </div>
      <div
        className="serif-italic mt-1"
        style={{ fontSize: 28, lineHeight: 1, fontStyle: "italic", color: "#f0ebe0" }}
      >
        {value}
      </div>
    </div>
  );
}

function Scenario({ label, value }: { label: string; value: number }) {
  const color = value >= 0 ? "#8ee68e" : "#e07868";
  return (
    <div
      className="rounded-[10px] p-3"
      style={{ background: "rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div
        className="num font-semibold uppercase text-text-muted"
        style={{ fontSize: 9, letterSpacing: 1.1 }}
      >
        {label}
      </div>
      <div
        className="num font-bold mt-1"
        style={{ fontSize: 18, color }}
      >
        {value > 0 ? "+" : ""}
        {value.toFixed(2)}u
      </div>
    </div>
  );
}

function parseAmerican(line: string): number | null {
  const m = line.match(/[+-]?\d+/);
  if (!m) return null;
  const n = parseInt(m[0], 10);
  return Number.isFinite(n) ? n : null;
}
