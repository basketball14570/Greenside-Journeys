// DraftKings golf fantasy scoring engine. Pure + config-driven so the same
// code scores Classic (week-long) and Showdown (single-round) contests, and
// can recompute live points from a hole-by-hole feed (ESPN exposes
// strokes+par per hole). Validate by comparing output to the FPTS column in
// a contest-standings export for the same event.

export type HoleResult = { strokes: number | null; par: number | null };
export type FinishTier = { minRank: number; maxRank: number; points: number };

export type ScoringConfig = {
  perHole: {
    doubleEagleOrBetter: number; // hole to-par <= -3
    eagle: number; // -2
    birdie: number; // -1
    par: number; // 0
    bogey: number; // +1
    doubleBogey: number; // +2
    worse: number; // >= +3
  };
  bonuses: {
    threeBirdieStreak: number; // 3+ in a row, max 1 per round
    bogeyFreeRound: number; // requires a completed 18-hole round
    holeInOne: number; // per ace (strokes === 1)
    allRoundsUnder70?: number; // every predetermined round < 70 strokes
  };
  finishBonus?: FinishTier[]; // tournament finishing-position points
};

export const SHOWDOWN_SCORING: ScoringConfig = {
  perHole: {
    doubleEagleOrBetter: 16,
    eagle: 11,
    birdie: 5.75,
    par: 1.5,
    bogey: -1.8,
    doubleBogey: -3.9,
    worse: -3.9,
  },
  bonuses: { threeBirdieStreak: 5, bogeyFreeRound: 5, holeInOne: 5 },
};

export const CLASSIC_SCORING: ScoringConfig = {
  perHole: {
    doubleEagleOrBetter: 13,
    eagle: 8,
    birdie: 3,
    par: 0.5,
    bogey: -0.5,
    doubleBogey: -1,
    worse: -1,
  },
  bonuses: { threeBirdieStreak: 3, bogeyFreeRound: 3, allRoundsUnder70: 5, holeInOne: 5 },
  finishBonus: [
    { minRank: 1, maxRank: 1, points: 30 },
    { minRank: 2, maxRank: 2, points: 20 },
    { minRank: 3, maxRank: 3, points: 18 },
    { minRank: 4, maxRank: 4, points: 16 },
    { minRank: 5, maxRank: 5, points: 14 },
    { minRank: 6, maxRank: 6, points: 12 },
    { minRank: 7, maxRank: 7, points: 10 },
    { minRank: 8, maxRank: 8, points: 9 },
    { minRank: 9, maxRank: 9, points: 8 },
    { minRank: 10, maxRank: 10, points: 7 },
    { minRank: 11, maxRank: 15, points: 6 },
    { minRank: 16, maxRank: 20, points: 5 },
    { minRank: 21, maxRank: 25, points: 4 },
    { minRank: 26, maxRank: 30, points: 3 },
    { minRank: 31, maxRank: 40, points: 2 },
    { minRank: 41, maxRank: 50, points: 1 },
  ],
};

// Round-4 Showdown: identical per-hole + bonus scoring to regular Showdown,
// but because R4 is the tournament's final round, DraftKings adds
// finishing-position points on top. Tiers per DK's published R4 Showdown rules.
export const SHOWDOWN_R4_SCORING: ScoringConfig = {
  perHole: { ...SHOWDOWN_SCORING.perHole },
  bonuses: { threeBirdieStreak: 5, bogeyFreeRound: 5, holeInOne: 5 },
  finishBonus: [
    { minRank: 1, maxRank: 1, points: 13 },
    { minRank: 2, maxRank: 2, points: 10 },
    { minRank: 3, maxRank: 3, points: 9 },
    { minRank: 4, maxRank: 4, points: 8.5 },
    { minRank: 5, maxRank: 5, points: 8 },
    { minRank: 6, maxRank: 6, points: 7.5 },
    { minRank: 7, maxRank: 7, points: 7 },
    { minRank: 8, maxRank: 8, points: 6.5 },
    { minRank: 9, maxRank: 9, points: 6 },
    { minRank: 10, maxRank: 10, points: 5.5 },
    { minRank: 11, maxRank: 15, points: 5 },
    { minRank: 16, maxRank: 20, points: 4 },
    { minRank: 21, maxRank: 25, points: 3 },
    { minRank: 26, maxRank: 30, points: 2 },
    { minRank: 31, maxRank: 40, points: 1 },
    { minRank: 41, maxRank: 50, points: 0.5 },
  ],
};

export const SCORING_FORMATS = {
  classic: CLASSIC_SCORING,
  showdown: SHOWDOWN_SCORING,
  showdown_r4: SHOWDOWN_R4_SCORING,
} as const;
export type ScoringFormat = keyof typeof SCORING_FORMATS;

export function holePoints(toPar: number, p: ScoringConfig["perHole"]): number {
  if (toPar <= -3) return p.doubleEagleOrBetter;
  if (toPar === -2) return p.eagle;
  if (toPar === -1) return p.birdie;
  if (toPar === 0) return p.par;
  if (toPar === 1) return p.bogey;
  if (toPar === 2) return p.doubleBogey;
  return p.worse; // >= 3
}

export type RoundScore = {
  points: number; // per-hole + this round's streak/bogey-free/HIO bonuses
  holesPlayed: number;
  strokes: number; // sum of completed-hole strokes
  complete: boolean; // 18 holes with strokes
  birdieStreak: boolean;
  bogeyFree: boolean;
  aces: number;
};

export function scoreRound(holes: HoleResult[], config: ScoringConfig): RoundScore {
  const b = config.bonuses;
  let points = 0;
  let strokes = 0;
  let holesPlayed = 0;
  let aces = 0;
  let run = 0;
  let birdieStreak = false;
  let sawBogeyOrWorse = false;

  for (const h of holes) {
    if (h.strokes === null || h.par === null) {
      run = 0; // a gap breaks the streak
      continue;
    }
    holesPlayed++;
    strokes += h.strokes;
    const toPar = h.strokes - h.par;
    points += holePoints(toPar, config.perHole);
    if (h.strokes === 1) aces++;
    if (toPar >= 1) sawBogeyOrWorse = true;
    if (toPar <= -1) {
      run++;
      if (run >= 3) birdieStreak = true;
    } else run = 0;
  }

  const complete = holesPlayed === 18;
  if (birdieStreak) points += b.threeBirdieStreak;
  if (complete && !sawBogeyOrWorse) points += b.bogeyFreeRound;
  if (aces > 0) points += aces * b.holeInOne;

  return { points, holesPlayed, strokes, complete, birdieStreak, bogeyFree: complete && !sawBogeyOrWorse, aces };
}

export function finishBonus(rank: number | null, config: ScoringConfig): number {
  if (rank === null || !config.finishBonus) return 0;
  const t = config.finishBonus.find((t) => rank >= t.minRank && rank <= t.maxRank);
  return t ? t.points : 0;
}

// Full fantasy points for one golfer across their rounds, plus finishing
// bonus and the all-rounds-under-70 bonus when the config defines it.
export function scorePlayer(
  rounds: HoleResult[][],
  finishRank: number | null,
  config: ScoringConfig,
): number {
  const roundScores = rounds.map((r) => scoreRound(r, config));
  let pts = roundScores.reduce((s, r) => s + r.points, 0);
  pts += finishBonus(finishRank, config);
  const under70 = config.bonuses.allRoundsUnder70;
  if (under70 && rounds.length > 0 && roundScores.every((r) => r.complete && r.strokes < 70)) {
    pts += under70;
  }
  return +pts.toFixed(2);
}
