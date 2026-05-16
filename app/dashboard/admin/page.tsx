"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Admin integrations panel. Hits /api/health, paints a row per integration
// with a green/red dot, and exposes a re-check button. Read-only — secrets
// never come back from the health endpoint, only configured/not-configured
// flags.

type HealthResponse = {
  status: string;
  time: string;
  configured: number;
  total: number;
  integrations: Record<string, boolean>;
  runtime?: { node?: string; platform?: string };
};

const LABELS: Record<string, { name: string; group: string; doc?: string }> = {
  supabase: { name: "Supabase (auth + storage)", group: "Core" },
  supabase_service_role: { name: "Supabase service role key", group: "Core" },
  anthropic: { name: "Anthropic (Ask Greenside)", group: "Core" },
  datagolf: { name: "DataGolf API", group: "Data" },
  weather_open_meteo: { name: "Open-Meteo (default)", group: "Data" },
  weather_tomorrow_io: { name: "Tomorrow.io (premium)", group: "Data" },
  odds_api: { name: "The Odds API", group: "Data" },
  postmark_inbound: { name: "Postmark inbound parse", group: "Ingestion" },
  push_vapid: { name: "Web Push (VAPID)", group: "Notify" },
  webhook_discord: { name: "Discord webhook", group: "Notify" },
  webhook_slack: { name: "Slack webhook", group: "Notify" },
  webhook_generic: { name: "Generic newsletter webhook", group: "Notify" },
  cron_secret: { name: "CRON_SECRET (gates /api/cron/*)", group: "Ops" },
};

const GROUP_ORDER = ["Core", "Data", "Ingestion", "Notify", "Ops"];

export default function AdminPage() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/health", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as HealthResponse;
      setData(j);
      setLastFetched(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const grouped = data ? groupIntegrations(data.integrations) : {};

  return (
    <div className="px-5 lg:px-8 py-6 space-y-5 max-w-5xl mx-auto">
      <header>
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
        >
          ● Admin
        </span>
        <h1
          className="serif-italic mt-1.5"
          style={{ fontSize: 36, letterSpacing: -0.4 }}
        >
          <em>Integrations.</em>
        </h1>
        <p className="text-text-dim mt-2 max-w-2xl" style={{ fontSize: 14 }}>
          Live status of every external integration. Green = configured (env
          var set on this deploy). Red = missing. The health endpoint never
          returns the secrets themselves.
        </p>
      </header>

      <section className="rounded-[14px] border border-line p-5 bg-surface-1 space-y-3">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="font-medium" style={{ fontSize: 16 }}>
              {data ? `${data.configured} / ${data.total} configured` : "Loading…"}
            </div>
            <div className="text-text-dim" style={{ fontSize: 11 }}>
              {lastFetched
                ? `Probed ${lastFetched.toLocaleTimeString()} · runtime ${
                    data?.runtime?.node ?? "unknown"
                  } / ${data?.runtime?.platform ?? "unknown"}`
                : "Awaiting first probe"}
            </div>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="rounded-[10px] px-3 py-1.5 border border-line hover:border-line-strong disabled:opacity-40"
            style={{ fontSize: 12 }}
          >
            {loading ? "Probing…" : "Re-check"}
          </button>
        </div>
        {error && (
          <div
            className="rounded-[8px] border px-3 py-2"
            style={{
              borderColor: "#e87c7c",
              background: "#e87c7c1a",
              color: "#e87c7c",
              fontSize: 12,
            }}
          >
            Probe failed: {error}
          </div>
        )}
      </section>

      {GROUP_ORDER.map((group) => {
        const rows = grouped[group] ?? [];
        if (rows.length === 0) return null;
        return (
          <section
            key={group}
            className="rounded-[14px] border border-line overflow-hidden"
          >
            <div className="px-4 py-2.5 border-b border-line bg-surface-1">
              <div
                className="num font-semibold uppercase text-text-muted"
                style={{ fontSize: 10, letterSpacing: 1.2 }}
              >
                {group}
              </div>
            </div>
            {rows.map((r) => (
              <div
                key={r.key}
                className="flex items-center gap-3 px-4 py-3 border-b border-line/50 last:border-b-0"
              >
                <span
                  aria-hidden
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 99,
                    background: r.ok ? "#7fd49a" : "#e87c7c",
                    boxShadow: `0 0 0 4px ${r.ok ? "#7fd49a22" : "#e87c7c22"}`,
                    display: "inline-block",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 13 }}>{r.label}</div>
                  <div
                    className="text-text-dim num"
                    style={{ fontSize: 11, letterSpacing: 0.4 }}
                  >
                    {r.key}
                  </div>
                </div>
                <span
                  className="num uppercase px-2 py-0.5 rounded"
                  style={{
                    fontSize: 10,
                    letterSpacing: 1.2,
                    color: r.ok ? "#7fd49a" : "#e87c7c",
                    background: r.ok ? "#7fd49a1a" : "#e87c7c1a",
                  }}
                >
                  {r.ok ? "Live" : "Missing"}
                </span>
              </div>
            ))}
          </section>
        );
      })}

      <section className="text-text-dim space-y-1.5" style={{ fontSize: 12 }}>
        <p>
          Public probe URL:{" "}
          <Link href="/api/health" className="text-text underline">
            /api/health
          </Link>{" "}
          — safe to expose; no secrets returned.
        </p>
        <p>
          To configure a missing integration, set the env var on Vercel and
          redeploy. Reference:{" "}
          <code className="num">.env.example</code> in the repo.
        </p>
      </section>
    </div>
  );
}

type Row = { key: string; label: string; ok: boolean };

function groupIntegrations(
  integrations: Record<string, boolean>,
): Record<string, Row[]> {
  const out: Record<string, Row[]> = {};
  for (const [key, ok] of Object.entries(integrations)) {
    const meta = LABELS[key];
    const group = meta?.group ?? "Other";
    const label = meta?.name ?? key;
    (out[group] ??= []).push({ key, label, ok });
  }
  return out;
}
