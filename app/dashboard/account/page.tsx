"use client";

import { useState } from "react";

type AlertPref = {
  id: string;
  label: string;
  hint: string;
  enabled: boolean;
};

const DEFAULT_PREFS: AlertPref[] = [
  {
    id: "wave",
    label: "Wave shift alerts",
    hint: "AM/PM strokes-gained delta crosses your threshold",
    enabled: true,
  },
  {
    id: "wind",
    label: "Wind threshold alerts",
    hint: "Sustained wind or gust crosses a personal cutoff",
    enabled: true,
  },
  {
    id: "hedge",
    label: "Hedge opportunities",
    hint: "Live odds across books make a hedge profitable",
    enabled: true,
  },
  {
    id: "precip",
    label: "Precipitation alerts",
    hint: "Rain starts or stops at a course you&apos;re exposed to",
    enabled: false,
  },
  {
    id: "withdraw",
    label: "Player withdrawals",
    hint: "WD / DNS / DQ on a player in your portfolio",
    enabled: true,
  },
  {
    id: "linemove",
    label: "Line movement",
    hint: "Closing-line value shifts > 10% on bets you&apos;ve placed",
    enabled: false,
  },
];

export default function AccountPage() {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [windCutoff, setWindCutoff] = useState(15);
  const [evCutoff, setEvCutoff] = useState(5);
  const [pushPermission, setPushPermission] = useState<
    "default" | "granted" | "denied"
  >("default");

  function toggle(id: string) {
    setPrefs((p) =>
      p.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x)),
    );
  }

  async function requestPush() {
    if (typeof Notification === "undefined") {
      setPushPermission("denied");
      return;
    }
    const result = await Notification.requestPermission();
    setPushPermission(result as "granted" | "denied" | "default");
  }

  return (
    <div className="px-5 lg:px-8 py-6 space-y-6 max-w-3xl mx-auto">
      <header>
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
        >
          ● Settings
        </span>
        <h1
          className="serif-italic mt-1.5"
          style={{ fontSize: 36, letterSpacing: -0.4, fontStyle: "normal" }}
        >
          <em>Alerts & account.</em>
        </h1>
      </header>

      {/* Push permission */}
      <div className="rounded-[14px] bg-surface-1 border border-line p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div
              className="serif-italic mb-1 text-text"
              style={{ fontSize: 18, letterSpacing: -0.2, fontStyle: "normal" }}
            >
              Push notifications
            </div>
            <p className="text-text-dim" style={{ fontSize: 13.5 }}>
              The alerts below only reach you if push is enabled in this browser.
            </p>
          </div>
          {pushPermission === "granted" ? (
            <span
              className="num font-semibold"
              style={{
                fontSize: 11,
                letterSpacing: 0.6,
                color: "#8ee68e",
                padding: "6px 11px",
                borderRadius: 6,
                background: "rgba(142,230,142,0.13)",
                border: "1px solid rgba(142,230,142,0.3)",
              }}
            >
              ENABLED
            </span>
          ) : pushPermission === "denied" ? (
            <span
              className="num font-semibold"
              style={{
                fontSize: 11,
                letterSpacing: 0.6,
                color: "#e07868",
                padding: "6px 11px",
                borderRadius: 6,
                background: "rgba(224,120,104,0.13)",
                border: "1px solid rgba(224,120,104,0.3)",
              }}
            >
              BLOCKED
            </span>
          ) : (
            <button
              onClick={requestPush}
              className="font-bold"
              style={{
                background: "#8ee68e",
                color: "#06140c",
                padding: "9px 16px",
                borderRadius: 6,
                fontSize: 13,
              }}
            >
              Enable push
            </button>
          )}
        </div>
      </div>

      {/* Thresholds */}
      <div className="rounded-[14px] bg-surface-1 border border-line p-5 space-y-5">
        <div>
          <div
            className="serif-italic mb-1 text-text"
            style={{ fontSize: 18, letterSpacing: -0.2, fontStyle: "normal" }}
          >
            Thresholds
          </div>
          <p className="text-text-dim" style={{ fontSize: 13 }}>
            Tune how sensitive the engine is before it pings you.
          </p>
        </div>

        <ThresholdRow
          label="Wind cutoff"
          hint="Notify when sustained wind crosses this (mph)"
          value={windCutoff}
          onChange={setWindCutoff}
          min={5}
          max={30}
          unit="mph"
        />
        <ThresholdRow
          label="EV shift cutoff"
          hint="Notify when a single bet moves more than this (%)"
          value={evCutoff}
          onChange={setEvCutoff}
          min={2}
          max={20}
          unit="%"
        />
      </div>

      {/* Alert types */}
      <div className="rounded-[14px] bg-surface-1 border border-line">
        <div className="px-5 pt-5 pb-3">
          <div
            className="serif-italic mb-1 text-text"
            style={{ fontSize: 18, letterSpacing: -0.2, fontStyle: "normal" }}
          >
            Alert types
          </div>
          <p className="text-text-dim" style={{ fontSize: 13 }}>
            Granular control over what the engine considers actionable.
          </p>
        </div>
        {prefs.map((p, i) => (
          <div
            key={p.id}
            className="flex items-center gap-4 px-5 py-3.5"
            style={{
              borderTop:
                i === 0 ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex-1 min-w-0">
              <div className="text-text font-medium" style={{ fontSize: 14 }}>
                {p.label}
              </div>
              <div
                className="text-text-dim mt-0.5"
                style={{ fontSize: 12.5 }}
                dangerouslySetInnerHTML={{ __html: p.hint }}
              />
            </div>
            <Toggle on={p.enabled} onClick={() => toggle(p.id)} />
          </div>
        ))}
      </div>

      <p className="text-text-muted text-center" style={{ fontSize: 11 }}>
        Preferences sync to your account once Supabase auth is provisioned.
      </p>
    </div>
  );
}

function ThresholdRow({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  unit,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  unit: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <div className="text-text font-medium" style={{ fontSize: 14 }}>
            {label}
          </div>
          <div className="text-text-dim mt-0.5" style={{ fontSize: 12 }}>
            {hint}
          </div>
        </div>
        <span
          className="serif-italic"
          style={{ fontSize: 28, fontStyle: "italic", color: "#8ee68e", lineHeight: 1 }}
        >
          {value}
          <span
            className="num"
            style={{ fontSize: 12, fontStyle: "normal", marginLeft: 4, color: "#a8b3ac" }}
          >
            {unit}
          </span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: "#8ee68e" }}
      />
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative shrink-0 transition"
      style={{
        width: 44,
        height: 26,
        borderRadius: 999,
        background: on ? "#3f8a52" : "#1e4030",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <span
        className="absolute top-0.5 transition"
        style={{
          left: on ? 20 : 2,
          width: 20,
          height: 20,
          borderRadius: 99,
          background: on ? "#8ee68e" : "#a8b3ac",
          boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
        }}
      />
    </button>
  );
}
