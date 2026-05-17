"use client";

import { useEffect, useState } from "react";
import { StatusDot } from "./primitives";
import { fetchLeaderboard, type LeaderboardSnapshot } from "@/lib/espn-leaderboard";
import { getActiveEvent, findEventByName, type PgaEvent } from "@/lib/data/pga-schedule";

// Live event strap — replaces the static "Quail Hollow R2 Live" hardcode.
// Order of preference for "what tournament are we showing":
//   1. ESPN's active scoreboard event (most authoritative — knows mid-round)
//   2. PGA Tour static schedule via getActiveEvent (knows future weeks)
//   3. Nothing — render a quiet "No active event" state
//
// Refreshes ESPN every 60s. The static schedule fallback is purely
// computed from `new Date()` so it's always fresh.

type Strap = {
  name: string;
  course: string;
  city: string | null;
  round: string;
  statusLabel: string;
  statusColor: string;
  cutLine: string | null;
};

export function LiveEventStrap() {
  const [strap, setStrap] = useState<Strap>(() => fromSchedule(getActiveEvent()));

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const snap = await fetchLeaderboard();
        if (cancelled) return;
        const next = fromSnapshot(snap);
        if (next) setStrap(next);
      } catch {
        // Network failed — leave the schedule-derived strap in place.
      }
    }
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="flex items-center gap-6 px-8 py-3.5 border-b border-line">
      <div className="flex flex-col gap-0.5">
        <span
          className="num font-semibold uppercase text-text-muted"
          style={{ fontSize: 9.5, letterSpacing: 1.3 }}
        >
          This Week · PGA Tour
        </span>
        <span
          className="serif-italic"
          style={{
            fontSize: 22,
            color: "#f0ebe0",
            letterSpacing: -0.3,
            fontStyle: "normal",
          }}
        >
          {strap.name}
        </span>
      </div>
      <div className="h-7 w-px bg-line" />
      <Mini label="Round" value={strap.round} />
      <Mini
        label="Status"
        value={
          <>
            <StatusDot status={strap.statusLabel.toLowerCase().includes("live") ? "live" : "pending"} />
            <span className="font-semibold" style={{ color: strap.statusColor }}>
              {strap.statusLabel}
            </span>
          </>
        }
      />
      {strap.cutLine && <Mini label="Cut Line" value={strap.cutLine} />}
      <Mini
        label="Course"
        value={
          strap.city
            ? `${strap.course} · ${strap.city}`
            : strap.course
        }
      />
    </div>
  );
}

function Mini({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className="num font-semibold uppercase text-text-muted"
        style={{ fontSize: 9, letterSpacing: 1.2 }}
      >
        {label}
      </span>
      <span className="flex items-center gap-1.5 text-text" style={{ fontSize: 13 }}>
        {value}
      </span>
    </div>
  );
}

function fromSnapshot(snap: LeaderboardSnapshot): Strap | null {
  if (!snap.event) return null;
  const e = snap.event;
  const sched = findEventByName(e.name);
  const round = e.period > 0 ? `${e.period} of 4` : "—";

  let statusLabel = "Pre-round";
  let statusColor = "#a8b3ac";
  if (e.state === "in") {
    statusLabel = e.period > 0 ? `R${e.period} Live` : "Live";
    statusColor = "#8ee68e";
  } else if (e.state === "post") {
    statusLabel = "Final";
    statusColor = "#7cc0e8";
  } else if (e.state === "pre") {
    statusLabel = "Upcoming";
    statusColor = "#f5c558";
  }

  return {
    name: e.name,
    course: e.course ?? sched?.course ?? "—",
    city: e.location ?? sched?.city ?? null,
    round,
    statusLabel,
    statusColor,
    cutLine: null,
  };
}

function fromSchedule(event: PgaEvent | null): Strap {
  if (!event) {
    return {
      name: "PGA Tour",
      course: "—",
      city: null,
      round: "—",
      statusLabel: "Off-season",
      statusColor: "#a8b3ac",
      cutLine: null,
    };
  }
  // Best-effort: compare today to start/end to pick a label.
  const now = new Date();
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  end.setUTCHours(23, 59, 59, 999);
  const isLive = now >= start && now <= end;
  const isUpcoming = now < start;
  return {
    name: event.name,
    course: event.course,
    city: event.city,
    round: isLive
      ? `~${Math.min(4, Math.ceil((now.getTime() - start.getTime()) / 86_400_000))} of 4`
      : "—",
    statusLabel: isLive ? "Live" : isUpcoming ? "Upcoming" : "Final",
    statusColor: isLive ? "#8ee68e" : isUpcoming ? "#f5c558" : "#7cc0e8",
    cutLine: null,
  };
}
