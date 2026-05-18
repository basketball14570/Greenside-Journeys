"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/edge/primitives";

type StepId = "welcome" | "books" | "alerts" | "exposure" | "done";

const STEPS: { id: StepId; label: string }[] = [
  { id: "welcome", label: "Welcome" },
  { id: "books", label: "Your books" },
  { id: "alerts", label: "Alerts" },
  { id: "exposure", label: "Tournaments" },
  { id: "done", label: "Ready" },
];

const BOOKS = [
  { id: "DK", name: "DraftKings", color: "#1a3326" },
  { id: "FD", name: "FanDuel", color: "#1a2b33" },
  { id: "PP", name: "PrizePicks", color: "#33291a" },
  { id: "UD", name: "Underdog", color: "#2b1a33" },
  { id: "CZ", name: "Caesars", color: "#332220" },
  { id: "MGM", name: "BetMGM", color: "#332e1a" },
];

const ALERT_TYPES = [
  { id: "wave", label: "Wave-shift alerts", default: true, hint: "AM/PM strokes-gained delta crosses your threshold" },
  { id: "wind", label: "Wind threshold alerts", default: true, hint: "Sustained wind or gust crosses your cutoff" },
  { id: "hedge", label: "Hedge opportunities", default: true, hint: "Cross-book hedges become profitable" },
  { id: "precip", label: "Precipitation alerts", default: false, hint: "Rain starts or stops at your courses" },
  { id: "withdraw", label: "Player withdrawals", default: true, hint: "WD/DNS/DQ on a player in your portfolio" },
];

const TOURNAMENTS = [
  { id: "byron", name: "CJ Cup Byron Nelson", date: "May 21–24", tour: "PGA", default: true },
  { id: "pebble", name: "AT&T Pebble Beach Pro-Am", date: "Jan 29–Feb 1", tour: "PGA", default: true },
  { id: "torrey", name: "Genesis Invitational", date: "Feb 12–15", tour: "PGA", default: false },
  { id: "masters", name: "The Masters", date: "Apr 9–12", tour: "Majors", default: true },
  { id: "pga", name: "PGA Championship", date: "May 14–17", tour: "Majors", default: true },
  { id: "us-open", name: "U.S. Open", date: "Jun 18–21", tour: "Majors", default: true },
  { id: "open", name: "The Open Championship", date: "Jul 16–19", tour: "Majors", default: true },
];

