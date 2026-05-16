// Per-player profile demo data — replaced by DataGolf-backed queries when wired.

export type RecentRound = {
  event: string;
  date: string;        // ISO
  finish: string;      // e.g. "T3", "MC", "W"
  sgTotal: number;     // strokes gained vs field
  sgOtt: number;
  sgApp: number;
  sgArg: number;
  sgPutt: number;
  windMph: number;     // avg wind during their rounds
};

export type CourseFit = {
  archetype: string;
  rounds: number;
  sgPerRound: number;
};

export type PlayerProfile = {
  slug: string;
  name: string;
  countryFlag: string;       // emoji for now
  worldRank: number;
  age: number;
  // Live wind-sensitivity coefficient: strokes lost per round per +10mph wind.
  // Lower is better (less affected). Fit from DataGolf round history.
  windSensitivity: number;
  windSensitivityRank: string; // e.g. "Top 10%" or "Bottom 25%"
  sgBaseline: number;          // strokes gained total per round, baseline conditions
  recent: RecentRound[];
  fit: CourseFit[];
  // User exposure history on this player.
  exposure: {
    lifetimeBets: number;
    lifetimeNetU: number;
    winRate: number;
    openBets: { market: string; line: string; book: string; ev: number; stake: number }[];
  };
  // Narrative one-liner from our model layer.
  edge: string;
};

