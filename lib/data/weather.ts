// Tomorrow.io weather client — course-level forecasts at 15-min granularity.
// Docs: https://docs.tomorrow.io/reference/post-timelines

const BASE = "https://api.tomorrow.io/v4/timelines";

function key() {
  const k = process.env.TOMORROW_IO_API_KEY;
  if (!k) throw new Error("TOMORROW_IO_API_KEY not set");
  return k;
}

export type WeatherInterval = {
  startTime: string;
  windSpeed: number;       // mph
  windGust: number;        // mph
  windDirection: number;   // degrees
  precipitationIntensity: number; // mm/hr
  precipitationProbability: number; // 0-100
  temperature: number;     // F
  humidity: number;        // 0-100
};

export async function getCourseWeather(opts: {
  lat: number;
  lon: number;
  hours?: number;
}): Promise<WeatherInterval[]> {
  const hours = opts.hours ?? 12;
  const url = `${BASE}?apikey=${key()}`;
  const body = {
    location: `${opts.lat},${opts.lon}`,
    fields: [
      "windSpeed",
      "windGust",
      "windDirection",
      "precipitationIntensity",
      "precipitationProbability",
      "temperature",
      "humidity",
    ],
    units: "imperial",
    timesteps: ["15m"],
    startTime: "now",
    endTime: `nowPlus${hours}h`,
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    next: { revalidate: 600 },
  });
  if (!res.ok) throw new Error(`Tomorrow.io failed: ${res.status}`);
  const json = await res.json();
  return (json.data?.timelines?.[0]?.intervals ?? []).map((i: { startTime: string; values: Omit<WeatherInterval, "startTime"> }) => ({
    startTime: i.startTime,
    ...i.values,
  }));
}
