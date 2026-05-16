// Wind / weather forecast provider. Two backends ship today:
//
// 1. Open-Meteo — free, no key, runs from the server with no credentials.
//    This is the default. Coverage is good for the US/EU; resolution is
//    hourly at ~9 km grid spacing.
//
// 2. Tomorrow.io — when TOMORROW_IO_KEY is set in the environment, we
//    swap to their endpoint. Higher fidelity, paid plan once you exceed
//    the free tier. Adapter included as a stub so flipping providers is
//    a one-env-var change.
//
// Coordinate fixtures live below; replace with a DB lookup once venues
// move into Supabase. All functions are pure-ish: they cache responses
// in-memory for 5 minutes so the same course doesn't get re-fetched
// across simultaneous renders.

export type ForecastHour = {
  ts: string;            // ISO timestamp, hour granularity
  windMph: number;
  gustMph: number;
  windDirDeg: number;
  temperatureF: number;
  precipChance: number;  // 0..100
  precipIntensityMm: number;
};

export type Forecast = {
  courseId: string;
  source: "open-meteo" | "tomorrow.io" | "demo";
  fetchedAt: string;
  hours: ForecastHour[];
  // Convenience aggregates for the next 24h
  next24: {
    windMphAvg: number;
    windMphMax: number;
    gustMphMax: number;
    precipChanceMax: number;
  };
};

// Course coordinates — used by both providers. Replace with DB rows when
// the venues table moves to Supabase.
export const COURSE_COORDS: Record<string, { lat: number; lon: number; tz: string }> = {
  "quail-hollow": { lat: 35.1582, lon: -80.8154, tz: "America/New_York" },
  "pebble-beach": { lat: 36.5687, lon: -121.9492, tz: "America/Los_Angeles" },
  "torrey-pines-south": { lat: 32.9043, lon: -117.2517, tz: "America/Los_Angeles" },
};

