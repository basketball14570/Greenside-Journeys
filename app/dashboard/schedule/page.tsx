"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  SCHEDULE,
  SEASON_YEAR,
  statusOf,
  type EventStatus,
} from "@/lib/data/pga-schedule";
import { OWNERSHIP_DATA } from "@/lib/data/ownership";

// 2026 PGA Tour schedule view. Each row is past / live / upcoming,
// auto-derived from today's date. Past events that have ownership
// data attached get a chip linking to the ownership detail.

type Filter = "all" | "live" | "upcoming" | "past" | "majors" | "signature";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "majors", label: "Majors" },
  { id: "signature", label: "Signature" },
];

export default function SchedulePage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  // Build a set of tournament names we have ownership for so we can
  // badge those rows. The ownership dataset uses display names like
  // "Masters 2026"; the schedule has "Masters Tournament". Normalize.
  const ownershipNames = useMemo(() => {
    const set = new Set<string>();
    for (const t of Object.keys(OWNERSHIP_DATA)) {
      set.add(normalize(t));
    }
    return set;
  }, []);

  const now = new Date();

  const rows = useMemo(() => {
    return SCHEDULE.map((e) => ({
      event: e,
      status: statusOf(e, now),
      hasOwnership: matchOwnership(e.name, ownershipNames),
    }))
      .filter((r) => {
        if (q && !r.event.name.toLowerCase().includes(q.toLowerCase())) return false;
        if (filter === "all") return true;
        if (filter === "majors") return r.event.type === "major";
        if (filter === "signature")
          return r.event.type === "signature" || r.event.type === "sig_cut";
        return r.status === filter;
      });
  }, [filter, q, ownershipNames]);

  const counts = useMemo(() => {
    let past = 0, live = 0, upcoming = 0;
    for (const e of SCHEDULE) {
      const s = statusOf(e, now);
      if (s === "past") past++;
      else if (s === "live") live++;
      else upcoming++;
    }
    return { past, live, upcoming };
  }, []);

  return (
    <div className="px-5 lg:px-8 py-6 space-y-5 max-w-5xl mx-auto">
      <header>
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
        >
          ● {SEASON_YEAR} PGA Tour
        </span>
        <h1
          className="serif-italic mt-1.5"
          style={{ fontSize: 36, letterSpacing: -0.4 }}
        >
          <em>Season schedule.</em>
        </h1>
        <p className="text-text-dim mt-2 max-w-2xl" style={{ fontSize: 14 }}>
          {SCHEDULE.length} events · {counts.past} played · {counts.live} live ·{" "}
          {counts.upcoming} upcoming. Past events with ownership data attached
          link straight to the ownership browser.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          placeholder="Filter tournament…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 min-w-[200px] rounded-[8px] border border-line bg-surface-1 px-3 py-2 text-text"
          style={{ fontSize: 13 }}
        />
        {FILTERS.map((f) => {
          const active = f.id === filter;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="num font-semibold uppercase"
              style={{
                padding: "5px 10px",
                borderRadius: 5,
                fontSize: 10.5,
                letterSpacing: 0.6,
                color: active ? "#f0ebe0" : "#a8b3ac",
                background: active ? "#1e4030" : "transparent",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-[14px] border border-line overflow-hidden">
        <div
          className="grid gap-2 px-4 py-2.5 num font-semibold uppercase text-text-muted border-b border-line"
          style={{
            gridTemplateColumns: "120px 1.6fr 1.5fr 100px 70px",
            fontSize: 9.5,
            letterSpacing: 1.1,
            background: "rgba(0,0,0,0.18)",
          }}
        >
          <span>Dates</span>
          <span>Tournament</span>
          <span>Course · City</span>
          <span className="text-right">Type</span>
          <span className="text-right">Data</span>
        </div>
        {rows.map(({ event, status, hasOwnership }) => (
          <Row
            key={event.id}
            event={event}
            status={status}
            hasOwnership={hasOwnership}
          />
        ))}
        {rows.length === 0 && (
          <div className="px-4 py-8 text-center text-text-dim" style={{ fontSize: 13 }}>
            No events match.
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  event,
  status,
  hasOwnership,
}: {
  event: (typeof SCHEDULE)[number];
  status: EventStatus;
  hasOwnership: string | null;
}) {
  const isMajor = event.type === "major";
  const isSig = event.type === "signature" || event.type === "sig_cut";
  return (
    <div
      className="grid gap-2 px-4 py-3 items-center border-b border-line/50 last:border-b-0"
      style={{
        gridTemplateColumns: "120px 1.6fr 1.5fr 100px 70px",
        fontSize: 13,
        background:
          status === "live"
            ? "rgba(142,230,142,0.06)"
            : isMajor && status === "upcoming"
              ? "rgba(245,197,88,0.04)"
              : "transparent",
        borderLeft:
          status === "live"
            ? "2px solid #8ee68e"
            : "2px solid transparent",
      }}
    >
      <div className="num" style={{ fontSize: 11.5, color: statusColor(status) }}>
        {formatDates(event.startDate, event.endDate)}
        <div className="text-text-muted" style={{ fontSize: 9.5, letterSpacing: 0.6, marginTop: 2 }}>
          {status.toUpperCase()}
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-text font-medium truncate flex items-center gap-2">
          {event.name}
          {isMajor && <Pill color="#f5c558" label="MAJOR" />}
        </div>
      </div>
      <div className="text-text-dim truncate" style={{ fontSize: 12.5 }}>
        {event.course} · {event.city}
      </div>
      <div className="text-right">
        <TypeBadge type={event.type} signature={isSig} />
      </div>
      <div className="text-right">
        {hasOwnership ? (
          <Link
            href={`/dashboard/ownership`}
            className="num uppercase"
            style={{
              fontSize: 10,
              letterSpacing: 0.8,
              color: "#7fd49a",
              background: "rgba(127,212,154,0.13)",
              padding: "2px 7px",
              borderRadius: 4,
            }}
            title={`Ownership data: ${hasOwnership}`}
          >
            Own
          </Link>
        ) : (
          <span className="num text-text-muted" style={{ fontSize: 10 }}>
            —
          </span>
        )}
      </div>
    </div>
  );
}

function Pill({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="num uppercase"
      style={{
        fontSize: 9,
        letterSpacing: 0.8,
        color,
        background: `${color}1a`,
        padding: "1px 6px",
        borderRadius: 3,
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  );
}

function TypeBadge({ type, signature }: { type: string; signature: boolean }) {
  const label =
    type === "signature"
      ? "Signature"
      : type === "sig_cut"
        ? "Sig + cut"
        : type === "full_cut"
          ? "Full"
          : type === "major"
            ? "Major"
            : type === "limited"
              ? "Limited"
              : type === "alternate"
                ? "Alt"
                : type;
  const color = signature || type === "major" ? "#8ee68e" : "#7cc0e8";
  return (
    <span
      className="num uppercase"
      style={{
        fontSize: 9.5,
        letterSpacing: 0.7,
        color,
        background: `${color}1a`,
        padding: "2px 7px",
        borderRadius: 4,
      }}
    >
      {label}
    </span>
  );
}

function statusColor(s: EventStatus): string {
  return s === "live" ? "#7fd49a" : s === "upcoming" ? "#f5c558" : "#a8b3ac";
}

function formatDates(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const sameMonth = s.getUTCMonth() === e.getUTCMonth();
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  if (sameMonth) {
    return `${fmt(s).split(" ")[0]} ${s.getUTCDate()}–${e.getUTCDate()}`;
  }
  return `${fmt(s)} – ${fmt(e)}`;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Returns the ownership dataset's key for this event, or null if absent.
function matchOwnership(eventName: string, ownershipNames: Set<string>): string | null {
  const candidates = [
    eventName,
    `${eventName} 2026`,
    eventName.replace(/^the /i, ""),
    eventName.replace(/championship/i, "Ch.").trim(),
  ];
  for (const c of candidates) {
    if (ownershipNames.has(normalize(c))) return c;
  }
  // Fuzzy: any ownership key that contains the event's first significant word
  const firstWord = eventName.split(/\s+/).find((w) => w.length > 3);
  if (firstWord) {
    const target = normalize(firstWord);
    for (const k of ownershipNames) {
      if (k.includes(target)) return k;
    }
  }
  return null;
}
