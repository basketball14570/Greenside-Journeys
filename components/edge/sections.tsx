// Composable sections used by both mobile and desktop dashboard.
// Ported from mobile-dashboard.jsx + desktop-dashboard.jsx.

import Link from "next/link";
import { StarButton } from "./StarButton";
import {
  BookChip,
  Stat,
  StatusDot,
  SectionLabel,
  WindArrow,
  WindSpark,
  type Book,
  type Status,
  type WindPoint,
} from "./primitives";

// ────────────────────────────────────────────────────────────
// Shared data shapes
// ────────────────────────────────────────────────────────────
export type DashBet = {
  book: Book;
  player: string;
  market: string;
  line: string;
  stake: number;
  payout: number;
  status: Status;
  wave?: "AM" | "PM";
  live: { score: string; thru: string };
  ev: number;
  hedge?: boolean;
  won?: boolean;
};

export type LeaderRow = {
  pos: string;
  name: string;
  score: number;
  thru: string;
  wave: "AM" | "PM";
  mine?: string[];
  slug?: string;
};

export type AlertItem = {
  kind: "wave" | "wind" | "hedge";
  time: string;
  title: string;
  body: string;
};

const ALERT_COLOR: Record<AlertItem["kind"], string> = {
  wave: "#8ee68e",
  wind: "#f5c558",
  hedge: "#e07868",
};

const ALERT_LABEL: Record<AlertItem["kind"], string> = {
  wave: "◐ Wave Shift",
  wind: "⌇ Wind Alert",
  hedge: "◇ Hedge Avail.",
};

