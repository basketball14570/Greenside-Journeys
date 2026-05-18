// P&L cumulative sparkline + summary primitives for the portfolio page.

import type { HistoryBet } from "@/lib/demo-history";

export function PnlSpark({
  bets,
  width = 320,
  height = 64,
}: {
  bets: HistoryBet[];
  width?: number;
  height?: number;
}) {
  if (!bets.length) return null;
  // Sort ascending by resolution time so the line tells a chronological story.
  const sorted = [...bets].sort(
    (a, b) => +new Date(a.resolvedAt) - +new Date(b.resolvedAt),
  );
  let running = 0;
  const points = sorted.map((b) => {
    running += b.resolvedPayout;
    return running;
  });

  // Always include 0 in the range so wins vs losses read cleanly.
  const min = Math.min(0, ...points);
  const max = Math.max(0, ...points);
  const pad = 4;
  const xs = points.map(
    (_, i) => (i / Math.max(1, points.length - 1)) * (width - pad * 2) + pad,
  );
  const ys = points.map(
    (p) =>
      height - pad - ((p - min) / (max - min + 0.0001)) * (height - pad * 2),
  );
  const zeroY =
    height - pad - ((0 - min) / (max - min + 0.0001)) * (height - pad * 2);

  const finalPositive = points[points.length - 1] >= 0;
  const stroke = finalPositive ? "#8ee68e" : "#e07868";

  const linePath = xs
    .map((x, i) => `${i === 0 ? "M" : "L"} ${x} ${ys[i]}`)
    .join(" ");
  const areaPath =
    `M ${xs[0]} ${zeroY} L ` +
    xs.map((x, i) => `${x} ${ys[i]}`).join(" L ") +
    ` L ${xs[xs.length - 1]} ${zeroY} Z`;

  return (
    <svg width={width} height={height} className="block">
      <defs>
        <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line
        x1={0}
        x2={width}
        y1={zeroY}
        y2={zeroY}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      <path d={areaPath} fill="url(#pnlGrad)" />
      <path d={linePath} stroke={stroke} strokeWidth="1.5" fill="none" />
      <circle
        cx={xs[xs.length - 1]}
        cy={ys[ys.length - 1]}
        r="3"
        fill={stroke}
        stroke="#0a1f14"
        strokeWidth="1.5"
      />
    </svg>
  );
}

// ─── Tiny horizontal bar for breakdowns (book/market) ───────
export function BreakdownBar({
  label,
  winRate,
  roi,
  net,
  count,
}: {
  label: string;
  winRate: number;
  roi: number;
  net: number;
  count: number;
}) {
  const roiColor = roi > 0.05 ? "#8ee68e" : roi < -0.05 ? "#e07868" : "#a8b3ac";
  return (
    <div className="flex items-center gap-3 py-2">
      <span
        className="text-text"
        style={{ fontSize: 13, width: 88 }}
      >
        {label}
      </span>
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height: 5, background: "rgba(255,255,255,0.05)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, Math.max(2, winRate * 100))}%`,
            background: roiColor,
          }}
        />
      </div>
      <span
        className="num text-text-dim text-right"
        style={{ fontSize: 11, width: 50 }}
      >
        {(winRate * 100).toFixed(0)}% W
      </span>
      <span
        className="num text-right font-semibold"
        style={{ fontSize: 12, color: roiColor, width: 60 }}
      >
        {roi > 0 ? "+" : ""}
        {(roi * 100).toFixed(0)}% ROI
      </span>
      <span
        className="num text-text-muted text-right"
        style={{ fontSize: 11, width: 42 }}
      >
        {count} bet{count === 1 ? "" : "s"}
      </span>
      <span
        className="num text-right font-semibold"
        style={{
          fontSize: 12,
          color: net > 0 ? "#8ee68e" : net < 0 ? "#e07868" : "#a8b3ac",
          width: 56,
        }}
      >
        {net > 0 ? "+" : ""}
        {net.toFixed(2)}u
      </span>
    </div>
  );
}
