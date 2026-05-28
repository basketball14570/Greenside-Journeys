// Wind / weather forecast provider. Two backends ship today:
//
// 1. Open-Meteo — free, no key, runs from the server with no credentials.
//    This is the default. Coverage is good for the US/EU; resolution is
//    hourly at ~9 km grid spacing.
//
// 2. Tomorrow.io — when TOMORROW_IO_API_KEY is set in the environment, we
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
  "tpc-craig-ranch": { lat: 33.1972, lon: -96.6398, tz: "America/Chicago" },
  "tpc-scottsdale": { lat: 33.6391, lon: -111.9027, tz: "America/Phoenix" },
  "riviera": { lat: 34.0489, lon: -118.5108, tz: "America/Los_Angeles" },
  "pga-national-champion": { lat: 26.7867, lon: -80.1645, tz: "America/New_York" },
  "bay-hill": { lat: 28.4584, lon: -81.5158, tz: "America/New_York" },
  "tpc-sawgrass": { lat: 30.1975, lon: -81.3936, tz: "America/New_York" },
  "innisbrook-copperhead": { lat: 28.1242, lon: -82.6991, tz: "America/New_York" },
  "memorial-park": { lat: 29.7647, lon: -95.4347, tz: "America/Chicago" },
  "tpc-san-antonio-oaks": { lat: 29.5950, lon: -98.4486, tz: "America/Chicago" },
  "augusta-national": { lat: 33.5021, lon: -82.0231, tz: "America/New_York" },
  "harbour-town": { lat: 32.1392, lon: -80.8175, tz: "America/New_York" },
  "tpc-louisiana": { lat: 29.8983, lon: -90.2806, tz: "America/Chicago" },
  "dunes-myrtle-beach": { lat: 33.7615, lon: -78.8079, tz: "America/New_York" },
  "aronimink": { lat: 39.9956, lon: -75.3892, tz: "America/New_York" },
  "colonial-fort-worth": { lat: 32.7115, lon: -97.3722, tz: "America/Chicago" },
  "muirfield-village": { lat: 40.1503, lon: -83.1442, tz: "America/New_York" },
  "shinnecock-hills": { lat: 40.8923, lon: -72.4197, tz: "America/New_York" },
  "tpc-river-highlands": { lat: 41.7058, lon: -72.6739, tz: "America/New_York" },
  "detroit-golf-club": { lat: 42.4264, lon: -83.1006, tz: "America/Detroit" },
  "tpc-deere-run": { lat: 41.4906, lon: -90.4286, tz: "America/Chicago" },
};

// Slug lookup for a course name as it appears in pga-schedule. Folded
// into a single function so callers don't have to do their own
// case/punctuation normalization.
const COURSE_NAME_TO_SLUG: Record<string, string> = {
  "Quail Hollow Club": "quail-hollow",
  "Pebble Beach Golf Links": "pebble-beach",
  "Torrey Pines (South)": "torrey-pines-south",
  "TPC Craig Ranch": "tpc-craig-ranch",
  "TPC Scottsdale (Stadium)": "tpc-scottsdale",
  "Riviera Country Club": "riviera",
  "PGA National (Champion)": "pga-national-champion",
  "Bay Hill Club & Lodge": "bay-hill",
  "TPC Sawgrass (Stadium)": "tpc-sawgrass",
  "Innisbrook (Copperhead)": "innisbrook-copperhead",
  "Memorial Park Golf Course": "memorial-park",
  "TPC San Antonio (Oaks)": "tpc-san-antonio-oaks",
  "Augusta National": "augusta-national",
  "Harbour Town Golf Links": "harbour-town",
  "TPC Louisiana": "tpc-louisiana",
  "Dunes Golf & Beach Club": "dunes-myrtle-beach",
  "Aronimink Golf Club": "aronimink",
  "Colonial Country Club": "colonial-fort-worth",
  "Muirfield Village": "muirfield-village",
  "Shinnecock Hills": "shinnecock-hills",
  "TPC River Highlands": "tpc-river-highlands",
  "Detroit Golf Club": "detroit-golf-club",
  "TPC Deere Run": "tpc-deere-run",
};

export function courseSlugFor(courseName: string): string | null {
  return COURSE_NAME_TO_SLUG[courseName] ?? null;
}

// IANA timezone for a course slug — used to render times in the
// tournament's local time rather than the server's.
export function courseTzFor(courseId: string): string | null {
  return COURSE_COORDS[courseId]?.tz ?? null;
}