const HOURLY_WIND: WindPoint[] = [
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

// ────────────────────────────────────────────────────────────
// Weather Hero — mobile version
// ────────────────────────────────────────────────────────────
import type {
  WeatherSnapshot,
  WaveSplitSummary,
} from "@/lib/weather/forecast";

// Headline second line + a real two-wave panel, both driven by the forecast.
// "The 2 waves" = the combined tee waves (Thu AM/Fri PM vs Thu PM/Fri AM).
function waveHeadline(summary?: WaveSplitSummary | null): string {
  const c = summary?.combined ?? null;
  if (!c) return "Wave split firms up midweek.";
  const delta = c.deltaWave2MinusWave1; // + => wave2 windier => favors wave1
  if (c.favors === "even" || Math.abs(delta) < 1.5) {
    return "Both tee waves scoring even.";
  }
  return delta > 0
    ? `${c.wave1.label} has the wind edge.`
    : `${c.wave2.label} has the wind edge.`;
}

function WaveRow({
  label,
  wind,
  favored,
}: {
  label: string;
  wind: number;
  favored: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="num text-text-dim" style={{ fontSize: 11.5 }}>
        {label}
      </span>
      <span
        className="num font-semibold"
        style={{ fontSize: 12.5, color: favored ? "#8ee68e" : "#f0ebe0" }}
      >
        {wind.toFixed(1)} mph{favored ? " ·  edge" : ""}
      </span>
    </div>
  );
}

function WaveEdgePanel({ summary }: { summary?: WaveSplitSummary | null }) {
  const c = summary?.combined ?? null;
  if (!c) {
    return (
      <div className="num text-text-muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
        Wave split firms up midweek — once the tee draw and Thu/Fri forecast
        lock in, the two-wave edge shows here.
      </div>
    );
  }
  const delta = c.deltaWave2MinusWave1;
  const neutral = c.favors === "even" || Math.abs(delta) < 1.5;
  const favored = neutral ? null : delta > 0 ? "wave1" : "wave2";
  return (
    <div className="space-y-1.5">
      <WaveRow label={c.wave1.label} wind={c.wave1.windAvg} favored={favored === "wave1"} />
      <WaveRow label={c.wave2.label} wind={c.wave2.windAvg} favored={favored === "wave2"} />
      <div
        className="num"
        style={{ fontSize: 11, color: neutral ? "#a8b3ac" : "#8ee68e", letterSpacing: 0.3 }}
      >
        {neutral
          ? `Even — within ${Math.abs(delta).toFixed(1)} mph`
          : `${favored === "wave1" ? c.wave1.label : c.wave2.label} by ${Math.abs(delta).toFixed(1)} mph`}
      </div>
    </div>
  );
}

export function MobileWeatherHero({
  courseName,
  snapshot,
  waveSplit,
}: {
  courseName?: string;
  snapshot?: WeatherSnapshot | null;
  waveSplit?: WaveSplitSummary | null;
} = {}) {
  const courseLabel = courseName ?? "the course";
  const sustained = snapshot?.sustainedMph ?? 18;
  const gust = snapshot?.gustMph ?? 27;
  const dir = snapshot?.windDirDeg ?? 245;
  const cardinal = snapshot?.windDirCardinal ?? "WSW";
  const delta = snapshot?.deltaSinceMorningMph ?? 10;
  const hourly = snapshot?.hourly ?? HOURLY_WIND;
  const headline =
    sustained >= 15
      ? `Wind's up at ${courseLabel}.`
      : sustained >= 8
        ? `Steady breeze at ${courseLabel}.`
        : `Calm at ${courseLabel}.`;
  return (
    <div className="mx-5 mb-6">
      <div
        className="relative rounded-[18px] overflow-hidden border border-line"
        style={{
          background:
            "linear-gradient(160deg, #1d3a26 0%, #112519 50%, #0b1a11 100%)",
          padding: "18px 18px 16px",
        }}
      >
        <div
          className="absolute pointer-events-none rounded-full"
          style={{
            top: -40,
            right: -40,
            width: 180,
            height: 180,
            background:
              "radial-gradient(circle, rgba(245,197,88,0.13) 0%, transparent 65%)",
          }}
        />

        <div className="relative mb-3.5">
          <span
            className="num font-semibold uppercase"
            style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
          >
            ● Conditions Edge
          </span>
          <div
            className="serif-italic mt-1.5 text-text"
            style={{ fontSize: 22, lineHeight: 1.18, letterSpacing: -0.2, fontStyle: "normal" }}
          >
            <em>{headline}</em> {waveHeadline(waveSplit)}
          </div>
        </div>

        <div className="flex items-end justify-between gap-4 mb-4 relative">
          <Stat value={String(sustained)} unit="mph" label="Sustained" />
          <div className="flex flex-col gap-1 items-end">
            <div className="flex items-center gap-2">
              <WindArrow degrees={dir} size={20} />
              <span
                className="num text-text-dim"
                style={{ fontSize: 12, letterSpacing: 0.6 }}
              >
                {cardinal} · gust {gust}
              </span>
            </div>
            <span
              className="num font-semibold"
              style={{ fontSize: 10.5, color: "#f5c558", letterSpacing: 0.4 }}
            >
              {delta >= 0 ? "↑" : "↓"} {delta >= 0 ? "+" : ""}
              {delta} since 6:00 AM
            </span>
          </div>
        </div>

        <div className="relative mb-4">
          <WindSpark data={hourly} width={326} height={48} />
          <div
            className="flex justify-between num text-text-muted mt-0.5"
            style={{ fontSize: 9, letterSpacing: 0.6 }}
          >
            <span>6A</span>
            <span>9A</span>
            <span>NOW</span>
            <span>3P</span>
            <span>6P</span>
          </div>
        </div>

        <div
          className="px-3.5 py-3 rounded-[10px] border border-line"
          style={{ background: "rgba(0,0,0,0.25)" }}
        >
          <div className="flex justify-between items-baseline mb-2">
            <span
              className="num font-semibold uppercase text-text-dim"
              style={{ fontSize: 10, letterSpacing: 1.2 }}
            >
              Wave Split · Wind
            </span>
            <span className="num text-text-muted" style={{ fontSize: 10 }}>
              Thu / Fri
            </span>
          </div>
          <WaveEdgePanel summary={waveSplit} />
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Weather Hero — desktop (3-column)
// ────────────────────────────────────────────────────────────
export function DesktopWeatherHero({
  courseName,
  snapshot,
  waveSplit,
}: {
  courseName?: string;
  snapshot?: WeatherSnapshot | null;
  waveSplit?: WaveSplitSummary | null;
} = {}) {
  const courseLabel = courseName ?? "the course";
  const sustained = snapshot?.sustainedMph ?? 18;
  const gust = snapshot?.gustMph ?? 27;
  const dir = snapshot?.windDirDeg ?? 245;
  const cardinal = snapshot?.windDirCardinal ?? "WSW";
  const delta = snapshot?.deltaSinceMorningMph ?? 10;
  const hourly = snapshot?.hourly ?? HOURLY_WIND;
  const headline =
    sustained >= 15
      ? `Wind's up at ${courseLabel}.`
      : sustained >= 8
        ? `Steady breeze at ${courseLabel}.`
        : `Calm at ${courseLabel}.`;
  const nowLabel = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <div
      className="relative rounded-[18px] overflow-hidden border border-line"
      style={{
        background: "linear-gradient(135deg, #1d3a26 0%, #112519 50%, #0b1a11 100%)",
        padding: "24px 28px",
        display: "grid",
        gridTemplateColumns: "1.2fr 1fr 1fr",
        gap: 32,
      }}
    >
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          top: -60,
          right: -60,
          width: 280,
          height: 280,
          background: "radial-gradient(circle, rgba(245,197,88,0.12) 0%, transparent 65%)",
        }}
      />

      <div className="relative">
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
        >
          ● Conditions Edge · {nowLabel}
        </span>
        <div
          className="serif-italic mt-2.5 mb-4 text-text"
          style={{ fontSize: 30, lineHeight: 1.15, letterSpacing: -0.4, fontStyle: "normal" }}
        >
          <em>{headline}</em>
          <br />
          {waveHeadline(waveSplit)}
        </div>
        <Stat value={String(sustained)} unit="mph" label={`Sustained · ${cardinal}`} />
        <div className="flex items-center gap-2.5 mt-2.5">
          <WindArrow degrees={dir} size={20} />
          <span
            className="num text-text-dim"
            style={{ fontSize: 11.5, letterSpacing: 0.5 }}
          >
            Gust {gust} · {delta >= 0 ? "↑" : "↓"} {delta >= 0 ? "+" : ""}
            {delta} mph since 6:00 AM
          </span>
        </div>
      </div>

      <div className="relative">
        <span
          className="num font-semibold uppercase text-text-muted"
          style={{ fontSize: 10, letterSpacing: 1.2 }}
        >
          Hourly Wind · 6 AM → 8 PM
        </span>
        <div className="mt-4">
          <WindSpark data={hourly} width={300} height={88} />
        </div>
        <div
          className="flex justify-between num text-text-muted mt-1"
          style={{ fontSize: 10, letterSpacing: 0.6 }}
        >
          <span>6A</span>
          <span>9A</span>
          <span>NOW</span>
          <span>3P</span>
          <span>6P</span>
          <span>8P</span>
        </div>
        <div className="flex gap-5 mt-3.5 text-text-dim" style={{ fontSize: 12 }}>
          <span>
            <span
              className="inline-block align-middle mr-1.5"
              style={{ width: 8, height: 2, background: "#f5c558" }}
            />
            Sustained
          </span>
          <span>
            <span
              className="inline-block align-middle mr-1.5 rounded-sm"
              style={{ width: 8, height: 8, background: "rgba(245,197,88,0.25)" }}
            />
            Gust band
          </span>
        </div>
      </div>

      <div className="relative">
        <span
          className="num font-semibold uppercase text-text-muted"
          style={{ fontSize: 10, letterSpacing: 1.2 }}
        >
          Wave Split · Wind
        </span>
        <div
          className="mt-4 p-3.5 rounded-lg border border-line"
          style={{ background: "rgba(0,0,0,0.25)" }}
        >
          <WaveEdgePanel summary={waveSplit} />
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Alerts feed (mobile)
// ────────────────────────────────────────────────────────────
export function AlertsFeed({ alerts }: { alerts: AlertItem[] }) {
  return (
    <div className="mb-6">
      <SectionLabel action="See all">Live Alerts · 3 New</SectionLabel>
      <div className="mx-5 rounded-[14px] bg-surface-1 border border-line overflow-hidden">
        {alerts.map((a, i) => (
          <div
            key={i}
            className="flex gap-3 px-3.5 py-3"
            style={{
              borderBottom:
                i < alerts.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
            }}
          >
            <div
              className="shrink-0 self-stretch rounded-full"
              style={{ width: 4, background: ALERT_COLOR[a.kind] }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between gap-2 mb-0.5">
                <span
                  className="num font-semibold uppercase"
                  style={{
                    fontSize: 9.5,
                    letterSpacing: 1.1,
                    color: ALERT_COLOR[a.kind],
                  }}
                >
                  {ALERT_LABEL[a.kind]}
                </span>
                <span
                  className="num text-text-muted"
                  style={{ fontSize: 10 }}
                >
                  {a.time}
                </span>
              </div>
              <div
                className="text-text font-medium mb-0.5"
                style={{ fontSize: 13.5, lineHeight: 1.35 }}
              >
                {a.title}
              </div>
              <div
                className="text-text-dim"
                style={{ fontSize: 12, lineHeight: 1.4 }}
              >
                {a.body}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Alerts panel (desktop right rail)
// ────────────────────────────────────────────────────────────
export function AlertsPanel({ alerts }: { alerts: AlertItem[] }) {
  return (
    <div className="rounded-[14px] overflow-hidden bg-surface-1 border border-line">
      <div
        className="flex items-center justify-between px-4 py-3.5 border-b border-line"
        style={{ background: "rgba(0,0,0,0.18)" }}
      >
        <span
          className="serif-italic text-text"
          style={{ fontSize: 17, letterSpacing: -0.2, fontStyle: "normal" }}
        >
          Live Alerts
        </span>
        <span
          className="num font-bold rounded-full px-2 py-0.5"
          style={{
            fontSize: 10,
            letterSpacing: 0.6,
            color: "#06140c",
            background: "#f5c558",
          }}
        >
          3 NEW
        </span>
      </div>
      {alerts.map((a, i) => (
        <div
          key={i}
          className="flex gap-2.5 px-4 py-3"
          style={{
            borderBottom:
              i < alerts.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
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
              <span className="num text-text-muted" style={{ fontSize: 10 }}>
                {a.time} AM
              </span>
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
              {a.body}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Open bets — mobile card list
// ────────────────────────────────────────────────────────────
export function MobileOpenBets({ bets }: { bets: DashBet[] }) {
  return (
    <div className="mb-6">
      <SectionLabel action="5 of 7 →">Open Tickets · This Event</SectionLabel>
      <div className="mx-5 rounded-[14px] bg-surface-1 border border-line">
        {bets.map((b, i) => (
          <MobileBetRow key={i} b={b} last={i === bets.length - 1} />
        ))}
      </div>
      <div
        className="mx-5 mt-2.5 px-3.5 py-2.5 rounded-[10px] border-dashed border border-line flex justify-between num text-text-dim"
        style={{ background: "rgba(255,255,255,0.02)", fontSize: 11, letterSpacing: 0.4 }}
      >
        <span>
          RISK <span className="text-text font-semibold">4.75u</span>
        </span>
        <span>
          POTENTIAL <span className="text-text font-semibold">12.30u</span>
        </span>
        <span>
          LIVE EV{" "}
          <span className="font-semibold" style={{ color: "#8ee68e" }}>
            +0.42u
          </span>
        </span>
      </div>
    </div>
  );
}

function MobileBetRow({ b, last }: { b: DashBet; last: boolean }) {
  const evColor = b.ev > 5 ? "#8ee68e" : b.ev < -5 ? "#e07868" : "#a8b3ac";
  return (
    <div
      className="px-3.5 py-3 flex flex-col gap-2"
      style={{
        borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center gap-2">
        <BookChip book={b.book} />
        <StatusDot status={b.status} withLabel />
        {b.hedge && (
          <span
            className="num font-semibold uppercase px-1.5 py-0.5 rounded"
            style={{
              fontSize: 9.5,
              letterSpacing: 0.8,
              color: "#e07868",
              background: "rgba(224,120,104,0.13)",
              border: "1px solid rgba(224,120,104,0.27)",
            }}
          >
            Hedge
          </span>
        )}
        <span className="flex-1" />
        {b.status === "live" && (
          <span
            className="num font-semibold"
            style={{ fontSize: 10.5, color: evColor, letterSpacing: 0.4 }}
          >
            {b.ev > 0 ? "+" : ""}
            {b.ev}% EV
          </span>
        )}
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div
            className="text-text font-semibold truncate"
            style={{ fontSize: 14.5, lineHeight: 1.2 }}
          >
            {b.player}
          </div>
          <div className="text-text-dim mt-0.5" style={{ fontSize: 12.5 }}>
            {b.market} ·{" "}
            <span className="num text-text-dim">{b.line}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="num text-text font-semibold" style={{ fontSize: 13 }}>
            {b.stake}u → {b.payout.toFixed(2)}u
          </div>
          {b.status === "live" && (
            <div className="num text-text-dim mt-0.5" style={{ fontSize: 10.5 }}>
              {b.live.score} · {b.live.thru}
            </div>
          )}
          {b.status === "graded" && (
            <div
              className="num font-semibold mt-0.5"
              style={{ fontSize: 10.5, color: "#8ee68e" }}
            >
              WON · +0.65u
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Desktop bets table
// ────────────────────────────────────────────────────────────
const DESKTOP_GRID = "52px 52px 1.8fr 1.2fr 80px 100px 70px 80px";

export function DesktopBetsTable({ bets }: { bets: DashBet[] }) {
  return (
    <div className="rounded-[14px] overflow-hidden bg-surface-1 border border-line">
      <div
        className="flex items-center px-4 py-3.5 border-b border-line"
        style={{ background: "rgba(0,0,0,0.18)" }}
      >
        <span
          className="serif-italic flex-1 text-text"
          style={{ fontSize: 17, letterSpacing: -0.2, fontStyle: "normal" }}
        >
          Open Tickets · This Event
        </span>
        <div className="flex gap-1.5">
          {["All", "Live", "Pending", "Graded", "Hedge"].map((t, i) => (
            <span
              key={t}
              className="num font-semibold uppercase"
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                fontSize: 10.5,
                letterSpacing: 0.6,
                color: i === 0 ? "#f0ebe0" : "#a8b3ac",
                background: i === 0 ? "#1e4030" : "transparent",
                border: i === 0
                  ? "1px solid rgba(255,255,255,0.06)"
                  : "1px solid transparent",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
      <div
        className="grid gap-2.5 px-4 py-2.5 num font-semibold uppercase text-text-muted border-b border-line"
        style={{
          gridTemplateColumns: DESKTOP_GRID,
          fontSize: 9.5,
          letterSpacing: 1.1,
        }}
      >
        <span>Book</span>
        <span>Wave</span>
        <span>Player</span>
        <span>Market</span>
        <span className="text-right">Line</span>
        <span className="text-right">Risk → Win</span>
        <span className="text-right">Live</span>
        <span className="text-right">Δ EV</span>
      </div>
      {bets.map((b, i) => {
        const ev = b.ev > 5 ? "#8ee68e" : b.ev < -5 ? "#e07868" : "#a8b3ac";
        return (
          <div
            key={i}
            className="grid gap-2.5 px-4 py-3.5 items-center"
            style={{
              gridTemplateColumns: DESKTOP_GRID,
              borderBottom:
                i < bets.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
              background: b.hedge ? "rgba(224,120,104,0.05)" : "transparent",
            }}
          >
            <span>
              <BookChip book={b.book} />
            </span>
            <span
              className="num font-semibold w-fit"
              style={{
                fontSize: 10,
                letterSpacing: 0.8,
                color: b.wave === "AM" ? "#8ee68e" : "#f5c558",
                padding: "2px 6px",
                borderRadius: 3,
                background:
                  b.wave === "AM" ? "rgba(142,230,142,0.12)" : "rgba(245,197,88,0.12)",
              }}
            >
              {b.wave}
            </span>
            <div>
              <div className="text-text font-semibold" style={{ fontSize: 13.5 }}>
                {b.player}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <StatusDot status={b.status} withLabel />
                {b.hedge && (
                  <span
                    className="num font-semibold uppercase"
                    style={{
                      fontSize: 9,
                      letterSpacing: 0.8,
                      color: "#e07868",
                      padding: "1px 5px",
                      borderRadius: 3,
                      background: "rgba(224,120,104,0.13)",
                      border: "1px solid rgba(224,120,104,0.33)",
                    }}
                  >
                    Hedge open
                  </span>
                )}
              </div>
            </div>
            <span className="text-text-dim" style={{ fontSize: 13 }}>
              {b.market}
            </span>
            <span className="num text-text text-right" style={{ fontSize: 12.5 }}>
              {b.line}
            </span>
            <span
              className="num text-text text-right font-semibold"
              style={{ fontSize: 12.5 }}
            >
              {b.stake}u → {b.payout.toFixed(2)}u
            </span>
            <span
              className="num text-right"
              style={{
                fontSize: 12,
                color: b.won ? "#8ee68e" : "#a8b3ac",
                fontWeight: b.won ? 700 : 400,
              }}
            >
              {b.live.score} · {b.live.thru}
            </span>
            <span
              className="num text-right font-bold"
              style={{
                fontSize: 12,
                color: b.status === "graded" ? "#6c7a72" : ev,
              }}
            >
              {b.status === "graded" ? "—" : `${b.ev > 0 ? "+" : ""}${b.ev}%`}
            </span>
          </div>
        );
      })}
      <div
        className="flex justify-between px-4 py-3 border-t border-line"
        style={{ background: "rgba(0,0,0,0.18)" }}
      >
        <span
          className="num text-text-dim"
          style={{ fontSize: 11, letterSpacing: 0.4 }}
        >
          7 tickets · 6 live · 1 graded
        </span>
        <div className="flex gap-7">
          <Footnote label="RISK" value="5.50u" />
          <Footnote label="POTENTIAL" value="19.50u" />
          <Footnote label="LIVE Δ EV" value="+0.42u" pos />
          <Footnote label="GRADED P&L" value="+0.65u" pos />
        </div>
      </div>
    </div>
  );
}

function Footnote({
  label,
  value,
  pos,
}: {
  label: string;
  value: string;
  pos?: boolean;
}) {
  return (
    <span
      className="num text-text-dim"
      style={{ fontSize: 11, letterSpacing: 0.4 }}
    >
      {label}{" "}
      <span
        className="font-semibold"
        style={{ color: pos ? "#8ee68e" : "#f0ebe0" }}
      >
        {value}
      </span>
    </span>
  );
}

// ────────────────────────────────────────────────────────────
// Leaderboard — mobile + desktop
// ────────────────────────────────────────────────────────────
export function MobileLeaderboard({ rows }: { rows: LeaderRow[] }) {
  return (
    <div className="mb-4">
      <SectionLabel action="Full board →">
        Leaderboard · R2 In Progress
      </SectionLabel>
      <div className="mx-5 rounded-[14px] bg-surface-1 border border-line overflow-hidden">
        <div
          className="flex items-center gap-2.5 px-3.5 py-2 border-b border-line num font-semibold uppercase text-text-muted"
          style={{
            background: "rgba(0,0,0,0.18)",
            fontSize: 9.5,
            letterSpacing: 1.1,
          }}
        >
          <span style={{ minWidth: 22 }}>Pos</span>
          <span className="flex-1">Player</span>
          <span className="text-right" style={{ width: 22 }}>
            Wv
          </span>
          <span className="text-right" style={{ width: 30 }}>
            To Par
          </span>
          <span className="text-right" style={{ width: 28 }}>
            Thru
          </span>
        </div>
        {rows.map((r, i) => (
          <MobileLeaderRow key={i} r={r} last={i === rows.length - 1} />
        ))}
      </div>
    </div>
  );
}

function MobileLeaderRow({ r, last }: { r: LeaderRow; last: boolean }) {
  const mine = !!r.mine?.length;
  return (
    <div
      className="relative flex items-center gap-2.5 px-3.5 py-2.5"
      style={{
        borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.06)",
        background: mine ? "rgba(142, 230, 142, 0.05)" : "transparent",
      }}
    >
      {mine && (
        <div
          className="absolute"
          style={{ left: 0, top: 0, bottom: 0, width: 2, background: "#8ee68e" }}
        />
      )}
      <span
        className="num font-semibold text-text-dim"
        style={{ fontSize: 11, minWidth: 22 }}
      >
        {r.pos}
      </span>
      <StarButton player={r.name} size={14} className="-ml-1" />
      {r.slug ? (
        <Link
          href={`/players/${r.slug}`}
          className="flex-1 truncate hover:text-text transition"
          style={{
            fontSize: 13.5,
            color: mine ? "#f0ebe0" : "#a8b3ac",
            fontWeight: mine ? 600 : 400,
          }}
        >
          {r.name}
        </Link>
      ) : (
        <span
          className="flex-1 truncate"
          style={{
            fontSize: 13.5,
            color: mine ? "#f0ebe0" : "#a8b3ac",
            fontWeight: mine ? 600 : 400,
          }}
        >
          {r.name}
        </span>
      )}
      {mine && (
        <span
          className="num font-semibold"
          style={{
            fontSize: 9.5,
            color: "#8ee68e",
            letterSpacing: 0.6,
            padding: "2px 5px",
            borderRadius: 3,
            background: "rgba(142,230,142,0.12)",
          }}
        >
          ★ {r.mine!.join(" · ")}
        </span>
      )}
      <span
        className="num font-semibold text-right"
        style={{
          fontSize: 9.5,
          letterSpacing: 0.6,
          width: 22,
          color: r.wave === "AM" ? "#8ee68e" : "#f5c558",
        }}
      >
        {r.wave}
      </span>
      <span
        className="num font-semibold text-text text-right"
        style={{ fontSize: 13, width: 30 }}
      >
        {r.score}
      </span>
      <span
        className="num text-text-dim text-right"
        style={{ fontSize: 11, width: 28 }}
      >
        {r.thru}
      </span>
    </div>
  );
}

export function DesktopLeaderboard({ rows }: { rows: LeaderRow[] }) {
  return (
    <div className="rounded-[14px] overflow-hidden bg-surface-1 border border-line">
      <div
        className="flex items-baseline justify-between px-4 py-3.5 border-b border-line"
        style={{ background: "rgba(0,0,0,0.18)" }}
      >
        <span
          className="serif-italic text-text"
          style={{ fontSize: 17, letterSpacing: -0.2, fontStyle: "normal" }}
        >
          Leaderboard
        </span>
        <span
          className="num text-text-muted"
          style={{ fontSize: 10.5, letterSpacing: 0.6 }}
        >
          R2 · 7 of your players in top 12
        </span>
      </div>
      <div
        className="grid gap-2 px-4 py-2 num font-semibold uppercase text-text-muted border-b border-line"
        style={{
          gridTemplateColumns: "40px 1fr 36px 50px 36px",
          fontSize: 9,
          letterSpacing: 1.1,
        }}
      >
        <span>Pos</span>
        <span>Player</span>
        <span className="text-right">Wv</span>
        <span className="text-right">Par</span>
        <span className="text-right">Thru</span>
      </div>
      {rows.map((r, i) => {
        const mine = !!r.mine?.length;
        return (
          <div
            key={i}
            className="relative grid gap-2 px-4 py-2.5 items-center"
            style={{
              gridTemplateColumns: "40px 1fr 36px 50px 36px",
              borderBottom:
                i < rows.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
              background: mine ? "rgba(142,230,142,0.05)" : "transparent",
            }}
          >
            {mine && (
              <div
                className="absolute"
                style={{
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: "#8ee68e",
                }}
              />
            )}
            <span
              className="num font-semibold text-text-dim"
              style={{ fontSize: 11 }}
            >
              {r.pos}
            </span>
            <div className="min-w-0 flex items-center gap-1.5">
              <StarButton player={r.name} size={12} className="-ml-1.5" />
              {r.slug ? (
                <Link
                  href={`/players/${r.slug}`}
                  className="truncate block hover:text-text transition flex-1 min-w-0"
                  style={{
                    fontSize: 13,
                    color: mine ? "#f0ebe0" : "#a8b3ac",
                    fontWeight: mine ? 600 : 400,
                  }}
                >
                  {r.name}
                </Link>
              ) : (
                <div
                  className="truncate flex-1 min-w-0"
                  style={{
                    fontSize: 13,
                    color: mine ? "#f0ebe0" : "#a8b3ac",
                    fontWeight: mine ? 600 : 400,
                  }}
                >
                  {r.name}
                </div>
              )}
              {mine && (
                <div
                  className="num font-semibold mt-px"
                  style={{
                    fontSize: 9.5,
                    color: "#8ee68e",
                    letterSpacing: 0.4,
                  }}
                >
                  ★ {r.mine!.join(" · ")}
                </div>
              )}
            </div>
            <span
              className="num font-semibold text-right"
              style={{
                fontSize: 9.5,
                letterSpacing: 0.6,
                color: r.wave === "AM" ? "#8ee68e" : "#f5c558",
              }}
            >
              {r.wave}
            </span>
            <span
              className="num font-semibold text-text text-right"
              style={{ fontSize: 13 }}
            >
              {r.score}
            </span>
            <span
              className="num text-text-dim text-right"
              style={{ fontSize: 11 }}
            >
              {r.thru}
            </span>
          </div>
        );
      })}
    </div>
  );
}
