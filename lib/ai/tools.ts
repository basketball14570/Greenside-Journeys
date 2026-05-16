// Tools the Ask Greenside assistant can call.
//
// Each tool has (a) a JSON-schema definition Claude sees and (b) a server-side
// handler that returns concrete data. While Supabase isn't wired the handlers
// read demo data; the handler signatures don't change when real data lands.

import { DEMO_BETS, DEMO_ALERTS_DESKTOP, DEMO_LEADERBOARD } from "@/lib/demo-data";
import { SETTLED_BETS, summarize, groupBy } from "@/lib/demo-history";
import { COURSES, ALERT_HISTORY } from "@/lib/demo-courses";
import { DFS_PLAYERS } from "@/lib/demo-dfs";
import { STRATEGIES, runStrategy } from "@/lib/backtest";
import { buildPreviewAsync } from "@/lib/preview";
import { getForecast } from "@/lib/weather/forecast";
import { calibrate, perPlayer } from "@/lib/wind-model";
import { getPlayerProfile, datagolfEnabled } from "@/lib/data/datagolf";
import { getPlayerHedgeQuotes, oddsApiEnabled } from "@/lib/data/odds";
import {
  getPlayerHistory,
  getTournament,
  getCourseHistory,
  listCourses,
  TOURNAMENT_ORDER,
} from "@/lib/data/ownership";

export type Tool = {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
};