// Attach an absolute UTC offset to a naive local time string so the
// resulting ISO parses to the correct instant regardless of host tz.
function toAbsoluteIso(naive: string, offsetSeconds: number): string {
  const withSeconds = naive.length === 16 ? `${naive}:00` : naive;
  const sign = offsetSeconds < 0 ? "-" : "+";
  const abs = Math.abs(offsetSeconds);
  const hh = String(Math.floor(abs / 3600)).padStart(2, "0");
  const mm = String(Math.floor((abs % 3600) / 60)).padStart(2, "0");
  return `${withSeconds}${sign}${hh}:${mm}`;
}

// Compact view-model for the dashboard weather heros — derives the "now"
// reading, the morning-to-now delta, and a windowed hourly series for
// the sparkline. Returns null when the forecast is null or has no hours.
export type WeatherSnapshot = {
  sustainedMph: number;
  gustMph: number;
  windDirDeg: number;
  windDirCardinal: string;
  deltaSinceMorningMph: number;
  hourly: { v: number; gust: number; now?: boolean }[];
  hourLabels: { am6: number; am9: number; now: number; pm3: number; pm6: number };
  // Course-local timezone and the current clock label in that tz.
  tz?: string;
  nowLabel: string;
};

export function weatherSnapshotFromForecast(
  forecast: Forecast | null,
  tz?: string | null,
): WeatherSnapshot | null {
  if (!forecast || forecast.hours.length === 0) return null;

  const now = Date.now();
  let nowIdx = 0;
  let closest = Infinity;
  forecast.hours.forEach((h, i) => {
    const delta = Math.abs(new Date(h.ts).getTime() - now);
    if (delta < closest) {
      closest = delta;
      nowIdx = i;
    }
  });
  const current = forecast.hours[nowIdx];

  // 14 hours surrounding now (7 back, 6 forward) for the sparkline.
  const start = Math.max(0, nowIdx - 7);
  const end = Math.min(forecast.hours.length, start + 14);
  const window = forecast.hours.slice(start, end);
  const hourly = window.map((h, i) => ({
    v: Math.round(h.windMph),
    gust: Math.round(h.gustMph),
    now: start + i === nowIdx,
  }));

  // Morning baseline: 6 AM local on the same day as `now`. Compute the day
  // and hour in the course timezone so "since 6 AM" is anchored to the
  // course's morning, not the server's UTC day.
  const curLocal = tz ? dateInTz(new Date(current.ts), tz) : null;
  const morning = forecast.hours.find((h) => {
    if (tz && curLocal) {
      const p = dateInTz(new Date(h.ts), tz);
      return p.ymd === curLocal.ymd && p.hour >= 6;
    }
    const d = new Date(h.ts);
    return (
      d.toISOString().slice(0, 10) ===
        new Date(current.ts).toISOString().slice(0, 10) && d.getUTCHours() >= 6
    );
  });
  const deltaSinceMorningMph = morning
    ? Math.round(current.windMph - morning.windMph)
    : 0;

  const nowLabel = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    ...(tz ? { timeZone: tz } : {}),
  });

  return {
    sustainedMph: Math.round(current.windMph),
    gustMph: Math.round(current.gustMph),
    windDirDeg: current.windDirDeg,
    windDirCardinal: degToCardinal(current.windDirDeg),
    deltaSinceMorningMph,
    hourly,
    hourLabels: { am6: 6, am9: 9, now: nowIdx, pm3: 15, pm6: 18 },
    tz: tz ?? undefined,
    nowLabel,
  };
}

const CARDINALS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
function degToCardinal(deg: number): string {
  return CARDINALS[Math.round(((deg % 360) / 22.5)) % 16];
}

// AM vs PM wave wind split for Thursday and Friday. Tour tee times split
// the field into a morning and afternoon wave; when conditions diverge
// (wind picks up post-lunch, or the front passes), one wave plays in
// materially different conditions. The wave-split chip on the Today
// screen surfaces this delta so a quick glance tells you which wave is
// projected to have it easier.
//
// Windows: AM = 7am-11am local, PM = 1pm-5pm local. Skips when the round
// is already in the past (no forecast for it) so the chip never lies.
export type WavePeriod = {
  windAvg: number;
  gustAvg: number;
  tempAvg: number;
  hours: number;
};

