"use client";

import { useEffect, useState } from "react";
import { StatusDot } from "./primitives";
import { fetchLeaderboard, type LeaderboardSnapshot } from "@/lib/espn-leaderboard";
import { getActiveEvent, findEventByName, SCHEDULE, statusOf, type PgaEvent } from "@/lib/data/pga-schedule";
import { courseSlugFor } from "@/lib/weather/forecast";

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
  const [imgOk, setImgOk] = useState(false);
  // Course photos may be uploaded as jpg or png — walk candidate extensions
  // on error so the filename's format doesn't have to match a hardcode.
  const [extIdx, setExtIdx] = useState(0);

  const slug = courseSlugFor(strap.course);
  const exts = ["jpg", "png", "jpeg", "webp"];
  const imgSrc =
    slug && extIdx < exts.length ? `/courses/${slug}.${exts[extIdx]}` : null;

  // A new course means a new candidate photo — reset until it loads so a
  // stale image never lingers behind the wrong tournament.
  useEffect(() => {
    setImgOk(false);
    setExtIdx(0);
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const snap = await fetchLeaderboard();
        if (cancelled) return;
        const next = fromSnapshot(snap);
        if (!next) return;
        // ESPN often returns the just-finished event for several days after
        // Sunday. If that event is Final and the schedule has the next one
        // starting within a week, prefer the upcoming one — that's what the
        // bettor cares about on a Mon/Tue/Wed.
        if (next.statusLabel === "Final") {
          const upcoming = nextUpcomingWithinDays(7);
          if (upcoming) {
            setStrap(fromSchedule(upcoming));
            return;
          }
        }
        setStrap(next);
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
    <div className="relative overflow-hidden border-b border-line">
      {imgSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgSrc}
          alt=""
          aria-hidden
          onLoad={() => setImgOk(true)}
          onError={() => setExtIdx((i) => i + 1)}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
          style={{ objectPosition: "center 42%", opacity: imgOk ? 1 : 0 }}
        />
      )}
      {/* Legibility wash — heavier on the left where the title sits, fading
          right so the photo breathes. Only shows once a photo loads. */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-700"
        style={{
          opacity: imgOk ? 1 : 0,
          background:
            "linear-gradient(90deg, rgba(7,18,11,0.95) 0%, rgba(7,18,11,0.84) 38%, rgba(7,18,11,0.6) 72%, rgba(7,18,11,0.42) 100%)",
        }}
      />
      <div
        className="relative flex items-center gap-6 px-8 transition-[padding] duration-300"
        style={{ paddingTop: imgOk ? 22 : 14, paddingBottom: imgOk ? 22 : 14 }}
      >
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

function nextUpcomingWithinDays(days: number): PgaEvent | null {
  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 86_400_000);
  for (const e of SCHEDULE) {
    if (statusOf(e, now) !== "upcoming") continue;
    if (new Date(e.startDate) <= cutoff) return e;
  }
  return null;
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
