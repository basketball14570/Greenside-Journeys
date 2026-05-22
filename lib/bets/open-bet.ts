import type { OpenBet } from "@/lib/grading";

// Shared reconstruction of a stored `bets` row into the OpenBet shape the
// grader understands. The bets table has no opponent/group/side columns,
// so matchups encode the other players in the market text as "... vs A / B"
// and over/under props lose their side in the numeric `line` column. This
// rebuilds round, opponents, top-N, and the O/U line so the SAME logic
// runs on the client (live page) and the server (settlement cron) — they
// must agree or a leg could show "winning" live yet settle differently.

export type DbBetRow = {
  id?: string;
  player: string;
  market: string;
  line: number | null;
  american_odds: number;
  stake: number | string;
  to_win: number | string;
};

export function dbBetToOpenBet(b: DbBetRow): OpenBet {
  const m = b.market.toLowerCase();
  const rm = m.match(/\br\s*(\d)\b/) ?? m.match(/round\s*(\d)/);
  const round = rm ? Number(rm[1]) : undefined;

  const vsPart = b.market.split(/\bvs\b/i)[1]?.trim();
  let others: string[] | undefined;
  let opponent: string | undefined;
  if (/3[\s-]?ball/.test(m) && vsPart) {
    others = vsPart.split("/").map((s) => s.trim()).filter(Boolean);
  } else if (vsPart) {
    opponent = vsPart.split("/")[0]?.trim();
  }

  // Underdog "leaderboard position better N.5" = a top-floor(N) finish.
  // Rewrite to a "Top N" market so it routes to the top-N grader.
  let market = b.market;
  if (/(leaderboard|finish\w*)\s*position/.test(m) && !/\btop\b/.test(m)) {
    const stripped = m.replace(/\br\s*\d\b/g, " ").replace(/round\s*\d/g, " ");
    const numMatch = stripped.match(/(\d{1,3}(?:\.\d)?)/);
    const n =
      b.line != null
        ? Math.floor(Number(b.line))
        : numMatch
          ? Math.floor(parseFloat(numMatch[1]))
          : null;
    if (n) market = `${round ? `R${round} ` : ""}Top ${n}`;
  }

  // Over/under props lose their side in the numeric `line` column, so
  // rebuild an "O x" / "U x" line from the keyword in the market text.
  const isOu = /\b(over|under|higher|lower)\b/.test(m) && b.line !== null;
  const line = isOu
    ? `${/\b(under|lower)\b/.test(m) ? "U" : "O"} ${b.line}`
    : b.line !== null
      ? String(b.line)
      : String(b.american_odds);

  return {
    id: b.id,
    player: b.player,
    market,
    line,
    stake: Number(b.stake),
    payout: Number(b.to_win),
    round,
    others,
    opponent,
  };
}
