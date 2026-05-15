// Conditions alert engine.
//
// Runs on a schedule (recommended: every 5–15 min during tournament hours via
// Vercel cron / Supabase scheduled function). For each active tournament:
//
//   1. Pull current weather for the course (Tomorrow.io)
//   2. Diff against the previously stored conditions snapshot
//   3. If a meaningful threshold is crossed (wind delta ≥ X mph, precip starts,
//      gusts cross 20 mph), compute per-player EV shift using the
//      wind-sensitivity model
//   4. For each user with active bets affected, score the personal EV delta
//   5. Persist + enqueue push notifications
//
// The shape below is the contract between the engine and the rest of the app.
// Implementation of the model + persistence lands when Supabase is wired.

import type { WeatherInterval } from "@/lib/data/weather";

export type ConditionsSnapshot = {
  courseId: string;
  takenAt: string;
  windSpeed: number;
  windGust: number;
  precipIntensity: number;
};

export type ConditionsDiff = {
  windDelta: number;      // mph
  gustDelta: number;      // mph
  precipStarted: boolean;
  precipStopped: boolean;
  severity: "info" | "warning" | "critical";
};

const WIND_WARNING = 6;   // mph delta from baseline
const WIND_CRITICAL = 10;
const GUST_CRITICAL = 20; // absolute gust threshold

export function diffConditions(
  prev: ConditionsSnapshot | null,
  next: WeatherInterval,
): ConditionsDiff | null {
  if (!prev) return null; // first sample — nothing to alert on yet

  const windDelta = next.windSpeed - prev.windSpeed;
  const gustDelta = next.windGust - prev.windGust;
  const precipStarted =
    prev.precipIntensity < 0.1 && next.precipitationIntensity >= 0.1;
  const precipStopped =
    prev.precipIntensity >= 0.1 && next.precipitationIntensity < 0.1;

  const severity: ConditionsDiff["severity"] =
    Math.abs(windDelta) >= WIND_CRITICAL || next.windGust >= GUST_CRITICAL
      ? "critical"
      : Math.abs(windDelta) >= WIND_WARNING || precipStarted
        ? "warning"
        : "info";

  // Skip noise — only emit if something actually changed materially.
  if (
    Math.abs(windDelta) < WIND_WARNING &&
    !precipStarted &&
    !precipStopped &&
    next.windGust < GUST_CRITICAL
  ) {
    return null;
  }

  return { windDelta, gustDelta, precipStarted, precipStopped, severity };
}

// Per-player EV impact from a wind shift, in percent.
// Coefficient sourced from our wind-sensitivity model (per-player, fitted on
// historical rounds). Default of 0.4 strokes/round per +10mph wind is the
// field average — replace with player-specific value once the model lands.
export function windEvDelta(opts: {
  windDeltaMph: number;
  playerSensitivity?: number; // strokes/round per +10mph wind, default 0.4
  marketType: "outright" | "top_finish" | "matchup" | "prop_over" | "prop_under" | "score_over" | "score_under";
}): number {
  const s = opts.playerSensitivity ?? 0.4;
  const strokeDelta = (opts.windDeltaMph / 10) * s;

  // Crude first-pass conversion strokes → EV%. Replace with calibrated
  // market-specific models. Sign depends on whether the bet wants high or low scores.
  const wantsLowScores =
    opts.marketType === "outright" ||
    opts.marketType === "top_finish" ||
    opts.marketType === "matchup" ||
    opts.marketType === "score_under";

  // Each stroke gained/lost vs field ≈ 2-4% EV depending on market liquidity.
  const evPerStroke = 3;
  return (wantsLowScores ? -1 : 1) * strokeDelta * evPerStroke;
}
