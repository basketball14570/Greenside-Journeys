// Course conditions demo data, used by /dashboard/conditions until
// Tomorrow.io is wired.

import type { WindPoint } from "@/components/edge/primitives";

export type CourseSnapshot = {
  id: string;
  name: string;
  location: string;
  tournament: string;
  round: string;
  status: "live" | "upcoming" | "final";
  wind: number;        // mph sustained
  gust: number;        // mph
  windDir: number;     // degrees
  windDirLabel: string;
  precipChance: number;
  precipIntensity: number; // mm/hr
  temperatureF: number;
  humidity: number;
  hourly: WindPoint[];
  amSg: number;
  pmSg: number;
  yourBets: { am: number; pm: number };
  conditionsEdge: string;
};

const BASE_HOURLY: WindPoint[] = [
  { v: 6, gust: 9 },
  { v: 7, gust: 10 },
  { v: 8, gust: 12 },
  { v: 9, gust: 13 },
  { v: 11, gust: 16 },
  { v: 13, gust: 19 },
  { v: 16, gust: 23 },
  { v: 18, gust: 27, now: true },
  { v: 20, gust: 28 },
  { v: 21, gust: 29 },
  { v: 19, gust: 26 },
  { v: 16, gust: 22 },
  { v: 13, gust: 18 },
  { v: 10, gust: 14 },
];

export const COURSES: CourseSnapshot[] = [
  {
    id: "quail-hollow",
    name: "Quail Hollow Club",
    location: "Charlotte, NC",
    tournament: "Quail Hollow Championship",
    round: "R2",
    status: "live",
    wind: 18,
    gust: 27,
    windDir: 245,
    windDirLabel: "WSW",
    precipChance: 10,
    precipIntensity: 0,
    temperatureF: 71,
    humidity: 56,
    hourly: BASE_HOURLY,
    amSg: +0.4,
    pmSg: -0.4,
    yourBets: { am: 4, pm: 3 },
    conditionsEdge: "AM wave banking strokes before PM tees into stronger wind.",
  },
  {
    id: "pebble-beach",
    name: "Pebble Beach Golf Links",
    location: "Pebble Beach, CA",
    tournament: "AT&T Pebble Beach Pro-Am",
    round: "Practice",
    status: "upcoming",
    wind: 11,
    gust: 18,
    windDir: 280,
    windDirLabel: "W",
    precipChance: 35,
    precipIntensity: 0.4,
    temperatureF: 58,
    humidity: 78,
    hourly: BASE_HOURLY.map((p) => ({
      v: Math.max(4, p.v - 6),
      gust: (p.gust ?? 0) - 5,
      now: p.now,
    })),
    amSg: -0.1,
    pmSg: +0.1,
    yourBets: { am: 0, pm: 2 },
    conditionsEdge: "Marine layer holding through morning — softer greens early.",
  },
  {
    id: "torrey-pines-south",
    name: "Torrey Pines (South)",
    location: "La Jolla, CA",
    tournament: "Genesis Invitational (next week)",
    round: "Pre-event",
    status: "upcoming",
    wind: 8,
    gust: 13,
    windDir: 290,
    windDirLabel: "WNW",
    precipChance: 5,
    precipIntensity: 0,
    temperatureF: 65,
    humidity: 64,
    hourly: BASE_HOURLY.map((p) => ({
      v: Math.max(3, p.v - 8),
      gust: Math.max(5, (p.gust ?? 0) - 10),
      now: p.now,
    })),
    amSg: +0.05,
    pmSg: -0.05,
    yourBets: { am: 0, pm: 0 },
    conditionsEdge: "Light onshore breeze, firming through the week.",
  },
];

export type ConditionAlertHistory = {
  id: string;
  courseId: string;
  course: string;
  kind: "wave" | "wind" | "hedge" | "precip";
  severity: "info" | "warning" | "critical";
  time: string;        // display
  title: string;
  detail: string;
  affectedBets: number;
};

export const ALERT_HISTORY: ConditionAlertHistory[] = [
  {
    id: "h1",
    courseId: "quail-hollow",
    course: "Quail Hollow",
    kind: "wave",
    severity: "critical",
    time: "7:42 AM · 2m ago",
    title: "AM wave gaining ~0.4 strokes EV",
    detail: "Wind jumped 8 → 18 mph since 6 AM. 4 AM-wave bets got cheaper.",
    affectedBets: 4,
  },
  {
    id: "h2",
    courseId: "quail-hollow",
    course: "Quail Hollow",
    kind: "wind",
    severity: "warning",
    time: "7:31 AM · 13m ago",
    title: "Cantlay Fairways Hit O8.5 — now −8% EV",
    detail: "15 mph crosswind on holes 12–15.",
    affectedBets: 1,
  },
  {
    id: "h3",
    courseId: "quail-hollow",
    course: "Quail Hollow",
    kind: "hedge",
    severity: "warning",
    time: "7:18 AM · 26m ago",
    title: "Hedge open: McIlroy R2 Under 70",
    detail: "−8 thru 14. FD +145 locks +1.1u profit.",
    affectedBets: 1,
  },
  {
    id: "h4",
    courseId: "pebble-beach",
    course: "Pebble Beach",
    kind: "precip",
    severity: "info",
    time: "6:55 AM · 49m ago",
    title: "Light rain expected 9–11 AM at Pebble",
    detail: "0.4mm/hr. Greens softening for AM practice round.",
    affectedBets: 0,
  },
  {
    id: "h5",
    courseId: "quail-hollow",
    course: "Quail Hollow",
    kind: "wave",
    severity: "info",
    time: "6:30 AM · 1h ago",
    title: "PM tee times confirmed",
    detail: "Wind forecast on PM wave revised up: 18 → 22 mph.",
    affectedBets: 3,
  },
];
