import Link from "next/link";
import { WindArrow } from "@/components/edge/primitives";
import { getActiveEvent } from "@/lib/data/pga-schedule";
import {
  COURSE_COORDS,
  courseSlugFor,
  getForecast,
  waveSplitFromForecast,
  type Forecast,
  type ForecastHour,
} from "@/lib/weather/forecast";
import { WaveSplitDetail } from "@/components/edge/WaveSplitChip";

// Weather hub. Goal: never make a user leave the site to check the
// forecast at their tournament. Hourly grid (temp, wind, gust, direction,
// precip%) for the next ~96 hours, plus the wave-split read on top of it.
//
// Data: Open-Meteo using `gfs_seamless` for US courses, which blends
// NOAA HRRR (3km, hourly, 18h horizon) with GFS beyond — the same
// short-range model Windfinder's "Superforecast" leans on. That gives
// us superforecast-quality wind/gust without a paid provider.

const HOURS_PER_DAY = 24;

export default async function WeatherPage() {
  const event = getActiveEvent();
  const slug = event ? courseSlugFor(event.course) : null;
  const forecast = slug ? await getForecast(slug).catch(() => null) : null;
  const tz = slug ? COURSE_COORDS[slug]?.tz : undefined;
  const waveSplit =
    slug && event && forecast
      ? waveSplitFromForecast(forecast, slug, event.startDate)
      : null;

  return (
    <div className="px-5 lg:px-8 py-6 space-y-6 max-w-7xl mx-auto">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <span
            className="num font-semibold uppercase"
            style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
          >
            ● Weather
          </span>
          <h1
            className="serif-italic mt-1.5"
            style={{ fontSize: 36, letterSpacing: -0.4, fontStyle: "normal" }}
          >
            <em>Hourly at the course.</em>
          </h1>
          <p className="text-text-dim mt-2 max-w-2xl" style={{ fontSize: 14 }}>
            {event ? (
              <>
                {event.course} · {event.city} ·{" "}
                <span className="num text-text-muted">
                  {event.startDate} → {event.endDate}
                </span>
              </>
            ) : (
              "No active event."
            )}
          </p>
        </div>
        <div className="text-right">
          <span
            className="num text-text-muted block"
            style={{ fontSize: 10.5, letterSpacing: 0.4 }}
          >
            Powered by NOAA HRRR / GFS via Open-Meteo
          </span>
          {forecast?.fetchedAt && (
            <span
              className="num text-text-muted block mt-0.5"
              style={{ fontSize: 10.5, letterSpacing: 0.4 }}
            >
              Updated {new Date(forecast.fetchedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      </header>

      {!forecast && (
        <div className="rounded-[14px] border border-line bg-surface-1 p-5">
          <p className="text-text-dim" style={{ fontSize: 14, lineHeight: 1.5 }}>
            Couldn&apos;t load the forecast for this course. The Open-Meteo
            upstream may be down, or the course slug isn&apos;t mapped yet —
            check{" "}
            <code className="num" style={{ color: "#a8b3ac" }}>
              lib/weather/forecast.ts
            </code>
            .
          </p>
        </div>
      )}

      {waveSplit && <WaveSplitDetail summary={waveSplit} />}

      {forecast && tz && event && (
        <HourlyGridByDay
          forecast={forecast}
          tz={tz}
          startYmd={event.startDate}
          endYmd={event.endDate}
        />
      )}
    </div>
  );
}

function HourlyGridByDay({
  forecast,
  tz,
  startYmd,
  endYmd,
}: {
  forecast: Forecast;
  tz: string;
  startYmd: string;
  endYmd: string;
}) {
  // Lock the grid to the tournament's Thu→Sun window so the page is
  // always "the tournament forecast", never "the next 4 days from now".
  const byDay = groupByLocalDay(forecast.hours, tz).filter(
    (d) => d.ymd >= startYmd && d.ymd <= endYmd,
  );
  if (byDay.length === 0) return null;

  return (
    <section className="space-y-4">
      <div>
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.2, color: "#7cc0e8" }}
        >
          ☀ Tournament forecast
        </span>
        <h2
          className="serif-italic mt-0.5"
          style={{ fontSize: 24, letterSpacing: -0.3, fontStyle: "normal" }}
        >
          <em>Thursday through Sunday.</em>
        </h2>
      </div>
      {byDay.map((d) => (
        <DayCard key={d.ymd} ymd={d.ymd} hours={d.hours} tz={tz} />
      ))}
    </section>
  );
}

function DayCard({
  ymd,
  hours,
  tz,
}: {
  ymd: string;
  hours: ForecastHour[];
  tz: string;
}) {
  // Show 6am-9pm (round-relevant window) — early morning + late evening
  // are noise for golf-tournament weather.
  const relevant = hours.filter((h) => {
    const local = new Date(h.ts).toLocaleString("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    });
    const hr = Number(local);
    return hr >= 6 && hr <= 21;
  });
  if (relevant.length === 0) return null;

  const dayLabel = new Date(`${ymd}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  // Per-day quick read for the card header
  const peakWind = Math.max(...relevant.map((h) => h.windMph));
  const peakGust = Math.max(...relevant.map((h) => h.gustMph));
  const tHigh = Math.round(Math.max(...relevant.map((h) => h.temperatureF)));
  const tLow = Math.round(Math.min(...relevant.map((h) => h.temperatureF)));
  const maxPop = Math.max(...relevant.map((h) => h.precipChance));

  return (
    <article className="rounded-[14px] border border-line bg-surface-1 overflow-hidden">
      <header
        className="flex items-baseline justify-between gap-3 px-4 py-3 border-b border-line flex-wrap"
        style={{ background: "rgba(0,0,0,0.18)" }}
      >
        <div className="flex items-baseline gap-3 flex-wrap">
          <span
            className="serif-italic"
            style={{ fontSize: 18, letterSpacing: -0.2, fontStyle: "normal", color: "#f0ebe0" }}
          >
            <em>{dayLabel}</em>
          </span>
          <span
            className="num text-text-muted"
            style={{ fontSize: 11, letterSpacing: 0.4 }}
          >
            Hi {tHigh}° · Lo {tLow}°
          </span>
        </div>
        <div className="flex items-baseline gap-3 num" style={{ fontSize: 11 }}>
          <span style={{ color: "#a8b3ac" }}>
            Peak wind <strong style={{ color: peakWind >= 15 ? "#f5c558" : "#f0ebe0" }}>{Math.round(peakWind)}</strong> mph
          </span>
          <span style={{ color: "#a8b3ac" }}>
            Gusts to <strong style={{ color: peakGust >= 25 ? "#f5c558" : "#f0ebe0" }}>{Math.round(peakGust)}</strong>
          </span>
          {maxPop >= 20 && (
            <span style={{ color: "#7cc0e8" }}>
              <strong>{Math.round(maxPop)}%</strong> precip
            </span>
          )}
        </div>
      </header>

      <div className="overflow-x-auto">
        <table
          className="w-full"
          style={{ borderCollapse: "separate", borderSpacing: 0, minWidth: 720 }}
        >
          <thead>
            <tr style={{ background: "rgba(0,0,0,0.08)" }}>
              <Th>Hr</Th>
              <Th>Temp</Th>
              <Th>Wind</Th>
              <Th>Gust</Th>
              <Th>Dir</Th>
              <Th>Precip</Th>
            </tr>
          </thead>
          <tbody>
            {relevant.map((h, i) => (
              <HourRow key={h.ts} h={h} tz={tz} striped={i % 2 === 1} />
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function HourRow({
  h,
  tz,
  striped,
}: {
  h: ForecastHour;
  tz: string;
  striped: boolean;
}) {
  const hourLabel = new Date(h.ts).toLocaleTimeString("en-US", {
    timeZone: tz,
    hour: "numeric",
    hour12: true,
  });
  const hasPrecip = h.precipChance >= 30 || h.precipIntensityMm > 0;
  const windStyle = windCellStyle(h.windMph);
  const gustStyle = windCellStyle(h.gustMph);

  return (
    <tr style={{ background: striped ? "rgba(255,255,255,0.015)" : "transparent" }}>
      <Td>
        <span className="num" style={{ color: "#f0ebe0", fontWeight: 600 }}>
          {hourLabel}
        </span>
      </Td>
      <Td>
        <span className="num" style={{ fontSize: 12.5, color: "#f0ebe0" }}>
          {Math.round(h.temperatureF)}°F
        </span>
      </Td>
      <Td>
        <span
          className="num font-semibold inline-block text-center"
          style={{
            fontSize: 13,
            color: windStyle.fg,
            background: windStyle.bg,
            minWidth: 36,
            padding: "3px 8px",
            borderRadius: 4,
          }}
        >
          {Math.round(h.windMph)}
        </span>
      </Td>
      <Td>
        <span
          className="num font-semibold inline-block text-center"
          style={{
            fontSize: 13,
            color: gustStyle.fg,
            background: gustStyle.bg,
            minWidth: 36,
            padding: "3px 8px",
            borderRadius: 4,
          }}
        >
          {Math.round(h.gustMph)}
        </span>
      </Td>
      <Td>
        <span className="inline-flex items-center gap-2">
          <WindArrow degrees={h.windDirDeg} size={18} />
          <span className="num" style={{ fontSize: 12, color: "#a8b3ac" }}>
            {degToCardinalShort(h.windDirDeg)}
          </span>
        </span>
      </Td>
      <Td>
        <span
          className="num"
          style={{
            fontSize: 12,
            color: hasPrecip ? "#7cc0e8" : "#6c7a72",
          }}
        >
          {Math.round(h.precipChance)}%
          {h.precipIntensityMm > 0 && (
            <span style={{ color: "#7cc0e8", marginLeft: 4 }}>
              · {mmToInches(h.precipIntensityMm)}″
            </span>
          )}
        </span>
      </Td>
    </tr>
  );
}

// Color scale tuned for golf: calm under 8 mph, noticeable 8-15, club-
// selection territory 15-22, "Sunday at Memorial" 22+. Same scale used
// for both wind and gusts so a 14 mph wind and a 14 mph gust read the
// same intensity at a glance.
function windCellStyle(mph: number): { bg: string; fg: string } {
  if (mph < 5) return { bg: "rgba(126, 192, 232, 0.10)", fg: "#a8b3ac" };
  if (mph < 10) return { bg: "rgba(126, 192, 232, 0.22)", fg: "#dfe9f3" };
  if (mph < 15) return { bg: "rgba(127, 212, 154, 0.30)", fg: "#0d1a12" };
  if (mph < 20) return { bg: "rgba(245, 197, 88, 0.50)", fg: "#1a1305" };
  if (mph < 25) return { bg: "rgba(232, 142, 79, 0.65)", fg: "#1a0f06" };
  return { bg: "rgba(232, 92, 92, 0.78)", fg: "#1a0606" };
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="num font-semibold uppercase text-left px-3 py-2"
      style={{
        fontSize: 9.5,
        letterSpacing: 1.1,
        color: "#6c7a72",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td
      className="px-3 py-1.5"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
    >
      {children}
    </td>
  );
}

function groupByLocalDay(hours: ForecastHour[], tz: string): { ymd: string; hours: ForecastHour[] }[] {
  const map = new Map<string, ForecastHour[]>();
  for (const h of hours) {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = fmt.formatToParts(new Date(h.ts));
    const y = parts.find((p) => p.type === "year")?.value ?? "";
    const m = parts.find((p) => p.type === "month")?.value ?? "";
    const d = parts.find((p) => p.type === "day")?.value ?? "";
    const ymd = `${y}-${m}-${d}`;
    const arr = map.get(ymd);
    if (arr) arr.push(h);
    else map.set(ymd, [h]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ymd, hours]) => ({ ymd, hours }));
}

const CARDINALS_SHORT = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
function degToCardinalShort(deg: number): string {
  return CARDINALS_SHORT[Math.round(((deg % 360) / 45)) % 8];
}

function mmToInches(mm: number): string {
  const inches = mm / 25.4;
  return inches < 0.05 ? inches.toFixed(2) : inches.toFixed(2);
}
