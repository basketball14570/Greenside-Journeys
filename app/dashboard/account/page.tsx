"use client";

import { useEffect, useState } from "react";

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
  const [persistStatus, setPersistStatus] = useState<
    "idle" | "loading" | "saved" | "anon" | "unconfigured"
  >("idle");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/account/preferences", { cache: "no-store" });
        const j = await r.json();
        if (cancelled) return;
        if (!j.configured) return setPersistStatus("unconfigured");
        if (!j.signedIn) return setPersistStatus("anon");
        setWindCutoff(j.wind_cutoff_mph ?? 15);
        setEvCutoff(j.ev_cutoff_pct ?? 5);
        if (j.alert_prefs && typeof j.alert_prefs === "object") {
          setPrefs((p) =>
            p.map((x) =>
              x.id in j.alert_prefs ? { ...x, enabled: !!j.alert_prefs[x.id] } : x,
            ),
          );
        }
        setPersistStatus("idle");
      } catch {
        setPersistStatus("unconfigured");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(next: {
    prefs?: typeof DEFAULT_PREFS;
    windCutoff?: number;
    evCutoff?: number;
  }) {
    if (persistStatus === "anon" || persistStatus === "unconfigured") return;
    setPersistStatus("loading");
    const payload: Record<string, unknown> = {};
    if (next.prefs) {
      payload.alert_prefs = Object.fromEntries(
        next.prefs.map((p) => [p.id, p.enabled]),
      );
    }
    if (typeof next.windCutoff === "number") payload.wind_cutoff_mph = next.windCutoff;
    if (typeof next.evCutoff === "number") payload.ev_cutoff_pct = next.evCutoff;
    try {
      await fetch("/api/account/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setPersistStatus("saved");
      setTimeout(() => setPersistStatus("idle"), 1500);
    } catch {
      setPersistStatus("idle");
    }
  }

  function toggle(id: string) {
    setPrefs((p) => {
      const next = p.map((x) =>
        x.id === id ? { ...x, enabled: !x.enabled } : x,
      );
      save({ prefs: next });
      return next;
    });
  }

  function commitWind(v: number) {
    setWindCutoff(v);
    save({ windCutoff: v });
  }
  function commitEv(v: number) {
    setEvCutoff(v);
    save({ evCutoff: v });
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

      <ForwardingAddress />

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
          onChange={commitWind}
          min={5}
          max={30}
          unit="mph"
        />
        <ThresholdRow
          label="EV shift cutoff"
          hint="Notify when a single bet moves more than this (%)"
          value={evCutoff}
          onChange={commitEv}
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
        {persistStatus === "saved" && "✓ Saved"}
        {persistStatus === "loading" && "Saving…"}
        {persistStatus === "idle" && "Changes auto-save."}
        {persistStatus === "anon" && "Sign in to sync preferences across devices."}
        {persistStatus === "unconfigured" &&
          "Supabase isn't configured on this deploy; preferences are local only."}
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

function ForwardingAddress() {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "anon" }
    | { kind: "unconfigured" }
    | { kind: "ready"; address: string | null }
  >({ kind: "loading" });
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);

  async function load() {
    try {
      const r = await fetch("/api/account/forwarding", { cache: "no-store" });
      const j = await r.json();
      if (!j.configured) setState({ kind: "unconfigured" });
      else if (!j.signedIn) setState({ kind: "anon" });
      else setState({ kind: "ready", address: j.address ?? null });
    } catch {
      setState({ kind: "unconfigured" });
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function copy(address: string) {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* fall through */
    }
  }

  async function rotate() {
    if (!confirm("Rotate forwarding address? The current one will stop working.")) return;
    setRotating(true);
    try {
      const r = await fetch("/api/account/forwarding", { method: "POST" });
      const j = await r.json();
      if (j.address) setState({ kind: "ready", address: j.address });
    } finally {
      setRotating(false);
    }
  }

  return (
    <div className="rounded-[14px] bg-surface-1 border border-line p-5">
      <div
        className="serif-italic mb-1 text-text"
        style={{ fontSize: 18, letterSpacing: -0.2, fontStyle: "normal" }}
      >
        Forward bets by email
      </div>
      <p className="text-text-dim" style={{ fontSize: 13 }}>
        Forward any DK / FD / PrizePicks / Underdog confirmation to this
        address. Claude parses each leg into your tickets automatically.
      </p>

      <div className="mt-4">
        {state.kind === "loading" && (
          <p className="text-text-dim" style={{ fontSize: 12 }}>
            Loading…
          </p>
        )}
        {state.kind === "anon" && (
          <p className="text-text-dim" style={{ fontSize: 12 }}>
            Sign in to claim your forwarding address.
          </p>
        )}
        {state.kind === "unconfigured" && (
          <p className="text-text-dim" style={{ fontSize: 12 }}>
            Supabase isn&apos;t configured on this deploy, so forwarding is
            unavailable. Set <code className="num">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
            and the service-role key, then redeploy.
          </p>
        )}
        {state.kind === "ready" && state.address && (
          <>
            <div
              className="flex items-center gap-2 rounded-[8px] border border-line bg-bg px-3 py-2"
              style={{ fontSize: 13, fontFamily: "ui-monospace, monospace" }}
            >
              <span className="flex-1 truncate text-text">{state.address}</span>
              <button
                onClick={() => copy(state.address!)}
                className="rounded-[6px] px-2 py-1 border border-line hover:border-line-strong"
                style={{ fontSize: 11 }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <button
              onClick={rotate}
              disabled={rotating}
              className="mt-3 text-text-dim hover:text-text disabled:opacity-40"
              style={{ fontSize: 12 }}
            >
              {rotating ? "Rotating…" : "Rotate address"}
            </button>
          </>
        )}
        {state.kind === "ready" && !state.address && (
          <p className="text-text-dim" style={{ fontSize: 12 }}>
            No address yet — refresh after Supabase migrations apply.
          </p>
        )}
      </div>
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