const CACHE = new Map<string, { at: number; data: Forecast }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function getForecast(
  courseId: string,
  opts: { provider?: "open-meteo" | "tomorrow.io" | "auto"; signal?: AbortSignal } = {},
): Promise<Forecast> {
  const cached = CACHE.get(courseId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

  const coords = COURSE_COORDS[courseId];
  if (!coords) return demoForecast(courseId);

  const provider =
    opts.provider ??
    (process.env.TOMORROW_IO_KEY ? "tomorrow.io" : "open-meteo");

  try {
    const data =
      provider === "tomorrow.io"
        ? await fetchTomorrowIo(courseId, coords, opts.signal)
        : await fetchOpenMeteo(courseId, coords, opts.signal);
    CACHE.set(courseId, { at: Date.now(), data });
    return data;
  } catch {
    // Fall back to demo data rather than throwing — preview pages should
    // still render even when the upstream weather feed is offline.
    return demoForecast(courseId);
  }
}

// ── Open-Meteo ──────────────────────────────────────────────
//
// API docs: https://open-meteo.com/en/docs
// Free, no key required, generous rate limits.
async function fetchOpenMeteo(
  courseId: string,
  coords: { lat: number; lon: number; tz: string },
  signal?: AbortSignal,
): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: String(coords.lat),
    longitude: String(coords.lon),
    hourly:
      "temperature_2m,precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m,wind_direction_10m",
    wind_speed_unit: "mph",
    temperature_unit: "fahrenheit",
    forecast_days: "2",
    timezone: coords.tz,
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  const res = await fetch(url, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const json = await res.json();
  const t: string[] = json.hourly?.time ?? [];
  const wind: number[] = json.hourly?.wind_speed_10m ?? [];
  const gust: number[] = json.hourly?.wind_gusts_10m ?? [];
  const dir: number[] = json.hourly?.wind_direction_10m ?? [];
  const temp: number[] = json.hourly?.temperature_2m ?? [];
  const pop: number[] = json.hourly?.precipitation_probability ?? [];
  const precip: number[] = json.hourly?.precipitation ?? [];
  const hours: ForecastHour[] = t.map((iso, i) => ({
    ts: iso,
    windMph: round(wind[i] ?? 0, 1),
    gustMph: round(gust[i] ?? 0, 1),
    windDirDeg: Math.round(dir[i] ?? 0),
    temperatureF: round(temp[i] ?? 0, 0),
    precipChance: Math.round(pop[i] ?? 0),
    precipIntensityMm: round(precip[i] ?? 0, 2),
  }));
  return wrapWithAggregates(courseId, "open-meteo", hours);
}

// ── Tomorrow.io ─────────────────────────────────────────────
//
// Higher-resolution adapter; activated when TOMORROW_IO_KEY is set.
// Field names below match their /v4/timelines response.
async function fetchTomorrowIo(
  courseId: string,
  coords: { lat: number; lon: number; tz: string },
  signal?: AbortSignal,
): Promise<Forecast> {
  const key = process.env.TOMORROW_IO_KEY;
  if (!key) throw new Error("TOMORROW_IO_KEY not set");
  const params = new URLSearchParams({
    location: `${coords.lat},${coords.lon}`,
    fields:
      "temperature,precipitationIntensity,precipitationProbability,windSpeed,windGust,windDirection",
    units: "imperial",
    timesteps: "1h",
    apikey: key,
  });
  const url = `https://api.tomorrow.io/v4/timelines?${params}`;
  const res = await fetch(url, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`tomorrow.io ${res.status}`);
  const json = await res.json();
  const intervals: any[] = json.data?.timelines?.[0]?.intervals ?? [];
  const hours: ForecastHour[] = intervals.map((iv) => ({
    ts: iv.startTime,
    windMph: round(iv.values.windSpeed ?? 0, 1),
    gustMph: round(iv.values.windGust ?? 0, 1),
    windDirDeg: Math.round(iv.values.windDirection ?? 0),
    temperatureF: round(iv.values.temperature ?? 0, 0),
    precipChance: Math.round(iv.values.precipitationProbability ?? 0),
    precipIntensityMm: round(iv.values.precipitationIntensity ?? 0, 2),
  }));
  return wrapWithAggregates(courseId, "tomorrow.io", hours);
}

// Stand-in used when a course has no coords or upstream calls fail.
function demoForecast(courseId: string): Forecast {
  const base = courseId === "pebble-beach" ? 11 : courseId === "torrey-pines-south" ? 9 : 14;
  const now = Date.now();
  const hours: ForecastHour[] = Array.from({ length: 24 }, (_, i) => {
    const drift = Math.sin(i / 3) * 4;
    return {
      ts: new Date(now + i * 3600_000).toISOString(),
      windMph: round(base + drift, 1),
      gustMph: round(base + drift + 6, 1),
      windDirDeg: 245,
      temperatureF: 70,
      precipChance: 10,
      precipIntensityMm: 0,
    };
  });
  return wrapWithAggregates(courseId, "demo", hours);
}

function wrapWithAggregates(
  courseId: string,
  source: Forecast["source"],
  hours: ForecastHour[],
): Forecast {
  const next24 = hours.slice(0, 24);
  const windAvg =
    next24.reduce((s, h) => s + h.windMph, 0) / Math.max(1, next24.length);
  const windMax = Math.max(...next24.map((h) => h.windMph));
  const gustMax = Math.max(...next24.map((h) => h.gustMph));
  const popMax = Math.max(...next24.map((h) => h.precipChance));
  return {
    courseId,
    source,
    fetchedAt: new Date().toISOString(),
    hours,
    next24: {
      windMphAvg: round(windAvg, 1),
      windMphMax: round(windMax, 1),
      gustMphMax: round(gustMax, 1),
      precipChanceMax: Math.round(popMax),
    },
  };
}

function round(n: number, places: number) {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

// ── Player-level wind drag ────────────────────────────────────
//
// Translates a forecast + a player's windSensitivity into expected
// strokes-lost-per-round. Coefficient interpretation:
//   windSensitivity = strokes lost per round per +10 mph of average wind
//                     above a 5 mph baseline.
// Negative numbers (uncommon) mean the player gains in wind.
export function expectedWindDragPerRound(
  windSensitivity: number,
  forecastWindMph: number,
): number {
  const overBaseline = Math.max(0, forecastWindMph - 5);
  return +(windSensitivity * (overBaseline / 10)).toFixed(3);
}

export function expectedWindDragForTournament(
  windSensitivity: number,
  forecast: Forecast,
  rounds = 4,
): number {
  return +(
    expectedWindDragPerRound(windSensitivity, forecast.next24.windMphAvg) *
    rounds
  ).toFixed(2);
}
