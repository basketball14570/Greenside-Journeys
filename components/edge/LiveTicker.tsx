"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  type LeaderboardPlayer,
} from "@/lib/espn-leaderboard";
import { useLeaderboard } from "@/lib/leaderboard-context";
import { useStarredGolfers, normalizePlayerKey } from "@/lib/starred-golfers";
import { courseSlugFor, courseTzFor } from "@/lib/weather/forecast";

// ESPN-style live scores ticker. A thin, full-width strip that sits under
// the app chrome on every dashboard page:
//   • during play (state "in"/"post"): scrolls the leaderboard — position,
//     player, to-par — with the user's starred golfers pulled to the front
//     and highlighted.
//   • pre-tournament (state "pre"): scrolls notable tee times so the strip
//     is still real, useful content rather than an empty bar.
// Renders nothing when there's no field at all, so we never show filler.

const UNDER = "#7fd49a";
const OVER = "#e57373";
const EVEN = "#c7cfc9";

function toParColor(p: LeaderboardPlayer): string {
  if (p.totalScoreNum === null) return EVEN;
  if (p.totalScoreNum < 0) return UNDER;
  if (p.totalScoreNum > 0) return OVER;
  return EVEN;
}

type TickItem = {
  key: string;
  slug?: string;
  starred: boolean;
} & (
  | { kind: "score"; pos: string; name: string; toPar: string; color: string; thru: string | null }
  | { kind: "tee"; name: string; tee: string }
);

