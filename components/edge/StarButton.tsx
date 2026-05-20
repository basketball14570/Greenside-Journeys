"use client";

import { useStarredGolfers } from "@/lib/starred-golfers";

// Star toggle for a single player. Renders nothing during SSR (hydration
// happens via useEffect in useStarredGolfers) so an empty/filled state
// doesn't flicker. Compact 16x16 hit target; on mobile we expand to a
// 28x28 tap surface via the wrapper button to clear Apple's 44pt
// minimum on the row taps when star sits next to a clickable name.
export function StarButton({
  player,
  size = 16,
  className,
}: {
  player: string;
  size?: number;
  className?: string;
}) {
  const { isStarred, toggle } = useStarredGolfers();
  const filled = isStarred(player);
  const color = filled ? "#f5c558" : "#3a4a40";
  return (
    <button
      type="button"
      aria-label={filled ? `Unstar ${player}` : `Star ${player}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(player);
      }}
      className={`inline-flex items-center justify-center rounded transition ${className ?? ""}`}
      style={{
        width: size + 12,
        height: size + 12,
        background: "transparent",
        color,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={filled ? color : "none"}
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
  );
}
