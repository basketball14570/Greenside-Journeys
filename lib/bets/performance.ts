// Server-safe bet performance aggregation. Collapses raw `bets` rows into
// decided tickets (parlay legs sharing a placed_at count once), then rolls
// up record / net units / ROI and per-dimension breakdowns. Mirrors the
// Tickets page math so the public profile and the dashboard agree.

export type RawBetRow = {
  id: string;
  player: string;
  market: string;
  book: string;
  line: number | null;
  stake: number | string;
  to_win: number | string;
  status: string;
  placed_at: string | null;
  resolved_at: string | null;
  created_at: string;
};

export type Ticket = {
  won: boolean;
  net: number;
  stake: number;
  book: string;
  market: string;
  legs: number;
  resolvedAt: string;
};

const TERMINAL = new Set(["won", "lost", "void", "push"]);

export function settledTickets(rows: RawBetRow[]): Ticket[] {
  const groups = new Map<string, RawBetRow[]>();
  for (const b of rows) {
    const key = b.placed_at ?? b.id;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(b);
  }

  const out: Ticket[] = [];
  for (const legs of groups.values()) {
    const anyLost = legs.some((l) => l.status === "lost");
    const allTerminal = legs.every((l) => TERMINAL.has(l.status));
    if (!anyLost && !allTerminal) continue; // not fully decided

    const head = legs[0];
    const stake = Number(head.stake);
    const toWin = Number(head.to_win);
    const won = !anyLost;
    out.push({
      won,
      net: won ? toWin - stake : -stake,
      stake,
      book: head.book,
      market: legs.length > 1 ? "Parlay" : head.market,
      legs: legs.length,
      resolvedAt:
        legs.map((l) => l.resolved_at).filter(Boolean).sort().slice(-1)[0] ??
        head.placed_at ??
        head.created_at,
    });
  }
  return out.sort((a, b) => (a.resolvedAt < b.resolvedAt ? 1 : -1));
}

export type Summary = {
  count: number;
  wins: number;
  losses: number;
  winRate: number;
  netUnits: number;
  totalStaked: number;
  roi: number;
};

export function summarize(tickets: Ticket[]): Summary {
  const count = tickets.length;
  const wins = tickets.filter((t) => t.won).length;
  const netUnits = tickets.reduce((s, t) => s + t.net, 0);
  const totalStaked = tickets.reduce((s, t) => s + t.stake, 0);
  return {
    count,
    wins,
    losses: count - wins,
    winRate: count ? wins / count : 0,
    netUnits,
    totalStaked,
    roi: totalStaked ? netUnits / totalStaked : 0,
  };
}

export type Breakdown = { key: string; net: number; roi: number; count: number };

export function breakdownBy(tickets: Ticket[], dim: "book" | "market"): Breakdown[] {
  const map = new Map<string, Ticket[]>();
  for (const t of tickets) {
    const k = dim === "book" ? t.book.toUpperCase() : t.market;
    (map.get(k) ?? map.set(k, []).get(k)!).push(t);
  }
  return [...map.entries()]
    .map(([key, ts]) => {
      const s = summarize(ts);
      return { key, net: s.netUnits, roi: s.roi, count: s.count };
    })
    .sort((a, b) => b.net - a.net);
}

// Cumulative net-units series (oldest → newest) for a sparkline.
export function cumulativeSeries(tickets: Ticket[]): number[] {
  const chrono = [...tickets].reverse();
  let cum = 0;
  return chrono.map((t) => (cum += t.net));
}
