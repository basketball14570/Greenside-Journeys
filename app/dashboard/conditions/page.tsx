import Link from "next/link";
import {
  Stat,
  StatusDot,
  WindArrow,
  WindSpark,
} from "@/components/edge/primitives";
import { ALERT_HISTORY } from "@/lib/demo-courses";
import { WaveSplitDetail } from "@/components/edge/WaveSplitChip";
import { WaveWatchlist } from "@/components/edge/WaveWatchlist";
import { PageHeader } from "@/components/edge/PageHeader";
import { getActiveEvent, statusOf } from "@/lib/data/pga-schedule";
import {
  courseSlugFor,
  courseTzFor,
  getForecast,
  waveSplitFromForecast,
  weatherSnapshotFromForecast,
  type CombinedWaveEdge,
  type Forecast,
  type ForecastHour,
  type WeatherSnapshot,
} from "@/lib/weather/forecast";
import { getFieldWaveAttribution } from "@/lib/data/wave-tees";

const ALERT_COLOR = {
  wave: "#8ee68e",
  wind: "#f5c558",
  hedge: "#e07868",
  precip: "#7cc0e8",
} as const;

const ALERT_LABEL = {
  wave: "◐ Wave Shift",
  wind: "⌇ Wind Alert",
  hedge: "◇ Hedge Avail.",
  precip: "☂ Precip",
} as const;

