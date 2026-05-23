import { describe, it, expect } from "vitest";
import { gradeBet, type OpenBet } from "@/lib/grading";
import {
  legToOpenBet,
  americanToDecimal,
  decimalToAmerican,
  type SlipLeg,
} from "@/lib/bet-slip";
import type {
  HoleScore,
  LeaderboardPlayer,
  LeaderboardSnapshot,
  RoundLine,
} from "@/lib/espn-leaderboard";

// Light builders so each test reads as data, not setup boilerplate.

function hole(num: number, strokes: number | null, par = 4): HoleScore {
  return { hole: num, strokes, par };
}

function round(
  period: number,
  toPar: string | null,
  thru: number | null,
  complete = false,
  holes: HoleScore[] = [],
): RoundLine {
  // Strokes: derive from holes when present, else fall back to par-relative
  // total (72 + toPar) so the grader doesn't short-circuit on "not started"
  // when we only care about toPar comparisons.
  const summed = holes.reduce((acc, h) => acc + (h.strokes ?? 0), 0);
  let strokes: number | null = null;
  if (summed > 0) strokes = summed;
  else if (toPar !== null) {
    const n = toPar === "E" ? 0 : Number(toPar.replace("+", ""));
    if (!Number.isNaN(n)) strokes = 72 + n;
  }
  return { period, strokes, toPar, thru, complete, holes };
}

function player(over: Partial<LeaderboardPlayer> & { name: string }): LeaderboardPlayer {
  return {
    id: over.name.toLowerCase().replace(/\s+/g, "-"),
    name: over.name,
    shortName: over.name,
    countryFlag: "",
    posDisplay: over.posDisplay ?? "1",
    posNum: over.posNum ?? 1,
    totalToPar: over.totalToPar ?? "E",
    totalScoreNum: over.totalScoreNum ?? 0,
    isCut: over.isCut ?? false,
    currentRound: over.currentRound ?? 1,
    todayLine: over.todayLine ?? null,
    rounds: over.rounds ?? [],
    teeTime: over.teeTime ?? null,
    statusText: over.statusText ?? "",
  };
}

function snapshot(
  players: LeaderboardPlayer[],
  override: Partial<LeaderboardSnapshot["event"]> & { state?: string } = {},
): LeaderboardSnapshot {
  return {
    event: {
      id: "test",
      name: "Test Event",
      shortName: "Test",
      state: (override.state as "pre" | "in" | "post") ?? "in",
      statusDetail: override.statusDetail ?? "R2",
      period: override.period ?? 2,
      course: override.course ?? null,
      coursePar: override.coursePar ?? 72,
      holePars: override.holePars ?? [],
      location: override.location ?? null,
    },
    players,
    fetchedAt: new Date().toISOString(),
  };
}

// ── Tests ────────────────────────────────────────────────────────

describe("americanToDecimal / decimalToAmerican", () => {
  it("converts -110 to ~1.91 and back", () => {
    const dec = americanToDecimal(-110);
    expect(dec).toBeCloseTo(1.909, 2);
    expect(decimalToAmerican(dec)).toBe(-110);
  });
  it("converts +250 to 3.5 and back", () => {
    const dec = americanToDecimal(250);
    expect(dec).toBe(3.5);
    expect(decimalToAmerican(dec)).toBe(250);
  });
  it("handles even money at +100 → 2.0", () => {
    expect(americanToDecimal(100)).toBe(2);
    expect(decimalToAmerican(2)).toBe(100);
  });
});

describe("legToOpenBet", () => {
  const base = {
    id: "x",
    createdAt: "2024-01-01T00:00:00Z",
    player: "Scottie Scheffler",
    stake: 1,
    americanOdds: -110,
  };

  it("maps a 3-ball leg to OpenBet with round + others", () => {
    const leg: SlipLeg = {
      ...base,
      kind: "three_ball",
      others: ["Matt Fitzpatrick", "Justin Rose"],
      round: 4,
    };
    const ob = legToOpenBet(leg);
    expect(ob.market).toBe("R4 3-Ball");
    expect(ob.round).toBe(4);
    expect(ob.others).toEqual(["Matt Fitzpatrick", "Justin Rose"]);
  });

  it("maps a round-narrowed matchup to 'R4 Matchup'", () => {
    const leg: SlipLeg = {
      ...base,
      kind: "matchup",
      opponent: "Patrick Cantlay",
      round: 4,
    };
    const ob = legToOpenBet(leg);
    expect(ob.market).toBe("R4 Matchup");
    expect(ob.opponent).toBe("Patrick Cantlay");
    expect(ob.round).toBe(4);
  });
});