export const TOOLS: Tool[] = [
  {
    name: "get_open_bets",
    description:
      "List the user's currently open (live or pending) bets in the active tournament. Optionally filter by book, wave, or minimum/maximum live EV.",
    input_schema: {
      type: "object",
      properties: {
        book: {
          type: "string",
          enum: ["DK", "FD", "PP", "UD"],
          description: "Sportsbook code",
        },
        wave: { type: "string", enum: ["AM", "PM"] },
        min_ev: {
          type: "number",
          description: "Only return bets with live EV ≥ this percent",
        },
        max_ev: {
          type: "number",
          description: "Only return bets with live EV ≤ this percent",
        },
      },
    },
  },
  {
    name: "get_settled_history",
    description:
      "Get the user's settled-bet history with overall win rate, ROI, and net units. Optionally group by 'book' or 'market'.",
    input_schema: {
      type: "object",
      properties: {
        group_by: { type: "string", enum: ["book", "market"] },
      },
    },
  },
  {
    name: "get_alerts",
    description:
      "Get recent alerts (wave shifts, wind, hedge opportunities, precipitation). Optionally scope to one course.",
    input_schema: {
      type: "object",
      properties: {
        course_id: { type: "string", description: "e.g. 'quail-hollow'" },
      },
    },
  },
  {
    name: "get_course_conditions",
    description:
      "Get current weather conditions and wave-split impact for one or all courses the user has exposure to.",
    input_schema: {
      type: "object",
      properties: {
        course_id: {
          type: "string",
          description: "Specific course (e.g. 'quail-hollow'); omit for all",
        },
      },
    },
  },
  {
    name: "get_leaderboard",
    description:
      "Get the live tournament leaderboard with the user's exposure overlaid (which positions correspond to players they have bets on).",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "How many positions to return" },
        mine_only: {
          type: "boolean",
          description: "Only return positions where the user has exposure",
        },
      },
    },
  },
  {
    name: "compute_hedge",
    description:
      "Given a bet player + market, compute a suggested hedge: which book offers the best opposite-side price right now and the unit profit lock if it cashes.",
    input_schema: {
      type: "object",
      properties: {
        player: { type: "string" },
        market: { type: "string" },
      },
      required: ["player"],
    },
  },
  {
    name: "get_dfs_player_pool",
    description:
      "Get the DraftKings DFS player pool for the current slate with salaries, projections, ownership, and wind-adjusted edge.",
    input_schema: {
      type: "object",
      properties: {
        min_wind_adj: {
          type: "number",
          description: "Only return players with wind adjustment ≥ this value",
        },
      },
    },
  },
  {
    name: "run_backtest",
    description:
      "Replay the user's settled bet history under a named selection strategy and return ROI, win rate, net units, max drawdown, and profit factor. If strategy_id is omitted, returns all strategies side by side. Optionally filter to a single tournament. Use this when the user asks 'what would have happened if I had skipped X' or 'which rule has been working'.",
    input_schema: {
      type: "object",
      properties: {
        strategy_id: {
          type: "string",
          description:
            "One of: baseline, wind-discipline, no-longshots, mainstream-books, wave-aware, kelly-quarter. Omit for all.",
        },
        tournament: {
          type: "string",
          description:
            "Restrict the replay to one tournament name (exact match).",
        },
      },
    },
  },
  {
    name: "build_preview",
    description:
      "Generate a structured tournament preview for the given course slug: top archetype-fit players with wind-drag penalty, betting angles, hedge candidates, fade list, and history notes. Use this for 'who's the play this week' type questions.",
    input_schema: {
      type: "object",
      properties: {
        course_slug: {
          type: "string",
          description:
            "One of: quail-hollow, pebble-beach, torrey-pines-south.",
        },
      },
      required: ["course_slug"],
    },
  },
  {
    name: "get_forecast",
    description:
      "Get the live wind / temperature / precipitation forecast for a course. Returns hourly data plus 24h aggregates. Use this when the user asks about conditions, wind impact, or weather for their bets.",
    input_schema: {
      type: "object",
      properties: {
        course_slug: {
          type: "string",
          description:
            "One of: quail-hollow, pebble-beach, torrey-pines-south.",
        },
        hours: {
          type: "number",
          description: "How many forecast hours to return (default 24, max 48).",
        },
      },
      required: ["course_slug"],
    },
  },
  {
    name: "get_player_ownership",
    description:
      "Look up a player's full DraftKings DFS ownership history across the 2026 season — every tournament, salary at the time, finishing ownership %. Use to assess leverage (chronically under-owned for salary tier), spot chalk patterns at specific course archetypes, or answer 'how owned was Scheffler at Pebble Beach'.",
    input_schema: {
      type: "object",
      properties: {
        player: { type: "string", description: "Player display name, e.g. 'Scottie Scheffler'." },
      },
      required: ["player"],
    },
  },
  {
    name: "get_tournament_ownership",
    description:
      "Fetch the full DK ownership board for one tournament — every player, salary, finishing ownership %. Use for chalk-level analysis at similar courses or to compare projected vs actual ownership.",
    input_schema: {
      type: "object",
      properties: {
        tournament: { type: "string", description: "Tournament name, e.g. 'Masters 2026', 'Pebble Beach 2026'." },
      },
      required: ["tournament"],
    },
  },
  {
    name: "get_course_ownership_history",
    description:
      "Look up every player's aggregated DK ownership at a specific course across the whole 2026 season (handles courses with multiple events — Pebble Beach, Torrey Pines). Returns repeat-field players sorted by avg ownership plus one-off appearances. Use to answer 'who's chalk at Quail Hollow' or 'find leverage plays at Riviera'.",
    input_schema: {
      type: "object",
      properties: {
        course: { type: "string", description: "Course name, e.g. 'Quail Hollow Club', 'Pebble Beach Golf Links'." },
      },
      required: ["course"],
    },
  },
  {
    name: "get_player_profile",
    description:
      "Fetch a single player's profile — wind sensitivity, recent form, course-archetype fit, exposure history. DataGolf-backed when wired, demo fixture otherwise. Slugs are kebab-case: 'scheffler', 'mcilroy', 'cantlay', 'schauffele', 'morikawa'.",
    input_schema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Player slug, e.g. 'scheffler'." },
      },
      required: ["slug"],
    },
  },
  {
    name: "model_calibration",
    description:
      "Check whether the wind-sensitivity model is calibrated against actual recent rounds. Returns bias, MAE, R², Pearson r, per-wind-regime buckets, and per-player drift with suggested coefficient updates.",
    input_schema: {
      type: "object",
      properties: {
        per_player: {
          type: "boolean",
          description:
            "When true, also return per-player drift rows (default false).",
        },
      },
    },
  },
  {
    name: "grade_open_bets",
    description:
      "Grade the user's current open bets against the live PGA scoreboard. Returns a per-bet decision (won/lost/live/push/unknown) plus an aggregate report and net P&L. Use when the user asks 'how are my bets doing' or 'did anything settle'.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_full_leaderboard",
    description:
      "Fetch the full live leaderboard from ESPN for the active PGA event. Returns every player in the field with position, total-to-par, today's round-to-par, and thru. Use this for any 'where is player X' / 'top 10 right now' / 'how is the cut line shaping up' type question.",
    input_schema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Cap the number of players returned (default 30).",
        },
        made_cut_only: {
          type: "boolean",
          description: "When true, exclude players marked as CUT/WD/DQ.",
        },
      },
    },
  },
  {
    name: "get_live_odds",
    description:
      "Fetch live cross-book hedge / outright odds for a named player from The Odds API. Returns null/empty when the upstream key isn't configured — use the demo prices on the hedge page in that case.",
    input_schema: {
      type: "object",
      properties: {
        player: {
          type: "string",
          description: "Player name, e.g. 'Scottie Scheffler'.",
        },
      },
      required: ["player"],
    },
  },
];