export function LiveTicker() {
  const { snapshot: snap } = useLeaderboard();
  const { stars } = useStarredGolfers();

  const { items, label, live } = useMemo(() => {
    if (!snap?.event || snap.players.length === 0) {
      return { items: [] as TickItem[], label: "", live: false };
    }
    const state = snap.event.state;
    const isStar = (name: string) => stars.has(normalizePlayerKey(name));

    // Pre-tournament: notable tee times, earliest first, in venue-local time.
    if (state === "pre") {
      const slug = snap.event.course ? courseSlugFor(snap.event.course) : null;
      const tz = slug ? courseTzFor(slug) : null;
      const withTee = snap.players.filter((p) => p.teeTime);
      const ordered = [
        ...withTee.filter((p) => isStar(p.name)),
        ...withTee.filter((p) => !isStar(p.name)),
      ].slice(0, 28);
      const items: TickItem[] = ordered.map((p) => ({
        kind: "tee",
        key: p.id,
        name: p.shortName || p.name,
        tee: formatTee(p.teeTime as string, tz),
        starred: isStar(p.name),
      }));
      const r = snap.event.period || 1;
      return { items, label: `R${r} Tee Times`, live: false };
    }

    // In progress / final: leaderboard, starred pulled to the front.
    const active = snap.players.filter((p) => !p.isCut);
    const ranked = [...active].sort(
      (a, b) => (a.posNum ?? 9999) - (b.posNum ?? 9999),
    );
    const top = ranked.slice(0, 25);
    const starredOutside = ranked
      .slice(25)
      .filter((p) => isStar(p.name));
    const ordered = [
      ...top.filter((p) => isStar(p.name)),
      ...starredOutside,
      ...top.filter((p) => !isStar(p.name)),
    ];
    const items: TickItem[] = ordered.map((p) => ({
      kind: "score",
      key: p.id,
      pos: p.posDisplay || "—",
      name: p.shortName || p.name,
      toPar: p.totalToPar ?? "E",
      color: toParColor(p),
      thru:
        p.todayLine?.complete
          ? "F"
          : p.todayLine?.thru
            ? String(p.todayLine.thru)
            : null,
      starred: isStar(p.name),
    }));
    const r = snap.event.period || 1;
    const label = state === "post" ? "Final" : `R${r} Live`;
    return { items, label, live: state === "in" };
  }, [snap, stars]);

  if (items.length === 0) return null;

  // Duration scales with item count so density stays readable regardless of
  // field size (~2.2s per item across the single (un-duplicated) track).
  const durationSec = Math.max(30, Math.round(items.length * 2.2));

  return (
    <div
      className="relative w-full overflow-hidden border-b border-line"
      style={{ background: "linear-gradient(180deg,#0c1812,#0a130e)" }}
    >
      <div className="flex items-stretch">
        {/* Sticky event label chip */}
        <Link
          href="/dashboard/leaderboard"
          className="shrink-0 flex items-center gap-2 px-3.5 z-10"
          style={{
            background: "linear-gradient(90deg,#13261b,#0c1812)",
            borderRight: "1px solid rgba(127,212,154,0.22)",
          }}
        >
          <span
            className={`inline-block rounded-full ${live ? "gs-status-pulse" : ""}`}
            style={{
              width: 6,
              height: 6,
              background: live ? UNDER : "#f5c558",
              boxShadow: live ? `0 0 6px ${UNDER}` : "none",
            }}
          />
          <span
            className="num font-bold uppercase"
            style={{ fontSize: 10, letterSpacing: 1, color: live ? UNDER : "#f5c558" }}
          >
            {label}
          </span>
        </Link>

        {/* Marquee track — duplicated for a seamless loop */}
        <div className="relative flex-1 min-w-0 overflow-hidden py-2">
          <div
            className="gs-ticker-track"
            style={{ ["--gs-ticker-dur" as string]: `${durationSec}s` }}
          >
            <TickRow items={items} />
            <TickRow items={items} ariaHidden />
          </div>
          {/* edge fades */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0"
            style={{ width: 28, background: "linear-gradient(90deg,#0a130e,transparent)" }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0"
            style={{ width: 28, background: "linear-gradient(270deg,#0a130e,transparent)" }}
          />
        </div>
      </div>
    </div>
  );
}

function TickRow({ items, ariaHidden }: { items: TickItem[]; ariaHidden?: boolean }) {
  return (
    <div className="inline-flex items-center" aria-hidden={ariaHidden}>
      {items.map((it, i) => (
        <span
          key={`${it.key}-${i}`}
          className="inline-flex items-center gap-1.5 px-3.5"
          style={{
            borderRight: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {it.starred && (
            <span style={{ color: "#f5c558", fontSize: 10, lineHeight: 1 }}>★</span>
          )}
          {it.kind === "score" ? (
            <>
              <span
                className="num"
                style={{ fontSize: 10.5, color: "#7e8a83", letterSpacing: 0.3 }}
              >
                {it.pos}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: it.starred ? 700 : 600,
                  color: it.starred ? "#f0ebe0" : "#d4dbd6",
                }}
              >
                {it.name}
              </span>
              <span className="num font-bold" style={{ fontSize: 12, color: it.color }}>
                {it.toPar}
              </span>
              {it.thru && (
                <span className="num" style={{ fontSize: 9.5, color: "#6c7a72" }}>
                  {it.thru === "F" ? "F" : `thru ${it.thru}`}
                </span>
              )}
            </>
          ) : (
            <>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: it.starred ? 700 : 600,
                  color: it.starred ? "#f0ebe0" : "#d4dbd6",
                }}
              >
                {it.name}
              </span>
              <span className="num font-semibold" style={{ fontSize: 11, color: "#f5c558" }}>
                {it.tee}
              </span>
            </>
          )}
        </span>
      ))}
    </div>
  );
}

// ISO tee time → compact "7:51a" in the venue's timezone when known (so a
// viewer in another zone still sees the real local tee time), else the
// viewer's local time as a fallback.
function formatTee(iso: string, tz: string | null): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...(tz ? { timeZone: tz } : {}),
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const h = get("hour");
  const m = get("minute");
  const ap = get("dayPeriod").toLowerCase().startsWith("p") ? "p" : "a";
  return `${h}:${m}${ap}`;
}
