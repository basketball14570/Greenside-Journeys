"use client";

import { holeParStrict } from "@/lib/data/course-pars";
import type { RoundLine } from "@/lib/espn-leaderboard";

// One played hole, resolved against the best par we have. `par` is null when
// the course isn't mapped and ESPN omits per-hole par — then we show the raw
// strokes without a birdie/bogey color rather than guessing.
export type HoleCell = {
  hole: number;
  strokes: number;
  par: number | null;
  diff: number | null;
};

export function buildScorecard(
  round: RoundLine | null | undefined,
  courseName: string | null,
  holePars: number[] | undefined,
): HoleCell[] | null {
  if (!round) return null;
  const cells: HoleCell[] = [];
  for (const h of round.holes) {
    if (h.strokes === null || h.strokes <= 0) continue;
    const par = h.par ?? holePars?.[h.hole - 1] ?? holeParStrict(courseName, h.hole);
    cells.push({
      hole: h.hole,
      strokes: h.strokes,
      par: par ?? null,
      diff: par != null ? h.strokes - par : null,
    });
  }
  return cells.length ? cells : null;
}

// Per-hole result color: eagle+ gold, birdie green, par neutral, bogey amber,
// double+ red. Unknown par stays neutral.
function holeStyle(diff: number | null): { bg: string; fg: string } {
  if (diff == null) return { bg: "rgba(255,255,255,0.04)", fg: "#9aa6a0" };
  if (diff <= -2) return { bg: "#caa24a", fg: "#1a1408" };
  if (diff === -1) return { bg: "#2f6f49", fg: "#eafff0" };
  if (diff === 0) return { bg: "rgba(255,255,255,0.05)", fg: "#c7cfc9" };
  if (diff === 1) return { bg: "#7a4a1e", fg: "#ffe6cf" };
  return { bg: "#7a2424", fg: "#ffd9d9" };
}

export function HoleStrip({ cells }: { cells: HoleCell[] }) {
  const thru = cells.length;
  const front = cells.filter((c) => c.hole <= 9);
  const back = cells.filter((c) => c.hole >= 10);
  const row = (cs: HoleCell[]) => (
    <div className="flex gap-[3px]">
      {cs.map((c) => {
        const s = holeStyle(c.diff);
        return (
          <div
            key={c.hole}
            title={c.par != null ? `Hole ${c.hole} · par ${c.par} · ${c.strokes}` : `Hole ${c.hole} · ${c.strokes}`}
            className="flex flex-col items-center justify-center"
            style={{ width: 22, height: 26, borderRadius: 4, background: s.bg, color: s.fg }}
          >
            <span className="num" style={{ fontSize: 7, opacity: 0.7, lineHeight: 1 }}>
              {c.hole}
            </span>
            <span className="num font-semibold" style={{ fontSize: 12, lineHeight: 1.1 }}>
              {c.strokes}
            </span>
          </div>
        );
      })}
    </div>
  );
  return (
    <div className="mt-2.5 pt-2.5 border-t border-line/60">
      <div className="flex items-center justify-between mb-1.5">
        <span className="num uppercase" style={{ fontSize: 9, letterSpacing: 1, color: "#7e8a83" }}>
          Hole by hole
        </span>
        <span className="num" style={{ fontSize: 9, letterSpacing: 0.5, color: "#7e8a83" }}>
          thru {thru}
        </span>
      </div>
      <div className="space-y-[3px]">
        {front.length > 0 && row(front)}
        {back.length > 0 && row(back)}
      </div>
    </div>
  );
}