// ─── Handlers ──────────────────────────────────────────────
type Input = Record<string, unknown>;

export async function runTool(name: string, input: Input): Promise<unknown> {
  switch (name) {
    case "get_open_bets":
      return handleOpenBets(input);
    case "get_settled_history":
      return handleSettled(input);
    case "get_alerts":
      return handleAlerts(input);
    case "get_course_conditions":
      return handleConditions(input);
    case "get_leaderboard":
      return handleLeaderboard(input);
    case "compute_hedge":
      return handleHedge(input);
    case "get_dfs_player_pool":
      return handleDfs(input);
    case "run_backtest":
      return handleBacktest(input);
    case "build_preview":
      return handlePreview(input);
    case "get_forecast":
      return handleForecast(input);
    case "get_player_profile":
      return handlePlayerProfile(input);
    case "model_calibration":
      return handleModelCalibration(input);
    case "get_live_odds":
      return handleLiveOdds(input);
    case "grade_open_bets":
      return handleGradeBets();
    case "get_full_leaderboard":
      return handleFullLeaderboard(input);
    case "get_player_ownership":
      return handlePlayerOwnership(input);
    case "get_tournament_ownership":
      return handleTournamentOwnership(input);
    case "get_course_ownership_history":
      return handleCourseOwnership(input);
    default:
      return { error: `Unknown tool ${name}` };
  }
}

async function handlePlayerOwnership(input: Input) {
  const player = (input.player as string | undefined) ?? "";
  const h = getPlayerHistory(player);
  if (!h) {
    return {
      error: `No ownership history for '${player}'.`,
      hint: "Check spelling or try last name only. Dataset covers the 2026 PGA season.",
    };
  }
  return {
    player: h.name,
    appearances: h.appearances,
    avg_ownership_pct: Number(h.avgOwn.toFixed(2)),
    min_ownership_pct: Number(h.minOwn.toFixed(2)),
    max_ownership_pct: Number(h.maxOwn.toFixed(2)),
    avg_salary: Math.round(h.avgSalary),
    history: h.history.map((e) => ({
      tournament: e.tournament,
      ownership_pct: Number(e.own.toFixed(2)),
      salary: e.salary,
    })),
  };
}

async function handleCourseOwnership(input: Input) {
  const course = (input.course as string | undefined) ?? "";
  const h = getCourseHistory(course);
  if (!h) {
    const candidates = listCourses().slice(0, 5).map((c) => c.course);
    return {
      error: `No ownership history for course '${course}'.`,
      hint: `Try one of: ${candidates.join(", ")}.`,
    };
  }
  return {
    course: h.course,
    events: h.events.map((e) => e.tournament),
    unique_players: h.playerStats.length,
    top_chalk: h.playerStats.slice(0, 10).map((p) => ({
      name: p.name,
      appearances: p.appearances,
      avg_ownership_pct: Number(p.avgOwn.toFixed(2)),
      avg_salary: Math.round(p.avgSalary),
      range: `${p.minOwn.toFixed(1)}–${p.maxOwn.toFixed(1)}%`,
    })),
    repeat_field_count: h.playerStats.filter((p) => p.appearances > 1).length,
  };
}

async function handleTournamentOwnership(input: Input) {
  const name = (input.tournament as string | undefined) ?? "";
  const t = getTournament(name);
  if (!t) {
    return {
      error: `No ownership data for '${name}'.`,
      hint: `Try one of: ${TOURNAMENT_ORDER.slice(0, 5).join(", ")}.`,
    };
  }
  return {
    tournament: name,
    meta: t.meta,
    field_size: t.players.length,
    top_chalk: t.players.slice(0, 10).map((p) => ({
      name: p.name,
      salary: p.salary,
      ownership_pct: p.own,
    })),
    full_board: t.players.map((p) => ({
      name: p.name,
      salary: p.salary,
      ownership_pct: p.own,
    })),
  };
}