export default async function ConditionsPage() {
  // Wave split for the active event's course. Skipped silently when we
  // can't resolve the slug or the forecast call fails — the rest of the
  // page (demo course snapshots) still renders.
  const event = getActiveEvent();
  const slug = event ? courseSlugFor(event.course) : null;
  // Three pieces fan out in parallel: forecast, weather-derived wave
  // split, and the live tee-time field. We need all three to render the
  // watchlist; the page still works if any single one returns null.
  const [forecast, fieldWaves] = await Promise.all([
    slug ? getForecast(slug).catch(() => null) : Promise.resolve(null),
    getFieldWaveAttribution().catch(() => null),
  ]);
  const waveSplit =
    slug && event ? waveSplitFromForecast(forecast, slug, event.startDate) : null;
  const snapshot = weatherSnapshotFromForecast(
    forecast,
    slug ? courseTzFor(slug) : null,
  );
  const current = nearestHour(forecast);

  return (
    <div className="px-5 lg:px-8 py-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        kicker="Live Conditions"
        title="Course weather & alerts."
        imageSlug={slug}
        subtitle="Live wind, gust, and precip from the tournament venues you're exposed to. Alert history scoped to the bets in your portfolio."
      />

      {waveSplit && <WaveSplitDetail summary={waveSplit} />}

      {waveSplit?.combined && fieldWaves && (
        <WaveWatchlist
          combined={waveSplit.combined}
          field={fieldWaves}
        />
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {event && snapshot ? (
            <RealConditionsCard
              eventName={event.name}
              course={event.course}
              location={event.city}
              statusLabel={statusLabelFor(event)}
              edge={waveSplit?.combined ?? null}
              snapshot={snapshot}
              current={current}
              source={forecast?.source ?? "demo"}
            />
          ) : (
            <div
              className="rounded-[14px] border border-line p-6 bg-surface-1 text-text-dim"
              style={{ fontSize: 13.5 }}
            >
              Live forecast unavailable for this venue right now.
            </div>
          )}
        </div>
        <AlertHistoryPanel />
      </div>
    </div>
  );
}

function edgeText(edge: CombinedWaveEdge | null): string {
  if (!edge) {
    return "Wave split firms up midweek — once the tee draw and Thu/Fri forecast lock in, the AM/PM edge shows here.";
  }
  const d = Math.abs(edge.deltaWave2MinusWave1);
  if (edge.favors === "even" || d < 1.5) {
    return `Neutral for both waves — wind plays within ${d.toFixed(1)} mph between the AM/PM tee waves, so neither side has a weather edge.`;
  }
  const easier = edge.favors === "wave1" ? edge.wave1 : edge.wave2;
  const harder = edge.favors === "wave1" ? edge.wave2 : edge.wave1;
  return `${easier.label} has the edge — about ${d.toFixed(1)} mph less average wind than ${harder.label}.`;
}

function nearestHour(forecast: Forecast | null): ForecastHour | null {
  if (!forecast || forecast.hours.length === 0) return null;
  const now = Date.now();
  let best = forecast.hours[0];
  let bestDelta = Infinity;
  for (const h of forecast.hours) {
    const delta = Math.abs(new Date(h.ts).getTime() - now);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = h;
    }
  }
  return best;
}

function statusLabelFor(event: Parameters<typeof statusOf>[0]): string {
  const s = statusOf(event);
  return s === "live" ? "Live" : s === "upcoming" ? "Upcoming" : "Final";
}

function RealConditionsCard({
  eventName,
  course,
  location,
  statusLabel,
  edge,
  snapshot,
  current,
  source,
}: {
  eventName: string;
  course: string;
  location: string;
  statusLabel: string;
  edge: CombinedWaveEdge | null;
  snapshot: WeatherSnapshot;
  current: ForecastHour | null;
  source: Forecast["source"];
}) {
  const isLive = statusLabel === "Live";
  const precip = current?.precipIntensityMm ?? 0;
  const precipChance = current?.precipChance ?? 0;
  return (
    <div
      className="relative rounded-[14px] overflow-hidden border border-line"
      style={{
        background:
          "linear-gradient(135deg, #163024 0%, #112519 60%, #0b1a11 100%)",
      }}
    >
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          top: -80,
          right: -80,
          width: 280,
          height: 280,
          background: isLive
            ? "radial-gradient(circle, rgba(245,197,88,0.13) 0%, transparent 65%)"
            : "radial-gradient(circle, rgba(124,192,232,0.1) 0%, transparent 65%)",
        }}
      />

      <div className="relative p-5 lg:p-6">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <span
              className="num font-semibold uppercase text-text-muted"
              style={{ fontSize: 9.5, letterSpacing: 1.3 }}
            >
              {eventName}
            </span>
            <div
              className="serif-italic mt-0.5 text-text"
              style={{ fontSize: 22, letterSpacing: -0.3, fontStyle: "normal" }}
            >
              {course}
            </div>
            <div className="num text-text-dim mt-1" style={{ fontSize: 11.5 }}>
              {location}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isLive ? (
              <>
                <StatusDot status="live" />
                <span
                  className="num font-semibold"
                  style={{ fontSize: 10.5, color: "#8ee68e", letterSpacing: 0.8 }}
                >
                  LIVE
                </span>
              </>
            ) : (
              <span
                className="num font-semibold uppercase"
                style={{
                  fontSize: 10,
                  letterSpacing: 1,
                  color: "#7cc0e8",
                  padding: "3px 7px",
                  borderRadius: 4,
                  background: "rgba(124,192,232,0.13)",
                  border: "1px solid rgba(124,192,232,0.27)",
                }}
              >
                {statusLabel}
              </span>
            )}
          </div>
        </div>

        <div
          className="text-text-dim mb-4 max-w-2xl"
          style={{ fontSize: 13.5, lineHeight: 1.45 }}
        >
          {edgeText(edge)}
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          <div>
            <Stat value={snapshot.sustainedMph.toString()} unit="mph" label="Sustained" />
            <div className="flex items-center gap-2 mt-2">
              <WindArrow degrees={snapshot.windDirDeg} size={18} />
              <span
                className="num text-text-dim"
                style={{ fontSize: 11.5, letterSpacing: 0.5 }}
              >
                {snapshot.windDirCardinal} · gust {snapshot.gustMph}
              </span>
            </div>
          </div>

          <div>
            <span
              className="num font-semibold uppercase text-text-muted"
              style={{ fontSize: 9.5, letterSpacing: 1.2 }}
            >
              Hourly wind
            </span>
            <div className="mt-2">
              <WindSpark data={snapshot.hourly} width={260} height={68} />
            </div>
          </div>

          <div>
            <span
              className="num font-semibold uppercase text-text-muted"
              style={{ fontSize: 9.5, letterSpacing: 1.2 }}
            >
              Wave wind (Thu/Fri)
            </span>
            {edge ? (
              <div className="mt-2 space-y-1.5">
                <WaveLine label={edge.wave1.label} wind={edge.wave1.windAvg} />
                <WaveLine label={edge.wave2.label} wind={edge.wave2.windAvg} />
              </div>
            ) : (
              <div className="num text-text-muted mt-2" style={{ fontSize: 12 }}>
                Pending forecast
              </div>
            )}
          </div>
        </div>

        <div
          className="mt-5 pt-4 border-t border-line flex flex-wrap gap-x-6 gap-y-2"
          style={{ fontSize: 11.5 }}
        >
          {current && <FactStat label="Temp" value={`${Math.round(current.temperatureF)}°F`} />}
          <FactStat
            label="Precip"
            value={precip > 0 ? `${precip.toFixed(1)} mm/hr` : `${precipChance}% chance`}
            tone={precip > 0 ? "warn" : undefined}
          />
          <span className="flex-1" />
          <FactStat label="Source" value={source === "demo" ? "demo" : source} />
        </div>
      </div>
    </div>
  );
}