describe("gradeBet — top_n", () => {
  const bet: OpenBet = {
    player: "Patrick Reed",
    market: "Top 10",
    line: "+450",
    stake: 1,
    payout: 5.5,
  };

  it("returns won when player is inside the top N at event end", () => {
    const snap = snapshot(
      [player({ name: "Patrick Reed", posDisplay: "T7", posNum: 7 })],
      { state: "post" },
    );
    const d = gradeBet(bet, snap);
    expect(d.status).toBe("won");
  });

  it("returns lost when player is cut", () => {
    const snap = snapshot([
      player({ name: "Patrick Reed", posDisplay: "CUT", posNum: null, isCut: true }),
    ]);
    const d = gradeBet(bet, snap);
    expect(d.status).toBe("lost");
  });

  it("returns live when in-tournament and outside the top N", () => {
    const snap = snapshot([
      player({ name: "Patrick Reed", posDisplay: "T22", posNum: 22 }),
    ]);
    const d = gradeBet(bet, snap);
    expect(d.status).toBe("live");
  });

  it("returns unknown when player is not in the field", () => {
    const snap = snapshot([player({ name: "Someone Else" })]);
    const d = gradeBet(bet, snap);
    expect(d.status).toBe("unknown");
  });
});

describe("gradeBet — round matchup", () => {
  it("returns live and 'Up X' when leg-player is leading in-round", () => {
    const snap = snapshot([
      player({
        name: "Viktor Hovland",
        rounds: [round(4, "-2", 12)],
      }),
      player({
        name: "Patrick Cantlay",
        rounds: [round(4, "E", 12)],
      }),
    ]);
    const bet: OpenBet = {
      player: "Viktor Hovland",
      market: "R4 Matchup",
      line: "-115",
      stake: 1,
      payout: 1.87,
      opponent: "Patrick Cantlay",
      round: 4,
    };
    const d = gradeBet(bet, snap);
    expect(d.status).toBe("live");
    expect(d.reason).toMatch(/up 2/i);
  });

  it("returns won when both rounds complete and leg-player is lower", () => {
    const snap = snapshot([
      player({
        name: "Viktor Hovland",
        rounds: [round(4, "-3", 18, true)],
      }),
      player({
        name: "Patrick Cantlay",
        rounds: [round(4, "+1", 18, true)],
      }),
    ]);
    const bet: OpenBet = {
      player: "Viktor Hovland",
      market: "R4 Matchup",
      line: "-115",
      stake: 1,
      payout: 1.87,
      opponent: "Patrick Cantlay",
      round: 4,
    };
    const d = gradeBet(bet, snap);
    expect(d.status).toBe("won");
  });

  it("pushes when tied after both rounds complete", () => {
    const snap = snapshot([
      player({
        name: "Viktor Hovland",
        rounds: [round(4, "E", 18, true)],
      }),
      player({
        name: "Patrick Cantlay",
        rounds: [round(4, "E", 18, true)],
      }),
    ]);
    const bet: OpenBet = {
      player: "Viktor Hovland",
      market: "R4 Matchup",
      line: "-115",
      stake: 1,
      payout: 1.87,
      opponent: "Patrick Cantlay",
      round: 4,
    };
    const d = gradeBet(bet, snap);
    expect(d.status).toBe("push");
  });
});

describe("gradeBet — three_ball", () => {
  const bet: OpenBet = {
    player: "Scottie Scheffler",
    market: "R4 3-Ball",
    line: "+109",
    stake: 1,
    payout: 2.09,
    others: ["Matt Fitzpatrick", "Justin Rose"],
    round: 4,
  };

  it("returns won when leg-player is lowest after the round closes", () => {
    const snap = snapshot([
      player({ name: "Scottie Scheffler", rounds: [round(4, "-4", 18, true)] }),
      player({ name: "Matt Fitzpatrick",  rounds: [round(4, "-1", 18, true)] }),
      player({ name: "Justin Rose",       rounds: [round(4, "+2", 18, true)] }),
    ]);
    const d = gradeBet(bet, snap);
    expect(d.status).toBe("won");
  });

  it("returns lost when leg-player is not lowest after the round closes", () => {
    const snap = snapshot([
      player({ name: "Scottie Scheffler", rounds: [round(4, "+1", 18, true)] }),
      player({ name: "Matt Fitzpatrick",  rounds: [round(4, "-2", 18, true)] }),
      player({ name: "Justin Rose",       rounds: [round(4, "E", 18, true)] }),
    ]);
    const d = gradeBet(bet, snap);
    expect(d.status).toBe("lost");
  });

  it("returns live mid-round even with a current lead", () => {
    const snap = snapshot([
      player({ name: "Scottie Scheffler", rounds: [round(4, "-2", 12)] }),
      player({ name: "Matt Fitzpatrick",  rounds: [round(4, "E", 12)] }),
      player({ name: "Justin Rose",       rounds: [round(4, "+1", 12)] }),
    ]);
    const d = gradeBet(bet, snap);
    expect(d.status).toBe("live");
  });
});