export type WaveSplitRound = {
  // ISO date (YYYY-MM-DD) in the course's local timezone
  date: string;
  dayLabel: string; // "Thu", "Fri"
  am: WavePeriod | null;
  pm: WavePeriod | null;
  // Hour-by-hour breakdown 7am-5pm local, in chronological order. Used
  // by the detail view; the chip only needs the AM/PM aggregates.
  hourly: {
    hour: number;        // 7..17 (local)
    windMph: number;
    gustMph: number;
    tempF: number;
  }[];
  // Positive = PM windier than AM (favors AM wave). Mph difference.
  deltaPmMinusAm: number | null;
  favors: "am" | "pm" | "even" | null;
};

// Combined edge for the two PGA tee waves over the Thu+Fri stretch.
// Wave 1: Thu AM tee → Fri PM tee. Wave 2: Thu PM tee → Fri AM tee.
// A lower combined wind average is "easier" — that wave has the edge.
export type CombinedWaveEdge = {
  wave1: { windAvg: number; tempAvg: number; label: "Thu AM / Fri PM" };
  wave2: { windAvg: number; tempAvg: number; label: "Thu PM / Fri AM" };
  // Positive = wave2 windier (favors wave1). mph.
  deltaWave2MinusWave1: number;
  favors: "wave1" | "wave2" | "even";
};

export type WaveSplitSummary = {
  courseId: string;
  tz: string;
  rounds: WaveSplitRound[];
  combined: CombinedWaveEdge | null;
};

function dateInTz(date: Date, tz: string): { ymd: string; hour: number; day: string } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const y = get("year");
  const m = get("month");
  const d = get("day");
  const h = get("hour");
  return {
    ymd: `${y}-${m}-${d}`,
    hour: Number(h === "24" ? "0" : h),
    day: get("weekday"), // "Thu", "Fri", etc.
  };
}

