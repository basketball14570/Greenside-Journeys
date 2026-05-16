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
    default:
      return { error: `Unknown tool ${name}` };
  }
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

Current context: Quail Hollow Championship, Round 2 live. The user has 5–7 open bets across DK, FD, PrizePicks, Underdog.`;
