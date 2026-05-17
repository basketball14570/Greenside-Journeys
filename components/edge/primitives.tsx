// Greenside design primitives — ported from Claude Design handoff (theme.jsx).
// Names + visual output match the prototype exactly; idiomatic React + Tailwind here.

import type { ReactNode } from "react";

export type Book = "DK" | "FD" | "PP" | "UD";
export type Status = "live" | "pending" | "graded" | "won" | "lost";

// ─── Sportsbook chip ────────────────────────────────────────
const BOOK_PALETTE: Record<Book, { bg: string; fg: string }> = {
  DK: { bg: "#1a3326", fg: "#cfe8d4" },
  FD: { bg: "#1a2b33", fg: "#cfe1eb" },
  PP: { bg: "#33291a", fg: "#ebd9bf" },
  UD: { bg: "#2b1a33", fg: "#dccfeb" },
};

export function BookChip({
  book,
  size = "sm",
}: {
  book: Book;
  size?: "sm" | "md";
}) {
  const p = BOOK_PALETTE[book];
  const h = size === "sm" ? 18 : 22;
  return (
    <span
      className="num inline-flex items-center justify-center font-semibold leading-none border border-white/5"
      style={{
        height: h,
        minWidth: h * 1.7,
        padding: "0 6px",
        borderRadius: 4,
        background: p.bg,
        color: p.fg,
        fontSize: size === "sm" ? 10 : 11.5,
        letterSpacing: 0.6,
      }}
    >
      {book}
    </span>
  );
}

// ─── Status dot ─────────────────────────────────────────────
const STATUS_MAP: Record<Status, { c: string; l: string; pulse: boolean }> = {
  live: { c: "#8ee68e", l: "LIVE", pulse: true },
  pending: { c: "#7cc0e8", l: "PENDING", pulse: false },
  graded: { c: "#6c7a72", l: "GRADED", pulse: false },
  won: { c: "#8ee68e", l: "WON", pulse: false },
  lost: { c: "#e07868", l: "LOST", pulse: false },
};

export function StatusDot({
  status,
  withLabel = false,
}: {
  status: Status;
  withLabel?: boolean;
}) {
  const s = STATUS_MAP[status];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`shrink-0 rounded-full ${s.pulse ? "gs-status-pulse" : ""}`}
        style={{
          width: 7,
          height: 7,
          background: s.c,
          boxShadow: s.pulse ? `0 0 0 3px ${s.c}22, 0 0 8px ${s.c}66` : "none",
        }}
      />
      {withLabel && (
        <span
          className="num font-semibold"
          style={{ fontSize: 10, letterSpacing: 0.8, color: s.c }}
        >
          {s.l}
        </span>
      )}
    </span>
  );
}

// ─── Section header ─────────────────────────────────────────
export function SectionLabel({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between px-5 mb-2.5">
      <span
        className="num font-semibold uppercase text-text-muted"
        style={{ fontSize: 10.5, letterSpacing: 1.4 }}
      >
        {children}
      </span>
      {action && (
        <span
          className="text-text-dim underline underline-offset-[3px]"
          style={{ fontSize: 12 }}
        >
          {action}
        </span>
      )}
    </div>
  );
}

// ─── Card ───────────────────────────────────────────────────
export function Card({
  children,
  padding = 16,
  className = "",
  style,
}: {
  children: ReactNode;
  padding?: number | string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`bg-surface-1 border border-line rounded-[14px] ${className}`}
      style={{ padding, ...style }}
    >
      {children}
    </div>
  );
}

