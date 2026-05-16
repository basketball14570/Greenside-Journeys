// Wind-sensitivity model calibration. The model claims a player loses
// `windSensitivity` strokes per round per +10 mph of wind above a 5 mph
// baseline. This module checks that claim against each player's recent
// round history (event finish + actual avg wind + actual sg-total).
//
// If the model is calibrated, plotting predicted-drag against the
// residual (baseline_sg − actual_sg) should hug y = x. We compute the
// per-round residuals, summary stats (R², MAE), and a calibration
// bucketing — high-wind rounds bucketed together vs low.
//
// All functions are pure and operate on PlayerProfile shapes.

import { PLAYERS, PLAYER_LIST, type PlayerProfile, type RecentRound } from "@/lib/demo-players";

export type RoundResidual = {
  playerSlug: string;
  player: string;
  event: string;
  date: string;
  windMph: number;
  sgTotal: number;
  sgBaseline: number;
  // Predicted drag = windSensitivity × max(0, wind-5)/10
  predictedDrag: number;
  // Actual drag = baseline − sgTotal (positive = lost strokes vs baseline)
  actualDrag: number;
  residual: number; // predicted - actual (signed)
};

export type CalibrationBucket = {
  label: string;
  windRangeLow: number;
  windRangeHigh: number;
  rounds: number;
  meanPredicted: number;
  meanActual: number;
  bias: number;          // mean residual — positive = over-predicts drag
};

export type ModelStats = {
  rounds: number;
  meanResidual: number;     // bias (signed); zero is unbiased
  meanAbsResidual: number;  // MAE in strokes
  rmse: number;             // root-mean-squared error
  rSquared: number;         // 1 − SS_res / SS_tot vs actual drag mean
  pearson: number;          // correlation between predicted and actual drag
  buckets: CalibrationBucket[];
};

function predictDrag(windSensitivity: number, windMph: number): number {
  const overBaseline = Math.max(0, windMph - 5);
  return +(windSensitivity * (overBaseline / 10)).toFixed(3);
}

function residualForRound(
  player: PlayerProfile,
  round: RecentRound,
): RoundResidual {
  const predicted = predictDrag(player.windSensitivity, round.windMph);
  const actual = +(player.sgBaseline - round.sgTotal / 4).toFixed(3); // rough per-round
  // Note: sgTotal in the demo data is for the event total (4 rounds). We
  // divide by 4 to put it on the per-round scale that windSensitivity is
  // calibrated to. With real round-level data this becomes a direct read.
  return {
    playerSlug: player.slug,
    player: player.name,
    event: round.event,
    date: round.date,
    windMph: round.windMph,
    sgTotal: round.sgTotal,
    sgBaseline: player.sgBaseline,
    predictedDrag: predicted,
    actualDrag: actual,
    residual: +(predicted - actual).toFixed(3),
  };
}

export function buildResiduals(
  players: PlayerProfile[] = PLAYER_LIST,
): RoundResidual[] {
  const out: RoundResidual[] = [];
  for (const p of players) {
    for (const r of p.recent) {
      out.push(residualForRound(p, r));
    }
  }
  return out;
}

function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : +(num / den).toFixed(3);
}

function bucketRounds(residuals: RoundResidual[]): CalibrationBucket[] {
  const buckets: { label: string; low: number; high: number }[] = [
    { label: "Calm", low: 0, high: 8 },
    { label: "Moderate", low: 8, high: 12 },
    { label: "Breezy", low: 12, high: 16 },
    { label: "Strong", low: 16, high: 99 },
  ];
  return buckets.map((b) => {
    const rounds = residuals.filter((r) => r.windMph >= b.low && r.windMph < b.high);
    const meanPredicted = rounds.length
      ? rounds.reduce((s, r) => s + r.predictedDrag, 0) / rounds.length
      : 0;
    const meanActual = rounds.length
      ? rounds.reduce((s, r) => s + r.actualDrag, 0) / rounds.length
      : 0;
    return {
      label: b.label,
      windRangeLow: b.low,
      windRangeHigh: b.high,
      rounds: rounds.length,
      meanPredicted: +meanPredicted.toFixed(3),
      meanActual: +meanActual.toFixed(3),
      bias: +(meanPredicted - meanActual).toFixed(3),
    };
  });
}

export function calibrate(
  players: PlayerProfile[] = PLAYER_LIST,
): ModelStats {
  const residuals = buildResiduals(players);
  const n = residuals.length;
  if (!n) {
    return {
      rounds: 0,
      meanResidual: 0,
      meanAbsResidual: 0,
      rmse: 0,
      rSquared: 0,
      pearson: 0,
      buckets: bucketRounds([]),
    };
  }
  const sumRes = residuals.reduce((s, r) => s + r.residual, 0);
  const meanRes = sumRes / n;
  const mae = residuals.reduce((s, r) => s + Math.abs(r.residual), 0) / n;
  const rmse = Math.sqrt(
    residuals.reduce((s, r) => s + r.residual * r.residual, 0) / n,
  );
  const meanActual =
    residuals.reduce((s, r) => s + r.actualDrag, 0) / n;
  const ssRes = residuals.reduce(
    (s, r) => s + (r.actualDrag - r.predictedDrag) ** 2,
    0,
  );
  const ssTot = residuals.reduce(
    (s, r) => s + (r.actualDrag - meanActual) ** 2,
    0,
  );
  const rSquared = ssTot === 0 ? 0 : +(1 - ssRes / ssTot).toFixed(3);
  const pearson = pearsonCorrelation(
    residuals.map((r) => r.predictedDrag),
    residuals.map((r) => r.actualDrag),
  );
  return {
    rounds: n,
    meanResidual: +meanRes.toFixed(3),
    meanAbsResidual: +mae.toFixed(3),
    rmse: +rmse.toFixed(3),
    rSquared,
    pearson,
    buckets: bucketRounds(residuals),
  };
}

// Per-player calibration — useful for spotting players whose coefficient
// is the most wrong. The "suggested" coefficient is the player-specific
// least-squares fit through their own recent rounds.
export type PlayerCalibration = {
  slug: string;
  name: string;
  current: number;
  rounds: number;
  bias: number;
  mae: number;
  suggested: number;
};

export function perPlayer(
  players: PlayerProfile[] = PLAYER_LIST,
): PlayerCalibration[] {
  return players.map((p) => {
    const rs = p.recent.map((r) => residualForRound(p, r));
    const bias =
      rs.reduce((s, r) => s + r.residual, 0) / Math.max(1, rs.length);
    const mae =
      rs.reduce((s, r) => s + Math.abs(r.residual), 0) /
      Math.max(1, rs.length);
    // Suggested coefficient: solve windSensitivity such that mean predicted
    // drag matches mean actual drag for this player.
    // predicted = ws * (windOver/10) averaged → so ws = meanActual / meanOver10
    const meanActual =
      rs.reduce((s, r) => s + r.actualDrag, 0) / Math.max(1, rs.length);
    const meanOver10 =
      rs.reduce((s, r) => s + Math.max(0, r.windMph - 5) / 10, 0) /
      Math.max(1, rs.length);
    const suggested =
      meanOver10 > 0 ? +(meanActual / meanOver10).toFixed(3) : p.windSensitivity;
    return {
      slug: p.slug,
      name: p.name,
      current: p.windSensitivity,
      rounds: rs.length,
      bias: +bias.toFixed(3),
      mae: +mae.toFixed(3),
      suggested,
    };
  });
}