export const PLAYERS: Record<string, PlayerProfile> = {
  scheffler: {
    slug: "scheffler",
    name: "Scottie Scheffler",
    countryFlag: "🇺🇸",
    worldRank: 1,
    age: 29,
    windSensitivity: 0.18,
    windSensitivityRank: "Top 8% — handles wind well",
    sgBaseline: 2.41,
    recent: [
      { event: "Truist Championship", date: "2026-05-12", finish: "T2",  sgTotal: 8.4,  sgOtt: 1.9, sgApp: 4.2, sgArg: 0.8, sgPutt: 1.5, windMph: 9  },
      { event: "Masters",             date: "2026-04-13", finish: "T5",  sgTotal: 7.2,  sgOtt: 1.5, sgApp: 3.8, sgArg: 1.4, sgPutt: 0.5, windMph: 12 },
      { event: "RBC Heritage",        date: "2026-04-21", finish: "W",   sgTotal: 12.1, sgOtt: 2.8, sgApp: 5.5, sgArg: 2.1, sgPutt: 1.7, windMph: 6  },
      { event: "Valero Texas Open",   date: "2026-04-07", finish: "T11", sgTotal: 4.6,  sgOtt: 0.9, sgApp: 2.8, sgArg: 0.6, sgPutt: 0.3, windMph: 14 },
      { event: "Players Championship",date: "2026-03-17", finish: "T18", sgTotal: 3.2,  sgOtt: 0.4, sgApp: 2.1, sgArg: 0.5, sgPutt: 0.2, windMph: 11 },
    ],
    fit: [
      { archetype: "Parkland · long",  rounds: 48, sgPerRound: 2.6 },
      { archetype: "Parkland · short", rounds: 22, sgPerRound: 1.9 },
      { archetype: "Coastal · wind",   rounds: 18, sgPerRound: 1.4 },
      { archetype: "Desert",           rounds: 14, sgPerRound: 2.2 },
    ],
    exposure: {
      lifetimeBets: 38,
      lifetimeNetU: +14.3,
      winRate: 0.55,
      openBets: [
        { market: "Top 10 Finish", line: "+250", book: "DK", ev: +8, stake: 1.0 },
      ],
    },
    edge: "Wind-resilient and at home on long parkland. AM wave puts him in cleaner air; modeled edge holds at current line.",
  },

  mcilroy: {
    slug: "mcilroy",
    name: "Rory McIlroy",
    countryFlag: "🇮🇪",
    worldRank: 3,
    age: 37,
    windSensitivity: 0.22,
    windSensitivityRank: "Top 18% — slightly above average",
    sgBaseline: 2.18,
    recent: [
      { event: "Truist Championship", date: "2026-05-12", finish: "W",   sgTotal: 11.4, sgOtt: 3.5, sgApp: 3.6, sgArg: 1.2, sgPutt: 3.1, windMph: 9  },
      { event: "Masters",             date: "2026-04-13", finish: "T9",  sgTotal: 6.1,  sgOtt: 2.4, sgApp: 2.0, sgArg: 0.9, sgPutt: 0.8, windMph: 12 },
      { event: "Players Championship",date: "2026-03-17", finish: "T15", sgTotal: 4.2,  sgOtt: 2.1, sgApp: 1.5, sgArg: 0.3, sgPutt: 0.3, windMph: 11 },
      { event: "Genesis Invitational",date: "2026-02-17", finish: "T6",  sgTotal: 7.8,  sgOtt: 2.7, sgApp: 2.8, sgArg: 1.1, sgPutt: 1.2, windMph: 13 },
      { event: "Dubai Desert Classic",date: "2026-01-20", finish: "T3",  sgTotal: 8.9,  sgOtt: 3.1, sgApp: 3.2, sgArg: 1.0, sgPutt: 1.6, windMph: 8  },
    ],
    fit: [
      { archetype: "Parkland · long",  rounds: 52, sgPerRound: 2.5 },
      { archetype: "Coastal · wind",   rounds: 31, sgPerRound: 1.9 },
      { archetype: "Links",            rounds: 26, sgPerRound: 2.2 },
      { archetype: "Desert",           rounds: 19, sgPerRound: 2.4 },
    ],
    exposure: {
      lifetimeBets: 42,
      lifetimeNetU: +8.7,
      winRate: 0.48,
      openBets: [
        { market: "Round 2 Score Under 70", line: "-110", book: "FD", ev: +22, stake: 1.5 },
      ],
    },
    edge: "Coming off a win and hot off the tee. Round-score Unders carry +EV when conditions soften late.",
  },

  cantlay: {
    slug: "cantlay",
    name: "Patrick Cantlay",
    countryFlag: "🇺🇸",
    worldRank: 12,
    age: 33,
    windSensitivity: 0.41,
    windSensitivityRank: "Bottom 25% — loses meaningful strokes in wind",
    sgBaseline: 1.42,
    recent: [
      { event: "Truist Championship", date: "2026-05-12", finish: "T22", sgTotal: 2.4, sgOtt: 0.5, sgApp: 1.2, sgArg: 0.3, sgPutt: 0.4, windMph: 9  },
      { event: "Masters",             date: "2026-04-13", finish: "T14", sgTotal: 4.1, sgOtt: 1.1, sgApp: 1.8, sgArg: 0.4, sgPutt: 0.8, windMph: 12 },
      { event: "RBC Heritage",        date: "2026-04-21", finish: "T8",  sgTotal: 5.2, sgOtt: 1.3, sgApp: 2.4, sgArg: 0.6, sgPutt: 0.9, windMph: 6  },
      { event: "Players Championship",date: "2026-03-17", finish: "MC",  sgTotal: -1.2, sgOtt: -0.4, sgApp: -0.2, sgArg: 0.1, sgPutt: -0.7, windMph: 11 },
      { event: "Genesis Invitational",date: "2026-02-17", finish: "T28", sgTotal: 1.4, sgOtt: 0.2, sgApp: 0.8, sgArg: 0.0, sgPutt: 0.4, windMph: 13 },
    ],
    fit: [
      { archetype: "Parkland · long",  rounds: 41, sgPerRound: 1.8 },
      { archetype: "Coastal · wind",   rounds: 22, sgPerRound: 0.4 },
      { archetype: "Desert",           rounds: 16, sgPerRound: 2.1 },
    ],
    exposure: {
      lifetimeBets: 19,
      lifetimeNetU: -4.2,
      winRate: 0.32,
      openBets: [
        { market: "Fairways Hit Over 8.5", line: "-110", book: "PP", ev: -8, stake: 0.5 },
      ],
    },
    edge: "Vulnerable in the current AM-wave wind. Fairways Hit Over went −8% EV after the 8→18 mph jump. Consider hedging or fading.",
  },

  schauffele: {
    slug: "schauffele",
    name: "Xander Schauffele",
    countryFlag: "🇺🇸",
    worldRank: 5,
    age: 32,
    windSensitivity: 0.28,
    windSensitivityRank: "Top 35% — handles wind OK",
    sgBaseline: 1.92,
    recent: [
      { event: "Truist Championship", date: "2026-05-12", finish: "T6",  sgTotal: 6.8, sgOtt: 1.9, sgApp: 2.4, sgArg: 1.0, sgPutt: 1.5, windMph: 9  },
      { event: "Masters",             date: "2026-04-13", finish: "T11", sgTotal: 4.2, sgOtt: 1.1, sgApp: 1.8, sgArg: 0.7, sgPutt: 0.6, windMph: 12 },
      { event: "RBC Heritage",        date: "2026-04-21", finish: "T15", sgTotal: 3.6, sgOtt: 1.0, sgApp: 1.4, sgArg: 0.5, sgPutt: 0.7, windMph: 6  },
      { event: "Players Championship",date: "2026-03-17", finish: "T8",  sgTotal: 5.4, sgOtt: 1.4, sgApp: 2.2, sgArg: 0.9, sgPutt: 0.9, windMph: 11 },
      { event: "Genesis Invitational",date: "2026-02-17", finish: "T3",  sgTotal: 8.1, sgOtt: 2.4, sgApp: 3.1, sgArg: 1.1, sgPutt: 1.5, windMph: 13 },
    ],
    fit: [
      { archetype: "Parkland · long",  rounds: 39, sgPerRound: 2.0 },
      { archetype: "Coastal · wind",   rounds: 24, sgPerRound: 1.8 },
      { archetype: "Links",            rounds: 14, sgPerRound: 2.4 },
    ],
    exposure: {
      lifetimeBets: 27,
      lifetimeNetU: +6.1,
      winRate: 0.52,
      openBets: [
        { market: "R2 Matchup vs Spieth", line: "-115", book: "DK", ev: +1, stake: 0.75 },
      ],
    },
    edge: "Consistent mid-pack EV across markets. Matchup edge holds in wind-neutral conditions.",
  },

  morikawa: {
    slug: "morikawa",
    name: "Collin Morikawa",
    countryFlag: "🇺🇸",
    worldRank: 8,
    age: 29,
    windSensitivity: 0.31,
    windSensitivityRank: "Top 45% — average wind tolerance",
    sgBaseline: 1.74,
    recent: [
      { event: "Truist Championship", date: "2026-05-12", finish: "T11", sgTotal: 4.6, sgOtt: 0.9, sgApp: 2.4, sgArg: 0.6, sgPutt: 0.7, windMph: 9  },
      { event: "Masters",             date: "2026-04-13", finish: "T20", sgTotal: 2.8, sgOtt: 0.4, sgApp: 1.6, sgArg: 0.4, sgPutt: 0.4, windMph: 12 },
      { event: "RBC Heritage",        date: "2026-04-21", finish: "T5",  sgTotal: 6.2, sgOtt: 1.1, sgApp: 3.1, sgArg: 0.6, sgPutt: 1.4, windMph: 6  },
      { event: "Players Championship",date: "2026-03-17", finish: "MC",  sgTotal: -0.8,sgOtt: -0.2,sgApp: -0.1,sgArg: 0.0, sgPutt: -0.5, windMph: 11 },
      { event: "Genesis Invitational",date: "2026-02-17", finish: "T14", sgTotal: 3.4, sgOtt: 0.4, sgApp: 1.9, sgArg: 0.5, sgPutt: 0.6, windMph: 13 },
    ],
    fit: [
      { archetype: "Parkland · long",  rounds: 37, sgPerRound: 1.9 },
      { archetype: "Coastal · wind",   rounds: 19, sgPerRound: 1.2 },
      { archetype: "Links",            rounds: 11, sgPerRound: 2.1 },
    ],
    exposure: {
      lifetimeBets: 22,
      lifetimeNetU: +2.4,
      winRate: 0.45,
      openBets: [
        { market: "Top 20 Finish", line: "+140", book: "UD", ev: +4, stake: 1.0 },
      ],
    },
    edge: "Steady iron play; Top 20 line carries small positive EV against the AM wave context.",
  },
};

export const PLAYER_LIST = Object.values(PLAYERS);