async function handlePlayerProfile(input: Input) {
  const slug = (input.slug as string | undefined) ?? "";
  const profile = await getPlayerProfile(slug);
  if (!profile) {
    return {
      error: `No player profile for slug '${slug}'.`,
      hint: "Try one of: scheffler, mcilroy, cantlay, schauffele, morikawa.",
    };
  }
  return {
    source: datagolfEnabled() ? "datagolf" : "demo",
    player: {
      slug: profile.slug,
      name: profile.name,
      world_rank: profile.worldRank,
      sg_baseline_per_round: profile.sgBaseline,
      wind_sensitivity: profile.windSensitivity,
      wind_sensitivity_rank: profile.windSensitivityRank,
      recent_rounds: profile.recent.map((r) => ({
        event: r.event,
        date: r.date,
        finish: r.finish,
        sg_total: r.sgTotal,
        wind_mph: r.windMph,
      })),
      archetype_fit: profile.fit.map((f) => ({
        archetype: f.archetype,
        rounds: f.rounds,
        sg_per_round: f.sgPerRound,
      })),
      exposure: {
        lifetime_bets: profile.exposure.lifetimeBets,
        lifetime_net_units: profile.exposure.lifetimeNetU,
        win_rate_percent: +(profile.exposure.winRate * 100).toFixed(1),
        open_bets: profile.exposure.openBets,
      },
      edge_note: profile.edge,
    },
  };
}