export default function OnboardingPage() {
  const [step, setStep] = useState<StepId>("welcome");
  const [books, setBooks] = useState<string[]>(["DK", "PP"]);
  const [alerts, setAlerts] = useState<string[]>(
    ALERT_TYPES.filter((a) => a.default).map((a) => a.id),
  );
  const [tournaments, setTournaments] = useState<string[]>(
    TOURNAMENTS.filter((t) => t.default).map((t) => t.id),
  );

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  function next() {
    const i = stepIndex + 1;
    if (i < STEPS.length) setStep(STEPS[i].id);
  }
  function back() {
    const i = stepIndex - 1;
    if (i >= 0) setStep(STEPS[i].id);
  }

  return (
    <main className="min-h-screen bg-bg text-text">
      {/* Header */}
      <div className="border-b border-line">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center gap-3">
          <BrandMark size={26} />
          <span
            className="serif-italic"
            style={{ fontSize: 22, letterSpacing: -0.3, fontStyle: "normal", color: "#f0ebe0" }}
          >
            Greenside
          </span>
          <span className="flex-1" />
          <Link
            href="/dashboard"
            className="num text-text-dim hover:text-text"
            style={{ fontSize: 11.5, letterSpacing: 0.4 }}
          >
            Skip setup →
          </Link>
        </div>
      </div>

      {/* Step indicator */}
      <div className="max-w-4xl mx-auto px-6 pt-8">
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => {
            const active = i <= stepIndex;
            return (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <div
                  className="rounded-full transition"
                  style={{
                    width: 22,
                    height: 22,
                    background: active ? "#8ee68e" : "rgba(255,255,255,0.06)",
                    border: active ? "none" : "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  {active && (
                    <svg viewBox="0 0 22 22" width="22" height="22">
                      {i < stepIndex ? (
                        <path
                          d="M6 11l3 3 7-7"
                          stroke="#06140c"
                          strokeWidth="2.5"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ) : (
                        <circle cx="11" cy="11" r="3" fill="#06140c" />
                      )}
                    </svg>
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className="flex-1 h-px"
                    style={{ background: active && i < stepIndex ? "#8ee68e" : "rgba(255,255,255,0.06)" }}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div
          className="num font-semibold uppercase mt-3 text-text-muted"
          style={{ fontSize: 10.5, letterSpacing: 1.2 }}
        >
          Step {stepIndex + 1} of {STEPS.length} · {STEPS[stepIndex].label}
        </div>
      </div>

      {/* Body */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        {step === "welcome" && <WelcomeStep />}
        {step === "books" && (
          <BooksStep selected={books} onChange={setBooks} />
        )}
        {step === "alerts" && (
          <AlertsStep selected={alerts} onChange={setAlerts} />
        )}
        {step === "exposure" && (
          <TournamentsStep
            selected={tournaments}
            onChange={setTournaments}
          />
        )}
        {step === "done" && (
          <DoneStep books={books} alerts={alerts} tournaments={tournaments} />
        )}
      </div>

      {/* Footer nav */}
      <div className="border-t border-line bg-bgDeep">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={back}
            disabled={stepIndex === 0}
            className="num text-text-dim hover:text-text disabled:opacity-30"
            style={{ fontSize: 13 }}
          >
            ← Back
          </button>
          {step !== "done" ? (
            <button
              onClick={next}
              className="font-bold"
              style={{
                background: "#8ee68e",
                color: "#06140c",
                padding: "10px 22px",
                borderRadius: 6,
                fontSize: 13.5,
              }}
            >
              Continue →
            </button>
          ) : (
            <Link
              href="/dashboard"
              className="font-bold"
              style={{
                background: "#8ee68e",
                color: "#06140c",
                padding: "10px 22px",
                borderRadius: 6,
                fontSize: 13.5,
              }}
            >
              Open dashboard →
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

// ─── Step bodies ────────────────────────────────────────────
function WelcomeStep() {
  return (
    <div>
      <span
        className="num font-semibold uppercase"
        style={{ fontSize: 11, letterSpacing: 1.6, color: "#f5c558" }}
      >
        ● Welcome to Greenside
      </span>
      <h1
        className="serif-italic mt-3 mb-4"
        style={{ fontSize: 56, lineHeight: 1.05, letterSpacing: -0.8, fontStyle: "normal" }}
      >
        <em>Three minutes</em> and you&apos;re in.
      </h1>
      <p className="text-text-dim max-w-2xl" style={{ fontSize: 16, lineHeight: 1.55 }}>
        Greenside watches the wind on every PGA Tour course, parses every bet
        confirmation you forward us, and tells you the second your portfolio&apos;s
        EV shifts. The next few screens set up which books you use, what alerts
        you want, and which events you actually care about.
      </p>

      <div className="grid sm:grid-cols-3 gap-4 mt-10">
        <Beat
          label="01"
          title="Books"
          body="Tell us which sportsbooks you use so we know what email confirmations to expect."
        />
        <Beat
          label="02"
          title="Alerts"
          body="Pick which kinds of conditions changes are worth a push notification."
        />
        <Beat
          label="03"
          title="Tournaments"
          body="Follow only the events that matter — your alerts stay quiet otherwise."
        />
      </div>
    </div>
  );
}

function Beat({ label, title, body }: { label: string; title: string; body: string }) {
  return (
    <div className="rounded-[14px] bg-surface-1 border border-line p-5">
      <span
        className="num font-semibold"
        style={{ fontSize: 11, letterSpacing: 1.2, color: "#f5c558" }}
      >
        {label}
      </span>
      <div
        className="serif-italic mt-1 mb-1.5"
        style={{ fontSize: 20, letterSpacing: -0.3, fontStyle: "normal", color: "#f0ebe0" }}
      >
        {title}
      </div>
      <p className="text-text-dim" style={{ fontSize: 13, lineHeight: 1.5 }}>
        {body}
      </p>
    </div>
  );
}

function BooksStep({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(
      selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id],
    );
  }
  return (
    <div>
      <h1
        className="serif-italic mb-3"
        style={{ fontSize: 36, letterSpacing: -0.4, fontStyle: "normal" }}
      >
        <em>Which books</em> do you bet with?
      </h1>
      <p className="text-text-dim max-w-2xl mb-8" style={{ fontSize: 15, lineHeight: 1.55 }}>
        Pick all that apply. We&apos;ll auto-recognize confirmation emails from
        these and surface deep-link affiliates only for books you actually use.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {BOOKS.map((b) => {
          const on = selected.includes(b.id);
          return (
            <button
              key={b.id}
              onClick={() => toggle(b.id)}
              className="rounded-[12px] p-4 text-left transition flex items-center gap-3"
              style={{
                background: on ? "rgba(142,230,142,0.08)" : "rgba(0,0,0,0.18)",
                border: on
                  ? "1px solid rgba(142,230,142,0.4)"
                  : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span
                className="num font-bold inline-flex items-center justify-center"
                style={{
                  width: 40,
                  height: 28,
                  borderRadius: 4,
                  background: b.color,
                  color: "#f0ebe0",
                  fontSize: 11.5,
                  letterSpacing: 0.6,
                }}
              >
                {b.id}
              </span>
              <span className="text-text font-medium" style={{ fontSize: 14 }}>
                {b.name}
              </span>
              <span className="flex-1" />
              <span
                className="rounded-full transition"
                style={{
                  width: 18,
                  height: 18,
                  background: on ? "#8ee68e" : "transparent",
                  border: on ? "none" : "1.5px solid rgba(255,255,255,0.2)",
                }}
              >
                {on && (
                  <svg viewBox="0 0 18 18" width="18" height="18">
                    <path
                      d="M5 9.5l2.5 2.5L13 6"
                      stroke="#06140c"
                      strokeWidth="2.4"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AlertsStep({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(
      selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id],
    );
  }
  return (
    <div>
      <h1
        className="serif-italic mb-3"
        style={{ fontSize: 36, letterSpacing: -0.4, fontStyle: "normal" }}
      >
        <em>Which alerts</em> do you want?
      </h1>
      <p className="text-text-dim max-w-2xl mb-8" style={{ fontSize: 15, lineHeight: 1.55 }}>
        You can tune thresholds in settings later. These defaults work for most
        bettors — silent enough to trust, loud enough to matter.
      </p>

      <div className="space-y-2">
        {ALERT_TYPES.map((a) => {
          const on = selected.includes(a.id);
          return (
            <button
              key={a.id}
              onClick={() => toggle(a.id)}
              className="w-full rounded-[12px] p-4 text-left transition flex items-start gap-4"
              style={{
                background: on ? "rgba(142,230,142,0.06)" : "rgba(0,0,0,0.18)",
                border: on
                  ? "1px solid rgba(142,230,142,0.3)"
                  : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span
                className="rounded-full transition shrink-0 mt-0.5"
                style={{
                  width: 18,
                  height: 18,
                  background: on ? "#8ee68e" : "transparent",
                  border: on ? "none" : "1.5px solid rgba(255,255,255,0.2)",
                }}
              >
                {on && (
                  <svg viewBox="0 0 18 18" width="18" height="18">
                    <path
                      d="M5 9.5l2.5 2.5L13 6"
                      stroke="#06140c"
                      strokeWidth="2.4"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-text font-semibold" style={{ fontSize: 14 }}>
                  {a.label}
                </div>
                <div className="text-text-dim mt-0.5" style={{ fontSize: 12.5 }}>
                  {a.hint}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TournamentsStep({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(
      selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id],
    );
  }
  const grouped = {
    Majors: TOURNAMENTS.filter((t) => t.tour === "Majors"),
    PGA: TOURNAMENTS.filter((t) => t.tour === "PGA"),
  };
  return (
    <div>
      <h1
        className="serif-italic mb-3"
        style={{ fontSize: 36, letterSpacing: -0.4, fontStyle: "normal" }}
      >
        <em>Which events</em> do you follow?
      </h1>
      <p className="text-text-dim max-w-2xl mb-8" style={{ fontSize: 15, lineHeight: 1.55 }}>
        Conditions alerts only fire for tournaments you&apos;re following. Add or
        remove anytime — and we auto-follow any event where you have an open
        bet.
      </p>

      {Object.entries(grouped).map(([group, items]) => (
        <div key={group} className="mb-6">
          <div
            className="num font-semibold uppercase text-text-muted mb-2"
            style={{ fontSize: 10, letterSpacing: 1.2 }}
          >
            {group}
          </div>
          <div className="space-y-2">
            {items.map((t) => {
              const on = selected.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => toggle(t.id)}
                  className="w-full rounded-[10px] p-3 text-left transition flex items-center gap-3"
                  style={{
                    background: on ? "rgba(142,230,142,0.06)" : "rgba(0,0,0,0.18)",
                    border: on
                      ? "1px solid rgba(142,230,142,0.3)"
                      : "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <span
                    className="rounded-full shrink-0"
                    style={{
                      width: 16,
                      height: 16,
                      background: on ? "#8ee68e" : "transparent",
                      border: on ? "none" : "1.5px solid rgba(255,255,255,0.2)",
                    }}
                  />
                  <span className="text-text font-medium" style={{ fontSize: 13.5 }}>
                    {t.name}
                  </span>
                  <span className="flex-1" />
                  <span className="num text-text-muted" style={{ fontSize: 11.5 }}>
                    {t.date}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function DoneStep({
  books,
  alerts,
  tournaments,
}: {
  books: string[];
  alerts: string[];
  tournaments: string[];
}) {
  const [address, setAddress] = useState<string | null>(null);
  const [addressState, setAddressState] = useState<"loading" | "anon" | "unavailable" | "ready">(
    "loading",
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "skipped">("idle");
  const [copied, setCopied] = useState(false);

  // Save the alert prefs and load the forwarding address as soon as we
  // hit the Done step. Both no-op cleanly when Supabase / auth are
  // missing — onboarding still flows for anonymous demo users.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Forwarding address
      try {
        const r = await fetch("/api/account/forwarding", { cache: "no-store" });
        const j = await r.json();
        if (cancelled) return;
        if (!j.configured) setAddressState("unavailable");
        else if (!j.signedIn) setAddressState("anon");
        else if (j.address) {
          setAddress(j.address);
          setAddressState("ready");
        } else setAddressState("unavailable");
      } catch {
        if (!cancelled) setAddressState("unavailable");
      }
      // Save alert prefs (only the IDs the account page knows about)
      const alertMap: Record<string, boolean> = {};
      for (const a of ALERT_TYPES) alertMap[a.id] = alerts.includes(a.id);
      setSaveStatus("saving");
      try {
        const r = await fetch("/api/account/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ alert_prefs: alertMap }),
        });
        if (cancelled) return;
        setSaveStatus(r.ok ? "saved" : "skipped");
      } catch {
        if (!cancelled) setSaveStatus("skipped");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [alerts]);

  async function copy() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard refused */
    }
  }

  return (
    <div>
      <span
        className="num font-semibold uppercase"
        style={{ fontSize: 11, letterSpacing: 1.6, color: "#8ee68e" }}
      >
        ● You&apos;re ready
      </span>
      <h1
        className="serif-italic mt-3 mb-4"
        style={{ fontSize: 48, lineHeight: 1.1, letterSpacing: -0.6, fontStyle: "normal" }}
      >
        <em>The edge</em> starts now.
      </h1>
      <p className="text-text-dim max-w-2xl mb-8" style={{ fontSize: 15, lineHeight: 1.55 }}>
        {saveStatus === "saved" && "Preferences saved to your account."}
        {saveStatus === "saving" && "Saving preferences…"}
        {saveStatus === "skipped" && "Preferences will sync once you sign in."}
        {saveStatus === "idle" && "Hold tight."}
      </p>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Recap label="Books" count={books.length} />
        <Recap label="Alert types" count={alerts.length} />
        <Recap label="Tournaments" count={tournaments.length} />
      </div>

      <div className="rounded-[14px] bg-surface-1 border border-line p-5 mb-4">
        <div
          className="num font-semibold uppercase text-text-muted mb-2"
          style={{ fontSize: 10, letterSpacing: 1.2 }}
        >
          ① Forward your bets
        </div>
        <div className="serif-italic" style={{ fontSize: 18, fontStyle: "normal" }}>
          Your inbound address
        </div>
        <p className="text-text-dim mb-3" style={{ fontSize: 13 }}>
          Forward any DK / FD / PrizePicks / Underdog confirmation here.
          Claude parses each leg into your tickets.
        </p>
        {addressState === "loading" && (
          <div className="text-text-dim" style={{ fontSize: 12 }}>
            Loading…
          </div>
        )}
        {addressState === "anon" && (
          <div className="text-text-dim" style={{ fontSize: 13 }}>
            <Link href="/login" className="text-text underline">
              Sign in
            </Link>{" "}
            to claim your unique address.
          </div>
        )}
        {addressState === "unavailable" && (
          <div className="text-text-dim" style={{ fontSize: 12 }}>
            Inbound parsing isn&apos;t configured on this deploy yet — set
            it up from <code className="num text-text">/dashboard/admin</code>.
          </div>
        )}
        {addressState === "ready" && address && (
          <div
            className="flex items-center gap-2 rounded-[8px] border border-line bg-bg px-3 py-2"
            style={{ fontSize: 13, fontFamily: "ui-monospace, monospace" }}
          >
            <span className="flex-1 truncate text-text">{address}</span>
            <button
              onClick={copy}
              className="rounded-[6px] px-2 py-1 border border-line hover:border-line-strong"
              style={{ fontSize: 11 }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <NextStepCard
          label="② Build your first slip"
          body="Top finishes, matchups, round props, make-cut — full editor with autocomplete."
          href="/dashboard/slip"
        />
        <NextStepCard
          label="③ Watch live"
          body="Full ESPN field with your bet legs decorating the rows live."
          href="/dashboard/leaderboard"
        />
        <NextStepCard
          label="④ Find leverage"
          body="DK ownership history across the 2026 season — chalk vs leverage at a glance."
          href="/dashboard/ownership"
        />
      </div>
    </div>
  );
}

function NextStepCard({
  label,
  body,
  href,
}: {
  label: string;
  body: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[14px] bg-surface-1 border border-line p-4 hover:border-line-strong transition block"
    >
      <div
        className="num font-semibold uppercase text-text-muted mb-1.5"
        style={{ fontSize: 9.5, letterSpacing: 1.2 }}
      >
        {label}
      </div>
      <p className="text-text" style={{ fontSize: 13, lineHeight: 1.4 }}>
        {body}
      </p>
      <div
        className="num mt-3 text-text-dim"
        style={{ fontSize: 11, letterSpacing: 0.4 }}
      >
        Open →
      </div>
    </Link>
  );
}

function Recap({ label, count }: { label: string; count: number }) {
  return (
    <div className="rounded-[14px] bg-surface-1 border border-line p-5">
      <div
        className="num font-semibold uppercase text-text-muted"
        style={{ fontSize: 9.5, letterSpacing: 1.2 }}
      >
        {label}
      </div>
      <div
        className="serif-italic mt-1"
        style={{ fontSize: 56, lineHeight: 0.9, fontStyle: "italic", color: "#8ee68e" }}
      >
        {count}
      </div>
    </div>
  );
}
