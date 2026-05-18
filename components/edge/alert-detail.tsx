// Mobile alert detail screen — ported from mobile-alert.jsx.

import Link from "next/link";
import { BookChip, SectionLabel } from "./primitives";

export function AlertDetailHeader() {
  return (
    <div className="flex items-center justify-between px-4 pt-2 pb-4">
      <Link
        href="/dashboard"
        className="inline-flex w-8 h-8 items-center justify-center rounded-full bg-surface-2 border border-line"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M15 5l-7 7 7 7"
            stroke="#f0ebe0"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
      <div className="flex flex-col items-center gap-0.5">
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 9.5, letterSpacing: 1.2, color: "#8ee68e" }}
        >
          ◐ Wave Shift Alert
        </span>
        <span className="num text-text-muted" style={{ fontSize: 10 }}>
          7:42 AM · 2 min ago
        </span>
      </div>
      <span className="inline-flex w-8 h-8 items-center justify-center rounded-full bg-surface-2 border border-line">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 12v6a2 2 0 002 2h12a2 2 0 002-2v-6M16 6l-4-4-4 4M12 2v13"
            stroke="#f0ebe0"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  );
}

export function AlertHero() {
  return (
    <div
      className="mx-5 mb-5 px-4 py-5 rounded-[18px]"
      style={{
        background:
          "linear-gradient(155deg, rgba(63,138,82,0.4) 0%, #0a1f14 60%)",
        border: "1px solid rgba(142,230,142,0.2)",
      }}
    >
      <div
        className="serif-italic text-text mb-3.5"
        style={{ fontSize: 26, lineHeight: 1.18, letterSpacing: -0.3, fontStyle: "normal" }}
      >
        <em>AM wave gaining</em>{" "}
        <span style={{ color: "#8ee68e" }}>~0.4 strokes</span> of EV.
      </div>
      <div className="text-text-dim mb-4" style={{ fontSize: 14.5, lineHeight: 1.45 }}>
        Wind forecast for Quail Hollow jumped from 8 → 18 mph since 6:00 AM.
        Your AM-wave players started early and are banking strokes before the PM
        wave tees off into stronger conditions.
      </div>

      <div className="flex gap-3">
        <SplitTile color="#8ee68e" label="AM Wave · Yours" value="+0.4" count="4 bets exposed" />
        <SplitTile color="#e07868" label="PM Wave · Yours" value="−0.4" count="1 bet exposed" />
      </div>
    </div>
  );
}

function SplitTile({
  color,
  label,
  value,
  count,
}: {
  color: string;
  label: string;
  value: string;
  count: string;
}) {
  return (
    <div
      className="flex-1 px-3 py-2.5 rounded-[10px]"
      style={{
        background: `${color}14`,
        border: `1px solid ${color}33`,
      }}
    >
      <div
        className="num font-semibold uppercase mb-1"
        style={{ fontSize: 9.5, letterSpacing: 1.1, color }}
      >
        {label}
      </div>
      <div
        className="serif-italic"
        style={{ fontSize: 28, lineHeight: 1, color }}
      >
        {value}
        <span className="num" style={{ fontSize: 11, fontStyle: "normal", color }}>
          sg
        </span>
      </div>
      <div className="num text-text-dim mt-1.5" style={{ fontSize: 10 }}>
        {count}
      </div>
    </div>
  );
}

const EXPOSURE = [
  { wave: "AM" as const, book: "DK" as const, player: "Scottie Scheffler", market: "Top 10", stake: 1.0, move: 12, before: "+250", after: "+205", sens: 0.18 },
  { wave: "AM" as const, book: "FD" as const, player: "Rory McIlroy", market: "R2 U70", stake: 1.5, move: 22, before: "+140", after: "+105", sens: 0.22, hedge: true },
  { wave: "AM" as const, book: "UD" as const, player: "Collin Morikawa", market: "Top 20", stake: 1.0, move: 4, before: "+140", after: "+125", sens: 0.31 },
  { wave: "AM" as const, book: "DK" as const, player: "Schauffele vs Spieth", market: "R2 Matchup", stake: 0.75, move: 6, before: "-115", after: "-125", sens: 0.28 },
  { wave: "PM" as const, book: "PP" as const, player: "Patrick Cantlay", market: "FH O8.5", stake: 0.5, move: -8, before: "pick", after: "pick", sens: 0.41 },
];

export function Exposure() {
  return (
    <div className="mb-5">
      <SectionLabel>Exposed Tickets · 5</SectionLabel>
      <div className="mx-5 rounded-[14px] bg-surface-1 border border-line">
        {EXPOSURE.map((b, i) => (
          <ExposureRow key={i} b={b} last={i === EXPOSURE.length - 1} />
        ))}
      </div>
    </div>
  );
}