async function handleFullLeaderboard(input: Input) {
  const { fetchLeaderboard } = await import("@/lib/espn-leaderboard");
  const limit = Math.max(1, Math.min(200, (input.limit as number | undefined) ?? 30));
  const cutOnly = !!input.made_cut_only;
  try {
    const snap = await fetchLeaderboard();
    let rows = snap.players;
    if (cutOnly) rows = rows.filter((p) => !p.isCut);
    rows = rows
      .slice()
      .sort(
        (a, b) =>
          (a.posNum ?? 9999) - (b.posNum ?? 9999) ||
          a.name.localeCompare(b.name),
      )
      .slice(0, limit);
    return {
      event: snap.event?.name ?? null,
      round: snap.event?.period ?? null,
      state: snap.event?.state ?? null,
      players: rows.map((p) => ({
        position: p.posDisplay,
        player: p.name,
        total_to_par: p.totalToPar,
        today_to_par: p.todayLine?.toPar ?? null,
        thru: p.todayLine?.complete ? "F" : (p.todayLine?.thru ?? null),
        cut: p.isCut,
      })),
    };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

async function handleGradeBets() {
  const { fetchLeaderboard } = await import("@/lib/espn-leaderboard");
  const { gradeAll } = await import("@/lib/grading");
  const liveBets = DEMO_BETS.filter((b) => b.status === "live").map((b) => ({
    player: b.player,
    market: b.market,
    line: b.line,
    stake: b.stake,
    payout: b.payout,
  }));
  try {
    const snapshot = await fetchLeaderboard();
    const report = gradeAll(liveBets, snapshot);
    return {
      event: snapshot.event?.shortName ?? null,
      total: report.total,
      by_status: report.by_status,
      net_pnl_units: report.net_pnl_units,
      decisions: report.decisions.map((d) => ({
        player: d.bet.player,
        market: d.bet.market,
        line: d.bet.line,
        status: d.status,
        reason: d.reason,
        observed: d.observedValue,
        pnl_units: d.pnl,
      })),
    };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

async function handleLiveOdds(input: Input) {
  const player = (input.player as string | undefined) ?? "";
  if (!player) {
    return { error: "player is required" };
  }
  if (!oddsApiEnabled()) {
    return {
      source: "unavailable",
      reason: "THE_ODDS_API_KEY not configured",
      player,
      quotes: [],
    };
  }
  const quotes = await getPlayerHedgeQuotes(player);
  return {
    source: quotes ? "the-odds-api" : "unavailable",
    player,
    quotes: quotes ?? [],
  };
}

function handleModelCalibration(input: Input) {
  const includePerPlayer = !!input.per_player;
  const stats = calibrate();
  const out: Record<string, unknown> = {
    rounds_sampled: stats.rounds,
    bias_strokes_per_round: stats.meanResidual,
    mean_abs_error: stats.meanAbsResidual,
    rmse: stats.rmse,
    r_squared: stats.rSquared,
    pearson_r: stats.pearson,
    buckets: stats.buckets.map((b) => ({
      regime: b.label,
      wind_mph_range: `${b.windRangeLow}-${b.windRangeHigh}`,
      rounds: b.rounds,
      mean_predicted: b.meanPredicted,
      mean_actual: b.meanActual,
      bias: b.bias,
    })),
  };
  if (includePerPlayer) {
    out.per_player = perPlayer().map((p) => ({
      slug: p.slug,
      name: p.name,
      current_coefficient: p.current,
      suggested_coefficient: p.suggested,
      rounds: p.rounds,
      bias: p.bias,
      mae: p.mae,
    }));
  }
  return out;
}

function handleBacktest(input: Input) {
  const strategyId = input.strategy_id as string | undefined;
  const tournament = input.tournament as string | undefined;
  const bets = tournament
    ? SETTLED_BETS.filter((b) => b.tournament === tournament)
    : SETTLED_BETS;
  if (tournament && !bets.length) {
    return {
      error: `No settled bets found for tournament '${tournament}'.`,
      available: Array.from(new Set(SETTLED_BETS.map((b) => b.tournament))),
    };
  }
  const targets = strategyId
    ? STRATEGIES.filter((s) => s.id === strategyId)
    : STRATEGIES;
  if (!targets.length) {
    return {
      error: `Unknown strategy_id '${strategyId}'.`,
      available: STRATEGIES.map((s) => s.id),
    };
  }
  const results = targets.map((s) => {
    const r = runStrategy(s, bets);
    return {
      strategy_id: s.id,
      strategy_label: s.label,
      description: s.description,
      bets_taken: r.taken,
      bets_skipped: r.skipped,
      wins: r.wins,
      losses: r.losses,
      win_rate_percent: +(r.winRate * 100).toFixed(1),
      net_units: r.netUnits,
      roi_percent: +(r.roi * 100).toFixed(1),
      max_drawdown_units: r.maxDrawdown,
      profit_factor: r.profitFactor === Infinity ? "inf" : r.profitFactor,
    };
  });
  return {
    tournament: tournament ?? "all",
    sample_size: bets.length,
    results,
  };
}

async function handlePreview(input: Input) {
  const slug = (input.course_slug as string | undefined) ?? "";
  const preview = await buildPreviewAsync(slug);
  if (!preview) {
    return {
      error: `No preview available for course_slug '${slug}'.`,
      available: ["quail-hollow", "pebble-beach", "torrey-pines-south"],
    };
  }
  return {
    tournament: preview.tournament,
    course: preview.snapshot.name,
    location: preview.snapshot.location,
    archetype: preview.course.archetype,
    headline: preview.headline,
    weather: preview.weather,
    top_fits: preview.fitPlayers.map((f) => ({
      player: f.player.name,
      archetype_sg_per_round: f.archetypeFit,
      wind_adjusted_4_round_edge: f.windAdjusted,
      rationale: f.rationale,
    })),
    angles: preview.angles.map((a) => ({
      kind: a.kind,
      title: a.title,
      body: a.body,
    })),
    hedge_candidates: preview.hedgeCandidates,
    fades: preview.fades.map((f) => ({
      player: f.player.name,
      wind_adjusted_4_round_edge: f.windAdjusted,
      rationale: f.rationale,
    })),
    history_notes: preview.historyNotes,
  };
}

async function handleForecast(input: Input) {
  const slug = (input.course_slug as string | undefined) ?? "";
  const hours = Math.min(
    Math.max(1, (input.hours as number | undefined) ?? 24),
    48,
  );
  const forecast = await getForecast(slug);
  return {
    course: slug,
    source: forecast.source,
    fetched_at: forecast.fetchedAt,
    next_24h: forecast.next24,
    hours: forecast.hours.slice(0, hours).map((h) => ({
      ts: h.ts,
      wind_mph: h.windMph,
      gust_mph: h.gustMph,
      wind_dir_deg: h.windDirDeg,
      temperature_f: h.temperatureF,
      precip_chance_percent: h.precipChance,
    })),
  };
}

function handleOpenBets(input: Input) {
  const book = input.book as string | undefined;
  const wave = input.wave as string | undefined;
  const min = input.min_ev as number | undefined;
  const max = input.max_ev as number | undefined;
  const filtered = DEMO_BETS.filter((b) => {
    if (b.status !== "live") return false;
    if (book && b.book !== book) return false;
    if (wave && b.wave !== wave) return false;
    if (min !== undefined && b.ev < min) return false;
    if (max !== undefined && b.ev > max) return false;
    return true;
  });
  return {
    count: filtered.length,
    bets: filtered.map((b) => ({
      book: b.book,
      player: b.player,
      market: b.market,
      line: b.line,
      stake_u: b.stake,
      to_win_u: b.payout,
      wave: b.wave,
      live_ev_percent: b.ev,
      live_score: b.live.score,
      thru: b.live.thru,
      hedge_available: !!b.hedge,
    })),
  };
}

function handleSettled(input: Input) {
  const groupKey = input.group_by as "book" | "market" | undefined;
  const totals = summarize(SETTLED_BETS);
  const out: Record<string, unknown> = {
    settled_count: totals.total,
    wins: totals.wins,
    losses: totals.losses,
    win_rate_percent: +(totals.winRate * 100).toFixed(1),
    net_units: +totals.netUnits.toFixed(2),
    roi_percent: +(totals.roi * 100).toFixed(1),
  };
  if (groupKey === "book") {
    out.by_book = groupBy(SETTLED_BETS, (b) => b.book).map((g) => ({
      book: g.key,
      bets: g.total,
      win_rate_percent: +(g.winRate * 100).toFixed(1),
      net_units: +g.netUnits.toFixed(2),
      roi_percent: +(g.roi * 100).toFixed(1),
    }));
  } else if (groupKey === "market") {
    out.by_market = groupBy(SETTLED_BETS, (b) => {
      const m = b.market.toLowerCase();
      if (m.includes("top")) return "Top finish";
      if (m.includes("matchup")) return "Matchup";
      if (m.includes("win")) return "To win";
      if (m.includes("score")) return "Round score";
      return "Player props";
    }).map((g) => ({
      market: g.key,
      bets: g.total,
      win_rate_percent: +(g.winRate * 100).toFixed(1),
      net_units: +g.netUnits.toFixed(2),
      roi_percent: +(g.roi * 100).toFixed(1),
    }));
  }
  return out;
}

function handleAlerts(input: Input) {
  const courseId = input.course_id as string | undefined;
  const filtered = courseId
    ? ALERT_HISTORY.filter((a) => a.courseId === courseId)
    : ALERT_HISTORY;
  return {
    count: filtered.length,
    alerts: filtered.map((a) => ({
      kind: a.kind,
      severity: a.severity,
      course: a.course,
      time: a.time,
      title: a.title,
      detail: a.detail,
      affected_bets: a.affectedBets,
    })),
  };
}

function handleConditions(input: Input) {
  const courseId = input.course_id as string | undefined;
  const filtered = courseId ? COURSES.filter((c) => c.id === courseId) : COURSES;
  return {
    courses: filtered.map((c) => ({
      id: c.id,
      name: c.name,
      tournament: c.tournament,
      status: c.status,
      wind_mph: c.wind,
      gust_mph: c.gust,
      wind_direction: c.windDirLabel,
      temperature_f: c.temperatureF,
      precip_chance_percent: c.precipChance,
      am_strokes_gained_delta: c.amSg,
      pm_strokes_gained_delta: c.pmSg,
      your_am_bets: c.yourBets.am,
      your_pm_bets: c.yourBets.pm,
      narrative: c.conditionsEdge,
    })),
  };
}

function handleLeaderboard(input: Input) {
  const limit = (input.limit as number | undefined) ?? 12;
  const mineOnly = input.mine_only as boolean | undefined;
  const rows = mineOnly
    ? DEMO_LEADERBOARD.filter((r) => r.mine && r.mine.length > 0)
    : DEMO_LEADERBOARD.slice(0, limit);
  return {
    tournament: "Quail Hollow Championship",
    round: "R2",
    rows: rows.map((r) => ({
      position: r.pos,
      player: r.name,
      to_par: r.score,
      thru: r.thru,
      wave: r.wave,
      your_bets: r.mine ?? [],
    })),
  };
}

function handleHedge(input: Input) {
  const player = (input.player as string | undefined) ?? "";
  const market = input.market as string | undefined;
  const bet = DEMO_BETS.find(
    (b) =>
      b.player.toLowerCase().includes(player.toLowerCase()) &&
      (!market || b.market.toLowerCase().includes(market.toLowerCase())),
  );
  if (!bet) return { error: "No matching open bet found for that player." };

  // Mock hedge calc: opposite side at -150 across a different book.
  // Real impl pulls live odds from The Odds API for the inverse market.
  const oppositeBook =
    bet.book === "DK" ? "FD" : bet.book === "FD" ? "DK" : "DK";
  const hedgeOdds = -150;
  const hedgeStake = +(bet.payout * 0.65).toFixed(2);
  const lockedProfit = +(bet.payout - bet.stake - hedgeStake).toFixed(2);

  return {
    original_bet: {
      book: bet.book,
      player: bet.player,
      market: bet.market,
      stake_u: bet.stake,
      to_win_u: bet.payout,
      live_ev_percent: bet.ev,
    },
    recommended_hedge: {
      book: oppositeBook,
      odds: hedgeOdds,
      stake_u: hedgeStake,
      explanation:
        "Take the opposite side of the same market at a different book to lock guaranteed profit regardless of outcome.",
    },
    locked_profit_u: lockedProfit,
    upside_if_no_hedge_u: +(bet.payout - bet.stake).toFixed(2),
  };
}

function handleDfs(input: Input) {
  const min = input.min_wind_adj as number | undefined;
  const pool = min !== undefined ? DFS_PLAYERS.filter((p) => p.windAdj >= min) : DFS_PLAYERS;
  return {
    slate: "Quail Hollow main",
    salary_cap: 50000,
    players: pool.map((p) => ({
      name: p.name,
      salary: p.salary,
      projection: p.projection,
      ownership_percent: p.ownership,
      wave: p.wave,
      wind_adjustment_strokes: p.windAdj,
      floor: p.floor,
      ceiling: p.ceiling,
    })),
  };
}

export const SYSTEM_PROMPT = `You are Greenside, an AI assistant for golf bettors and DFS players.

You help the user reason about their own bet portfolio, live tournament conditions, and DFS lineups. You have tools to read their open bets, settled history, the leaderboard, course weather, and the DFS player pool. Use tools liberally to ground every answer in real data — never guess numbers.

Tone:
- Sharp, direct, friendly. No fluff. The user is a serious bettor.
- Use markdown sparingly. Short paragraphs. Bullet lists for multi-item answers.
- When you reference a number, say where it came from ("your 3 AM-wave bets" not just "your bets").
- Never give legal/financial advice. Never tell them to bet more. Surface the data and let them decide.

When to use tools:
- ALWAYS call a tool before answering questions about specific bets, prices, conditions, or leaderboard. Don't rely on memory.
- For "hedge X" requests, call compute_hedge.
- For DFS questions, call get_dfs_player_pool.
- For "what if I had skipped X" / "which rule has been working" / strategy questions, call run_backtest. Pass strategy_id when the user names a specific rule; otherwise return them all.
- For "preview this tournament" / "who's the play" / "what's the angle this week", call build_preview with the appropriate course slug.
- For wind / weather / forecast questions, call get_forecast. It returns hourly data plus a 24h aggregate.
- For deep dives on a specific player (form, wind sensitivity, archetype fit, the user's own exposure on them), call get_player_profile.
- If the user asks whether the model is right / calibrated / trustworthy, or for a coefficient suggestion, call model_calibration with per_player:true.
- For "what's the live price on X" / cross-book comparison, call get_live_odds. When it returns source:"unavailable", say the live odds feed isn't wired and surface the demo prices from compute_hedge instead.
- For "how are my bets doing" / "did anything settle" / "what's still live", call grade_open_bets. Summarize by status and call out any newly settled legs.
- For "where is player X right now" / "top 10 right now" / "how does the cut look", call get_full_leaderboard. Use limit and made_cut_only to keep responses focused.

Current context: Quail Hollow Championship, Round 2 live. The user has 5–7 open bets across DK, FD, PrizePicks, Underdog.`;