function WaveLine({ label, wind }: { label: string; wind: number }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="num text-text-dim" style={{ fontSize: 11.5 }}>
        {label}
      </span>
      <span className="num font-semibold text-text" style={{ fontSize: 12.5 }}>
        {wind.toFixed(1)} mph
      </span>
    </div>
  );
}

function FactStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn";
}) {
  const color = tone === "warn" ? "#f5c558" : "#f0ebe0";
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className="num text-text-muted uppercase"
        style={{ fontSize: 9.5, letterSpacing: 1.1 }}
      >
        {label}
      </span>
      <span className="num font-semibold" style={{ fontSize: 12, color }}>
        {value}
      </span>
    </div>
  );
}

function AlertHistoryPanel() {
  return (
    <div className="rounded-[14px] overflow-hidden bg-surface-1 border border-line h-fit">
      <div
        className="flex items-center justify-between px-4 py-3.5 border-b border-line"
        style={{ background: "rgba(0,0,0,0.18)" }}
      >
        <span
          className="serif-italic text-text"
          style={{ fontSize: 17, letterSpacing: -0.2, fontStyle: "normal" }}
        >
          Alert history
        </span>
        <span
          className="num text-text-muted"
          style={{ fontSize: 10.5, letterSpacing: 0.6 }}
        >
          {ALERT_HISTORY.length} today
        </span>
      </div>
      {ALERT_HISTORY.map((a, i) => (
        <div
          key={a.id}
          className="flex gap-2.5 px-4 py-3"
          style={{
            borderBottom:
              i < ALERT_HISTORY.length - 1
                ? "1px solid rgba(255,255,255,0.06)"
                : "none",
          }}
        >
          <div
            className="shrink-0 self-stretch rounded-full"
            style={{ width: 3, background: ALERT_COLOR[a.kind] }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between gap-2 mb-0.5">
              <span
                className="num font-semibold uppercase"
                style={{
                  fontSize: 9.5,
                  letterSpacing: 1,
                  color: ALERT_COLOR[a.kind],
                }}
              >
                {ALERT_LABEL[a.kind]}
              </span>
              <span
                className="num text-text-muted"
                style={{ fontSize: 10 }}
              >
                {a.time.split(" · ")[1] ?? a.time}
              </span>
            </div>
            <div
              className="num text-text-muted mb-1"
              style={{ fontSize: 10, letterSpacing: 0.4 }}
            >
              {a.course}
            </div>
            <div
              className="text-text font-medium mb-0.5"
              style={{ fontSize: 13, lineHeight: 1.35 }}
            >
              {a.title}
            </div>
            <div
              className="text-text-dim"
              style={{ fontSize: 12, lineHeight: 1.4 }}
            >
              {a.detail}
            </div>
            {a.affectedBets > 0 && (
              <div
                className="num font-semibold mt-1.5 inline-flex items-center gap-1"
                style={{ fontSize: 10, letterSpacing: 0.4, color: "#8ee68e" }}
              >
                ★ {a.affectedBets} bet{a.affectedBets === 1 ? "" : "s"} affected
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
