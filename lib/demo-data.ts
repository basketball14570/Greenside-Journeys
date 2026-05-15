// Demo data shared by the dashboard surfaces — sourced verbatim from the
// Claude Design handoff so the visual demo matches the prototype.
// Real data wiring replaces this layer in week 3-4 of the roadmap.

import type {
  AlertItem,
  DashBet,
  LeaderRow,
} from "@/components/edge/sections";

export const DEMO_BETS: DashBet[] = [
  {
    book: "DK",
    player: "Scottie Scheffler",
    market: "Top 10 Finish",
    line: "+250",
    stake: 1.0,
    payout: 3.5,
    status: "live",
    wave: "AM",
    live: { score: "-9", thru: "F" },
    ev: 8,
  },
  {
    book: "PP",
    player: "Patrick Cantlay",
    market: "Fairways Hit",
    line: "O 8.5",
    stake: 0.5,
    payout: 1.4,
    status: "live",
    wave: "PM",
    live: { score: "-7", thru: "15" },
    ev: -8,
  },
  {
    book: "FD",
    player: "Rory McIlroy",
    market: "R2 Score",
    line: "U 70",
    stake: 1.5,
    payout: 3.6,
    status: "live",
    wave: "AM",
    live: { score: "-8", thru: "14" },
    ev: 22,
    hedge: true,
  },
  {
    book: "UD",
    player: "Collin Morikawa",
    market: "Top 20 Finish",
    line: "+140",
    stake: 1.0,
    payout: 2.4,
    status: "live",
    wave: "AM",
    live: { score: "-6", thru: "F" },
    ev: 4,
  },
  {
    book: "DK",
    player: "Schauffele vs Spieth",
    market: "R2 Matchup",
    line: "-115",
    stake: 0.75,
    payout: 1.4,
    status: "graded",
    wave: "AM",
    live: { score: "W", thru: "F" },
    ev: 0,
    won: true,
  },
  {
    book: "FD",
    player: "V. Hovland",
    market: "To Win",
    line: "+2200",
    stake: 0.25,
    payout: 5.75,
    status: "live",
    wave: "PM",
    live: { score: "-6", thru: "13" },
    ev: 3,
  },
  {
    book: "PP",
    player: "J. Thomas",
    market: "Bogeys",
    line: "U 3.5",
    stake: 0.5,
    payout: 1.45,
    status: "live",
    wave: "PM",
    live: { score: "-5", thru: "12" },
    ev: -2,
  },
];

export const DEMO_LEADERBOARD: LeaderRow[] = [
  { pos: "1", name: "Mike Scofield", score: -10, thru: "F", wave: "AM" },
  { pos: "2", name: "Scottie Scheffler", score: -9, thru: "F", wave: "AM", mine: ["Top 10"] },
  { pos: "T3", name: "Rory McIlroy", score: -8, thru: "14", wave: "AM", mine: ["R2 U70"] },
  { pos: "T3", name: "Xander Schauffele", score: -8, thru: "F", wave: "AM", mine: ["Matchup"] },
  { pos: "5", name: "Patrick Cantlay", score: -7, thru: "15", wave: "PM", mine: ["FH O8.5"] },
  { pos: "T6", name: "Collin Morikawa", score: -6, thru: "F", wave: "AM", mine: ["Top 20"] },
  { pos: "T6", name: "Viktor Hovland", score: -6, thru: "13", wave: "PM", mine: ["Win"] },
  { pos: "8", name: "Justin Thomas", score: -5, thru: "12", wave: "PM", mine: ["Bogeys U3.5"] },
  { pos: "T9", name: "Jordan Spieth", score: -4, thru: "F", wave: "AM" },
  { pos: "T9", name: "Sam Burns", score: -4, thru: "11", wave: "PM" },
  { pos: "T9", name: "Ludvig Åberg", score: -4, thru: "F", wave: "AM" },
  { pos: "12", name: "Tony Finau", score: -3, thru: "10", wave: "PM" },
];

export const DEMO_ALERTS: AlertItem[] = [
  {
    kind: "wave",
    time: "7:42 AM",
    title: "AM wave gaining ~0.4 strokes EV",
    body: "Wind jumped 8 → 18 mph since 6 AM. Your 4 AM-wave bets just got cheaper.",
  },
  {
    kind: "wind",
    time: "7:31 AM",
    title: "Cantlay Fairways Hit O8.5 — now −8% EV",
    body: "15 mph crosswind on holes 12–15. Historically loses 1.2 FH/round in these conds.",
  },
  {
    kind: "hedge",
    time: "7:18 AM",
    title: "Hedge available: McIlroy R2 Under 70",
    body: "−8 thru 14. Live FD +145 locks +1.1u profit vs. risk on closing 4.",
  },
];

export const DEMO_ALERTS_DESKTOP: AlertItem[] = [
  ...DEMO_ALERTS,
  {
    kind: "wave",
    time: "6:55",
    title: "PM tee times confirmed",
    body: "Wind forecast on PM wave revised up: 18 → 22 mph.",
  },
];
