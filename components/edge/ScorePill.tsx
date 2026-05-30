// Shared score pill + name helpers so the leaderboard, cut sweat, DFS, and
// command center all render scores with the same tinted-chip language
// instead of bare numbers on a dark board.

const UNDER = "#7fd49a";
const OVER = "#e87c7c";
const NEUTRAL = "#d4dbd6";

export function ScorePill({
  text,
  num,
  color,
  strong,
  minWidth,
}: {
  text: string | null | undefined;
  // When provided, drives auto green/red/neutral coloring (under/over/even).
  num?: number | null;
  // Explicit override (e.g. cut-margin safe/off) — wins over `num`.
  color?: string;
  strong?: boolean;
  minWidth?: number;
}) {
  if (text == null || text === "") {
    return (
      <span className="num text-text-muted" style={{ fontSize: 13.5 }}>
        —
      </span>
    );
  }
  const c =
    color ??
    (num != null && num < 0 ? UNDER : num != null && num > 0 ? OVER : NEUTRAL);
  const bg = hexToBg(c);
  return (
    <span
      className="num inline-flex items-center justify-center font-bold"
      style={{
        minWidth: minWidth ?? (strong ? 40 : 34),
        height: 22,
        padding: "0 7px",
        fontSize: strong ? 13.5 : 12.5,
        borderRadius: 6,
        color: c,
        background: bg,
      }}
    >
      {text}
    </span>
  );
}

// Translate an accent hex into its faint pill background.
function hexToBg(c: string): string {
  if (c === UNDER) return "rgba(127,212,154,0.14)";
  if (c === OVER) return "rgba(232,124,124,0.13)";
  if (c === NEUTRAL) return "rgba(255,255,255,0.05)";
  // Unknown accent → derive a translucent wash from it.
  return `${c}22`;
}

// Compact name for tight mobile rows: "Jordan Smith" → "J. Smith",
// "Christiaan Bezuidenhout" → "C. Bezuidenhout". Keeps an already-initial
// first token ("J.J. Spaun") intact.
export function abbrevName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return name;
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (first.includes(".")) return `${first} ${last}`;
  return `${first[0]}. ${last}`;
}