function ExposureRow({
  b,
  last,
}: {
  b: (typeof EXPOSURE)[number];
  last: boolean;
}) {
  const positive = b.move > 0;
  return (
    <div
      className="relative flex flex-col gap-2 px-3.5 py-3"
      style={{
        borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.06)",
        background: b.wave === "AM" ? "rgba(142,230,142,0.04)" : "transparent",
      }}
    >
      <div
        className="absolute"
        style={{
          left: 0,
          top: 0,
          bottom: 0,
          width: 2,
          background: b.wave === "AM" ? "#8ee68e" : "#e07868",
        }}
      />
      <div className="flex items-center gap-2">
        <span
          className="num font-semibold"
          style={{
            fontSize: 9.5,
            letterSpacing: 1,
            color: b.wave === "AM" ? "#8ee68e" : "#e07868",
            padding: "2px 5px",
            borderRadius: 3,
            background:
              b.wave === "AM"
                ? "rgba(142,230,142,0.13)"
                : "rgba(224,120,104,0.13)",
          }}
        >
          {b.wave} WAVE
        </span>
        <BookChip book={b.book} />
        {b.hedge && (
          <span
            className="num font-semibold uppercase"
            style={{
              fontSize: 9.5,
              letterSpacing: 0.8,
              color: "#f5c558",
              padding: "2px 6px",
              borderRadius: 4,
              background: "rgba(245,197,88,0.13)",
              border: "1px solid rgba(245,197,88,0.33)",
            }}
          >
            Hedge Open
          </span>
        )}
        <span className="flex-1" />
        <span
          className="num font-bold"
          style={{
            fontSize: 12,
            color: positive ? "#8ee68e" : "#e07868",
          }}
        >
          {positive ? "+" : ""}
          {b.move}% EV
        </span>
      </div>

      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-text font-semibold" style={{ fontSize: 14.5 }}>
            {b.player}
          </div>
          <div className="text-text-dim mt-0.5" style={{ fontSize: 12.5 }}>
            {b.market} · <span className="num">{b.stake}u</span>
          </div>
        </div>
        <div className="text-right">
          <div className="num text-text-dim" style={{ fontSize: 11.5 }}>
            <span style={{ textDecoration: "line-through", opacity: 0.6 }}>
              {b.before}
            </span>
            <span className="mx-1">→</span>
            <span
              className="font-semibold"
              style={{ color: positive ? "#8ee68e" : "#e07868" }}
            >
              {b.after}
            </span>
          </div>
          <div
            className="num text-text-muted mt-1"
            style={{ fontSize: 10, letterSpacing: 0.5 }}
          >
            Wind sens. <span className="text-text">{b.sens.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlayerSensitivity() {
  const players = [
    { name: "Cantlay", v: 0.41, wave: "PM" as const },
    { name: "Morikawa", v: 0.31, wave: "AM" as const },
    { name: "Schauffele", v: 0.28, wave: "AM" as const },
    { name: "McIlroy", v: 0.22, wave: "AM" as const },
    { name: "Scheffler", v: 0.18, wave: "AM" as const },
  ];
  const max = 0.45;
  return (
    <div className="mb-5">
      <SectionLabel>Wind Sensitivity · Your Players</SectionLabel>
      <div className="mx-5 p-3.5 rounded-[14px] bg-surface-1 border border-line">
        <div
          className="text-text-dim mb-3.5"
          style={{ fontSize: 12, lineHeight: 1.4 }}
        >
          Strokes lost per round in{" "}
          <span className="text-text font-semibold">15+ mph wind</span> vs. their
          no-wind baseline. Lower is better.
        </div>
        {players.map((p, i) => {
          const color =
            p.v > 0.35 ? "#e07868" : p.v > 0.25 ? "#f5c558" : "#8ee68e";
          return (
            <div
              key={i}
              className="flex items-center gap-2.5"
              style={{ marginBottom: i < players.length - 1 ? 10 : 0 }}
            >
              <span className="text-text" style={{ fontSize: 13, width: 88 }}>
                {p.name}
              </span>
              <div
                className="flex-1 rounded-full overflow-hidden"
                style={{ height: 6, background: "rgba(255,255,255,0.04)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(p.v / max) * 100}%`, background: color }}
                />
              </div>
              <span
                className="num font-semibold text-text text-right"
                style={{ fontSize: 11.5, width: 32 }}
              >
                {p.v.toFixed(2)}
              </span>
              <span
                className="num font-semibold text-right"
                style={{
                  fontSize: 9.5,
                  letterSpacing: 0.6,
                  width: 22,
                  color: p.wave === "AM" ? "#8ee68e" : "#e07868",
                }}
              >
                {p.wave}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AlertActionBar() {
  return (
    <div className="px-5 pt-3 pb-6 flex gap-2.5 border-t border-line bg-bgDeep">
      <button
        className="flex-1 rounded-xl text-text font-semibold bg-surface-2 border border-line"
        style={{ height: 48, fontSize: 14 }}
      >
        Snooze 1h
      </button>
      <button
        className="flex-[1.4] rounded-xl font-bold"
        style={{
          height: 48,
          fontSize: 14,
          background: "#8ee68e",
          color: "#06140c",
        }}
      >
        Review hedges →
      </button>
    </div>
  );
}