describe("gradeBet — birdies prop", () => {
  // Build a hole-by-hole round: 4 birdies (3 strokes on a par 4), rest pars.
  const holes: HoleScore[] = [
    hole(1, 3),
    hole(2, 3),
    hole(3, 4),
    hole(4, 4),
    hole(5, 3),
    hole(6, 4),
    hole(7, 3),
    hole(8, 4),
    hole(9, 4),
    hole(10, 4),
    hole(11, 4),
    // 11 holes played, 4 birdies. Holes 12-18 unplayed.
    hole(12, null),
    hole(13, null),
    hole(14, null),
    hole(15, null),
    hole(16, null),
    hole(17, null),
    hole(18, null),
  ];

  it("returns won immediately when observed exceeds an over line", () => {
    const snap = snapshot([
      player({
        name: "Rasmus Hojgaard",
        rounds: [round(2, "-4", 11, false, holes)],
      }),
    ]);
    const bet: OpenBet = {
      player: "Rasmus Hojgaard",
      market: "R2 Birdies",
      line: "O 3.5",
      stake: 1,
      payout: 1.91,
      round: 2,
    };
    const d = gradeBet(bet, snap);
    expect(d.status).toBe("won");
    expect(d.observedValue).toBe(4);
  });

  it("matches with unicode-fold on the player name (ø → o)", () => {
    const snap = snapshot([
      player({
        name: "Rasmus Højgaard",
        rounds: [round(2, "-4", 11, false, holes)],
      }),
    ]);
    const bet: OpenBet = {
      player: "Rasmus Hojgaard",
      market: "R2 Birdies",
      line: "O 3.5",
      stake: 1,
      payout: 1.91,
      round: 2,
    };
    const d = gradeBet(bet, snap);
    expect(d.status).toBe("won");
  });
});

describe("gradeBet — make_cut", () => {
  it("returns won when made cut and event finalized", () => {
    const snap = snapshot(
      [player({ name: "Jordan Spieth", posDisplay: "T34", posNum: 34, isCut: false })],
      { state: "post" },
    );
    const bet: OpenBet = {
      player: "Jordan Spieth",
      market: "Make Cut",
      line: "-200",
      stake: 1,
      payout: 1.5,
    };
    const d = gradeBet(bet, snap);
    expect(d.status).toBe("won");
  });

  it("returns lost when player is cut", () => {
    const snap = snapshot(
      [player({ name: "Jordan Spieth", posDisplay: "CUT", posNum: null, isCut: true })],
      { state: "post" },
    );
    const bet: OpenBet = {
      player: "Jordan Spieth",
      market: "Make Cut",
      line: "-200",
      stake: 1,
      payout: 1.5,
    };
    const d = gradeBet(bet, snap);
    expect(d.status).toBe("lost");
  });
});

describe("gradeBet — winner / outright", () => {
  it("returns won when finalized at T1", () => {
    const snap = snapshot(
      [player({ name: "Scottie Scheffler", posDisplay: "1", posNum: 1, totalToPar: "-12" })],
      { state: "post" },
    );
    const bet: OpenBet = {
      player: "Scottie Scheffler",
      market: "Tournament Winner",
      line: "+800",
      stake: 1,
      payout: 9,
    };
    const d = gradeBet(bet, snap);
    expect(d.status).toBe("won");
  });

  it("returns lost when finalized outside T1", () => {
    const snap = snapshot(
      [player({ name: "Scottie Scheffler", posDisplay: "T4", posNum: 4 })],
      { state: "post" },
    );
    const bet: OpenBet = {
      player: "Scottie Scheffler",
      market: "Tournament Winner",
      line: "+800",
      stake: 1,
      payout: 9,
    };
    const d = gradeBet(bet, snap);
    expect(d.status).toBe("lost");
  });
});
