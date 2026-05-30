"use client";

import { useState } from "react";

// Circular player headshot with a graceful initials fallback when ESPN has
// no photo (or the image 404s). Optional flag badge and ring. The identity
// chip used across the leaderboard, bet cards, and player surfaces so the
// app reads like a sports-media product, not a data table.

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function PlayerAvatar({
  name,
  headshot,
  flagHref,
  size = 34,
  ring,
}: {
  name: string;
  headshot?: string | null;
  flagHref?: string | null;
  size?: number;
  // Optional accent ring color (e.g. brand green for a starred player).
  ring?: string | null;
}) {
  const [broken, setBroken] = useState(false);
  const showImg = !!headshot && !broken;
  const flagSize = Math.round(size * 0.42);

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-full overflow-visible"
      style={{ width: size, height: size }}
    >
      <span
        className="relative inline-flex items-center justify-center rounded-full overflow-hidden"
        style={{
          width: size,
          height: size,
          background: "linear-gradient(150deg,#1c3326,#101d15)",
          border: ring ? `1.5px solid ${ring}` : "1px solid rgba(255,255,255,0.1)",
          boxShadow: ring ? `0 0 0 2px ${ring}33` : "none",
        }}
      >
        {showImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={headshot as string}
            alt={name}
            onError={() => setBroken(true)}
            className="h-full w-full object-cover object-top"
            // ESPN headshots are transparent PNGs of the player from the
            // chest up; nudge down so the face centers in the circle.
            style={{ transform: "scale(1.08) translateY(4%)" }}
          />
        ) : (
          <span
            className="num font-bold"
            style={{ fontSize: size * 0.36, color: "#7fd49a", letterSpacing: 0.3 }}
          >
            {initials(name)}
          </span>
        )}
      </span>
      {flagHref && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={flagHref}
          alt=""
          aria-hidden
          className="absolute rounded-full object-cover"
          style={{
            width: flagSize,
            height: flagSize,
            right: -2,
            bottom: -2,
            border: "1.5px solid #0a130e",
            background: "#0a130e",
          }}
        />
      )}
    </span>
  );
}

// Round-by-round form dots — a tiny scorecard read of recent rounds vs par.
// Green under, red over, neutral even. Built from the rounds we already
// have in the leaderboard snapshot; no extra data needed.
export function FormDots({
  rounds,
  par,
}: {
  rounds: { strokes: number | null }[];
  par: number | null;
}) {
  const played = rounds.filter((r) => r.strokes !== null);
  if (played.length === 0 || par === null) return null;
  return (
    <span className="inline-flex items-center gap-1">
      {played.map((r, i) => {
        const diff = (r.strokes as number) - par;
        const color = diff < 0 ? "#7fd49a" : diff > 0 ? "#e57373" : "#c7cfc9";
        return (
          <span
            key={i}
            title={`R${i + 1}: ${diff === 0 ? "E" : diff > 0 ? `+${diff}` : diff}`}
            className="inline-block rounded-full"
            style={{ width: 6, height: 6, background: color }}
          />
        );
      })}
    </span>
  );
}
