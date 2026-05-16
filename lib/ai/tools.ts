// Tools the Ask Greenside assistant can call.
//
// Each tool has (a) a JSON-schema definition Claude sees and (b) a server-side
// handler that returns concrete data. While Supabase isn't wired the handlers
// read demo data; the handler signatures don't change when real data lands.

import { DEMO_BETS, DEMO_ALERTS_DESKTOP, DEMO_LEADERBOARD } from "@/lib/demo-data";
import { SETTLED_BETS, summarize, groupBy } from "@/lib/demo-history";
import { COURSES, ALERT_HISTORY } from "@/lib/demo-courses";
import { DFS_PLAYERS } from "@/lib/demo-dfs";

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
    default:
      return { error: `Unknown tool ${name}` };
  }
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

Current context: Quail Hollow Championship, Round 2 live. The user has 5–7 open bets across DK, FD, PrizePicks, Underdog.`;