// ─── Big stat (serif italic numerics) ───────────────────────
export function Stat({
  value,
  unit,
  label,
  accent,
}: {
  value: ReactNode;
  unit?: ReactNode;
  label?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline gap-1">
        <span
          className="serif-italic"
          style={{
            fontSize: 56,
            lineHeight: 0.95,
            color: accent ?? "#f0ebe0",
            fontWeight: 400,
            letterSpacing: -1,
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            className="num text-text-dim"
            style={{ fontSize: 12, letterSpacing: 0.5 }}
          >
            {unit}
          </span>
        )}
      </div>
      {label && (
        <span
          className="num font-semibold uppercase text-text-muted"
          style={{ fontSize: 9.5, letterSpacing: 1.2 }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

// ─── Wind direction arrow ───────────────────────────────────
export function WindArrow({
  degrees = 245,
  size = 18,
  color = "#f5c558",
}: {
  degrees?: number;
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ transform: `rotate(${degrees}deg)` }}
    >
      <path
        d="M12 3 L12 21 M12 3 L7 8 M12 3 L17 8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

// ─── Wave split bar (AM vs PM) ──────────────────────────────
export function WaveSplit({
  am,
  pm,
  width = 240,
}: {
  am: number;
  pm: number;
  width?: number;
}) {
  const max = Math.max(Math.abs(am), Math.abs(pm), 0.5);
  const amW = (Math.abs(am) / max) * (width / 2 - 30);
  const pmW = (Math.abs(pm) / max) * (width / 2 - 30);
  const center = width / 2;

  return (
    <div style={{ width, position: "relative" }}>
      <div className="relative" style={{ height: 38 }}>
        <div
          className="absolute bg-line-strong"
          style={{ left: center - 0.5, top: 0, bottom: 0, width: 1 }}
        />
        <div
          className="absolute rounded-sm"
          style={{
            top: 6,
            height: 10,
            left: am >= 0 ? center : center - amW,
            width: amW,
            background: am >= 0 ? "#8ee68e" : "#e07868",
          }}
        />
        <div
          className="absolute rounded-sm"
          style={{
            top: 22,
            height: 10,
            left: pm >= 0 ? center : center - pmW,
            width: pmW,
            background: pm >= 0 ? "#8ee68e" : "#e07868",
          }}
        />
        <span
          className="absolute num text-text-dim"
          style={{ left: 0, top: 4, fontSize: 10, letterSpacing: 0.8 }}
        >
          AM
        </span>
        <span
          className="absolute num text-text-dim"
          style={{ left: 0, top: 20, fontSize: 10, letterSpacing: 0.8 }}
        >
          PM
        </span>
        <span
          className="absolute num font-semibold"
          style={{
            right: 0,
            top: 4,
            fontSize: 10.5,
            color: am >= 0 ? "#8ee68e" : "#e07868",
          }}
        >
          {am > 0 ? "+" : ""}
          {am.toFixed(1)}
        </span>
        <span
          className="absolute num font-semibold"
          style={{
            right: 0,
            top: 20,
            fontSize: 10.5,
            color: pm >= 0 ? "#8ee68e" : "#e07868",
          }}
        >
          {pm > 0 ? "+" : ""}
          {pm.toFixed(1)}
        </span>
      </div>
    </div>
  );
}

// ─── Hourly wind sparkline ──────────────────────────────────
export type WindPoint = { v: number; gust?: number; now?: boolean };

export function WindSpark({
  data,
  width = 320,
  height = 56,
}: {
  data: WindPoint[];
  width?: number;
  height?: number;
}) {
  const max = Math.max(...data.map((d) => d.gust ?? d.v));
  const min = Math.min(...data.map((d) => d.v));
  const pad = 2;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (width - pad * 2) + pad;
    const y =
      height - pad - ((d.v - min) / (max - min + 0.0001)) * (height - pad * 2);
    return [x, y] as const;
  });
  const gustPts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (width - pad * 2) + pad;
    const y =
      height -
      pad -
      (((d.gust ?? d.v) - min) / (max - min + 0.0001)) * (height - pad * 2);
    return [x, y] as const;
  });
  const linePath = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`)
    .join(" ");
  const gustArea =
    `M ${gustPts[0][0]} ${height} L ` +
    gustPts.map((p) => `${p[0]} ${p[1]}`).join(" L ") +
    ` L ${gustPts[gustPts.length - 1][0]} ${height} Z`;
  const nowIdx = data.findIndex((d) => d.now);

  return (
    <svg width={width} height={height} className="block">
      <defs>
        <linearGradient id="windGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5c558" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#f5c558" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={gustArea} fill="url(#windGrad)" />
      <path d={linePath} stroke="#f5c558" strokeWidth="1.5" fill="none" />
      {nowIdx >= 0 && (
        <g>
          <line
            x1={pts[nowIdx][0]}
            x2={pts[nowIdx][0]}
            y1={0}
            y2={height}
            stroke="#f0ebe0"
            strokeWidth="0.5"
            strokeDasharray="2 2"
            opacity="0.3"
          />
          <circle
            cx={pts[nowIdx][0]}
            cy={pts[nowIdx][1]}
            r="3"
            fill="#f5c558"
            stroke="#0a1f14"
            strokeWidth="1.5"
          />
        </g>
      )}
    </svg>
  );
}

// ─── Brand mark — domed gradient sphere from the design ─────
export function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <div
      className="relative rounded-full"
      style={{
        width: size,
        height: size,
        background:
          "radial-gradient(circle at 35% 35%, #8ee68e 0%, #3f8a52 60%, #1a3a26 100%)",
        boxShadow:
          "inset 0 -2px 4px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)",
      }}
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 38% 32%, rgba(255,255,255,0.35) 0%, transparent 28%)",
        }}
      />
    </div>
  );
}