function avg(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

// Build the AM/PM wave split for the next Thursday+Friday from the
// tournament's start date. `startDateISO` is the event's listed start
// (already a Thursday for stroke-play events).
export function waveSplitFromForecast(
  forecast: Forecast | null,
  courseId: string,
  startDateISO: string | undefined,
): WaveSplitSummary | null {
  if (!forecast || !startDateISO) return null;
  const coords = COURSE_COORDS[courseId];
  if (!coords) return null;
  const tz = coords.tz;

  // Target two rounds: the listed Thursday and the next day Friday.
  const thuLocal = startDateISO.slice(0, 10); // already YYYY-MM-DD
  const friDate = new Date(`${thuLocal}T12:00:00Z`);
  friDate.setUTCDate(friDate.getUTCDate() + 1);
  const friLocal = friDate.toISOString().slice(0, 10);

  type Bucket = { am: ForecastHour[]; pm: ForecastHour[]; hourly: Map<number, ForecastHour> };
  const buckets = new Map<string, Bucket>([
    [thuLocal, { am: [], pm: [], hourly: new Map() }],
    [friLocal, { am: [], pm: [], hourly: new Map() }],
  ]);

  for (const h of forecast.hours) {
    const local = dateInTz(new Date(h.ts), tz);
    const bucket = buckets.get(local.ymd);
    if (!bucket) continue;
    if (local.hour >= 7 && local.hour <= 11) bucket.am.push(h);
    else if (local.hour >= 13 && local.hour <= 17) bucket.pm.push(h);
    // Keep the full 7am-5pm slice for the hourly detail view.
    if (local.hour >= 7 && local.hour <= 17) bucket.hourly.set(local.hour, h);
  }

  function summarize(hours: ForecastHour[]): WavePeriod | null {
    if (hours.length === 0) return null;
    return {
      windAvg: +avg(hours.map((h) => h.windMph)).toFixed(1),
      gustAvg: +avg(hours.map((h) => h.gustMph)).toFixed(1),
      tempAvg: +avg(hours.map((h) => h.temperatureF)).toFixed(0),
      hours: hours.length,
    };
  }

  const rounds: WaveSplitRound[] = (
    [
      { date: thuLocal, dayLabel: "Thu" },
      { date: friLocal, dayLabel: "Fri" },
    ] as const
  ).map(({ date, dayLabel }) => {
    const b = buckets.get(date)!;
    const am = summarize(b.am);
    const pm = summarize(b.pm);
    const hourly = Array.from({ length: 11 }, (_, i) => i + 7)
      .map((hour) => {
        const h = b.hourly.get(hour);
        if (!h) return null;
        return {
          hour,
          windMph: Math.round(h.windMph),
          gustMph: Math.round(h.gustMph),
          tempF: Math.round(h.temperatureF),
        };
      })
      .filter((h): h is { hour: number; windMph: number; gustMph: number; tempF: number } => h !== null);
    const deltaPmMinusAm = am && pm ? +(pm.windAvg - am.windAvg).toFixed(1) : null;
    let favors: WaveSplitRound["favors"] = null;
    if (deltaPmMinusAm !== null) {
      if (deltaPmMinusAm >= 3) favors = "am";
      else if (deltaPmMinusAm <= -3) favors = "pm";
      else favors = "even";
    }
    return { date, dayLabel, am, pm, hourly, deltaPmMinusAm, favors };
  });

  // Drop rounds with no data at all (e.g. tournament already finished).
  const populated = rounds.filter((r) => r.am || r.pm);
  if (populated.length === 0) return null;

  // Combined-wave edge: only computable when we have all four windows.
  const thu = populated.find((r) => r.dayLabel === "Thu");
  const fri = populated.find((r) => r.dayLabel === "Fri");
  let combined: CombinedWaveEdge | null = null;
  if (thu?.am && thu?.pm && fri?.am && fri?.pm) {
    const wave1Wind = +((thu.am.windAvg + fri.pm.windAvg) / 2).toFixed(1);
    const wave2Wind = +((thu.pm.windAvg + fri.am.windAvg) / 2).toFixed(1);
    const wave1Temp = Math.round((thu.am.tempAvg + fri.pm.tempAvg) / 2);
    const wave2Temp = Math.round((thu.pm.tempAvg + fri.am.tempAvg) / 2);
    const delta = +(wave2Wind - wave1Wind).toFixed(1);
    const favors: CombinedWaveEdge["favors"] =
      delta >= 2 ? "wave1" : delta <= -2 ? "wave2" : "even";
    combined = {
      wave1: { windAvg: wave1Wind, tempAvg: wave1Temp, label: "Thu AM / Fri PM" },
      wave2: { windAvg: wave2Wind, tempAvg: wave2Temp, label: "Thu PM / Fri AM" },
      deltaWave2MinusWave1: delta,
      favors,
    };
  }

  return { courseId, tz, rounds: populated, combined };
}

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
    (process.env.TOMORROW_IO_API_KEY ? "tomorrow.io" : "open-meteo");

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
  // gfs_seamless = NOAA HRRR (3km, hourly) for the first ~18 hours,
  // falling back to GFS beyond. HRRR is the same short-range model
  // Windfinder's "Superforecast" leans on for North America, so this
  // gives us superforecast-quality wind/gust at the course without a
  // paid weather provider. forecast_days=5 spans Thu-Sun reliably.
  const isUS =
    coords.lon < -50 && coords.lon > -170 && coords.lat > 18 && coords.lat < 55;
  const params = new URLSearchParams({
    latitude: String(coords.lat),
    longitude: String(coords.lon),
    hourly:
      "temperature_2m,precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m,wind_direction_10m",
    wind_speed_unit: "mph",
    temperature_unit: "fahrenheit",
    forecast_days: "5",
    timezone: coords.tz,
    models: isUS ? "gfs_seamless" : "best_match",
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  const res = await fetch(url, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const json = await res.json();
  // With timezone=<tz>, Open-Meteo returns naive local wall-clock strings
  // ("2026-05-28T06:00") plus a top-level utc_offset_seconds. Anchor each
  // to an absolute ISO with that offset so new Date(ts) is correct on any
  // server timezone — without this the "now" index and clock drift by the
  // UTC offset (e.g. 5h on a UTC host showing a Central-time course).
  const offsetSec: number =
    typeof json.utc_offset_seconds === "number" ? json.utc_offset_seconds : 0;
  const t: string[] = json.hourly?.time ?? [];
  const wind: number[] = json.hourly?.wind_speed_10m ?? [];
  const gust: number[] = json.hourly?.wind_gusts_10m ?? [];
  const dir: number[] = json.hourly?.wind_direction_10m ?? [];
  const temp: number[] = json.hourly?.temperature_2m ?? [];
  const pop: number[] = json.hourly?.precipitation_probability ?? [];
  const precip: number[] = json.hourly?.precipitation ?? [];
  const hours: ForecastHour[] = t.map((iso, i) => ({
    ts: toAbsoluteIso(iso, offsetSec),
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
// Higher-resolution adapter; activated when TOMORROW_IO_API_KEY is set.
// Field names below match their /v4/timelines response.
async function fetchTomorrowIo(
  courseId: string,
  coords: { lat: number; lon: number; tz: string },
  signal?: AbortSignal,
): Promise<Forecast> {
  const key = process.env.TOMORROW_IO_API_KEY;
  if (!key) throw new Error("TOMORROW_IO_API_KEY not set");
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
