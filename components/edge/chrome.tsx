import Link from "next/link";
import { BrandMark, StatusDot } from "./primitives";
import UserChip from "./UserChip";
import { SearchChip } from "./SearchChip";
import { MoreDropdown } from "./MoreDropdown";
import { getActiveEvent, statusOf } from "@/lib/data/pga-schedule";

// ─── Mobile top bar (settings + bell) ───────────────────────
export function MobileTopBar() {
  return (
    <div className="flex items-center justify-between px-5 pt-2 pb-3.5">
      <Link href="/dashboard" className="flex items-center gap-2">
        <BrandMark size={26} />
        <span
          className="serif-italic"
          style={{ fontSize: 22, color: "#f0ebe0", letterSpacing: -0.3, fontStyle: "normal" }}
        >
          Greenside
        </span>
      </Link>
      <div className="flex items-center gap-2.5">
        <IconButton>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.36-6.36l-.71.71M6.34 17.66l-.71.71m12.02 0l-.71-.71M6.34 6.34l-.71-.71"
              stroke="#a8b3ac"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="12" cy="12" r="3.5" stroke="#a8b3ac" strokeWidth="1.5" />
          </svg>
        </IconButton>
        <IconButton notify>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9"
              stroke="#a8b3ac"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M10 21a2 2 0 004 0" stroke="#a8b3ac" strokeWidth="1.5" />
          </svg>
        </IconButton>
      </div>
    </div>
  );
}

function IconButton({
  children,
  notify,
}: {
  children: React.ReactNode;
  notify?: boolean;
}) {
  return (
    <span className="relative inline-flex items-center justify-center w-8 h-8 rounded-full bg-surface-2 border border-line">
      {children}
      {notify && (
        <span
          className="absolute rounded-full bg-amber"
          style={{
            top: 5,
            right: 6,
            width: 7,
            height: 7,
            boxShadow: "0 0 0 2px #0a1f14",
          }}
        />
      )}
    </span>
  );
}

// ─── Tournament strap ───────────────────────────────────────
// Dynamic mobile event strap. Reads from the static PGA Tour schedule
// (lib/data/pga-schedule) so it follows the calendar automatically —
// switches to the next week's tournament after Sunday, flips to "Live"
// when Thursday rolls around.
export function EventStrap() {
  const event = getActiveEvent();
  if (!event) return null;
  const status = statusOf(event);
  const statusLabel =
    status === "live" ? "LIVE" : status === "upcoming" ? "UPCOMING" : "FINAL";
  const cadenceLabel =
    status === "live"
      ? "This Week"
      : status === "upcoming"
        ? "Up Next"
        : "Just Finished";
  const accent =
    status === "live" ? "#8ee68e" : status === "upcoming" ? "#f5c558" : "#7cc0e8";
  return (
    <div className="mx-5 mb-4 p-3.5 rounded-xl bg-surface-1 border border-line flex items-center justify-between">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span
          className="num font-semibold uppercase text-text-muted"
          style={{ fontSize: 9.5, letterSpacing: 1.3 }}
        >
          {cadenceLabel} · {event.course}
        </span>
        <span
          className="serif-italic truncate"
          style={{ fontSize: 18, color: "#f0ebe0", letterSpacing: -0.2, fontStyle: "normal" }}
        >
          {event.name}
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <StatusDot status={status === "live" ? "live" : "pending"} />
        <span
          className="num font-semibold"
          style={{ fontSize: 10.5, color: accent, letterSpacing: 0.8 }}
        >
          {statusLabel}
        </span>
      </div>
    </div>
  );
}

// ─── Mobile bottom nav ──────────────────────────────────────
const TABS = [
  { id: "home", href: "/dashboard", label: "Today" },
  { id: "live", href: "/dashboard/live", label: "Live" },
  { id: "dfs", href: "/dashboard/dfs", label: "DFS" },
  { id: "weather", href: "/dashboard/weather", label: "Weather" },
  { id: "leaderboard", href: "/dashboard/leaderboard", label: "Leaders" },
  { id: "guide", href: "/dashboard/guide", label: "Course" },
] as const;

const ICONS: Record<string, (c: string) => React.ReactNode> = {
  home: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 11l9-7 9 7v9a2 2 0 01-2 2h-4v-6h-6v6H5a2 2 0 01-2-2v-9z"
        stroke={c}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  ),
  bets: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="18" height="12" rx="2" stroke={c} strokeWidth="1.7" />
      <path d="M8 10v4M12 10v4M16 10v4" stroke={c} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  live: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3.5" fill={c} />
      <circle cx="12" cy="12" r="7" stroke={c} strokeWidth="1.5" opacity="0.45" />
      <circle cx="12" cy="12" r="10" stroke={c} strokeWidth="1.2" opacity="0.2" />
    </svg>
  ),
  ask: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.83L3 20l1.17-4.5A7.6 7.6 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        stroke={c}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="8.5" cy="12" r="0.9" fill={c} />
      <circle cx="12" cy="12" r="0.9" fill={c} />
      <circle cx="15.5" cy="12" r="0.9" fill={c} />
    </svg>
  ),
  dfs: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M4 18V8m6 10V4m6 14v-7m4 7H4" stroke={c} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  guide: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 21V5l8-2v18M5 9l8 2M19 11v10M19 11l-3-3v6l3-3z"
        stroke={c}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  ),
  leaderboard: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="13" width="4.5" height="7" stroke={c} strokeWidth="1.7" strokeLinejoin="round" />
      <rect x="9.75" y="8" width="4.5" height="12" stroke={c} strokeWidth="1.7" strokeLinejoin="round" />
      <rect x="16" y="11" width="4.5" height="9" stroke={c} strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  ),
  weather: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 15a4 4 0 010-8 6 6 0 0111-2 5 5 0 011 9.5"
        stroke={c}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M9 17l-1 3M13 17l-1 3M17 17l-1 3" stroke={c} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  me: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke={c} strokeWidth="1.7" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" stroke={c} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
};

// Mobile tab bar. Was at the bottom originally; moved to the top under
// the brand bar because users said the bottom placement was hard to
// find. Sticky so it stays visible while scrolling, with a subtle blur
// so content underneath shows through faintly.
export function MobileBottomNav({ active }: { active: string }) {
  return (
    <div
      className="sticky top-0 z-30 flex justify-around px-2 pt-1.5 pb-2 border-b border-line bg-bgDeep"
      style={{ backdropFilter: "blur(6px)" }}
    >
      {TABS.map((t) => {
        const isActive = t.id === active;
        const c = isActive ? "#8ee68e" : "#6c7a72";
        return (
          <Link
            key={t.id}
            href={t.href}
            className="flex flex-col items-center gap-0.5 flex-1"
          >
            {ICONS[t.id](c)}
            <span
              className="num font-semibold uppercase"
              style={{ fontSize: 9.5, letterSpacing: 0.6, color: c }}
            >
              {t.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Desktop app bar ────────────────────────────────────────
//
// Primary nav — the six tabs that earn screen real estate every session.
// Showdown + Slip + Parlay used to be top-level; they were consolidated
// because each was a different view of "your bet". Live, Tickets, and
// Today now own that surface and host the parlay/showdown/slip flows
// as sections or filters inside them.
const PRIMARY_TABS = [
  { label: "Today", href: "/dashboard" },
  { label: "Tickets", href: "/dashboard/bets" },
  { label: "Live", href: "/dashboard/live" },
  { label: "Weather", href: "/dashboard/weather" },
  { label: "Odds", href: "/dashboard/odds" },
  { label: "Leaderboard", href: "/dashboard/leaderboard" },
  { label: "Ask", href: "/dashboard/ask" },
];

// DFS submenu — surfaces the optimizer, ownership browser, and other
// fantasy tools under one dropdown. Anchor remains "/dashboard/dfs" so
// the top-level click still works.
const DFS_TABS = [
  { label: "Optimizer", href: "/dashboard/dfs" },
  { label: "Cut Sweat", href: "/dashboard/dfs/cut-sweat" },
  { label: "Ownership", href: "/dashboard/ownership" },
];

// More dropdown — everything still accessible, just not occupying the
// top bar. Order = how often we expect users to want them, roughly.
const MORE_TABS = [
  { label: "Course Guide", href: "/dashboard/guide" },
  { label: "Schedule", href: "/dashboard/schedule" },
  { label: "Hedge", href: "/dashboard/hedge" },
  { label: "Backtest", href: "/dashboard/backtest" },
  { label: "Model", href: "/dashboard/model" },
  { label: "Bankroll", href: "/dashboard/account" },
  { label: "Admin", href: "/dashboard/admin" },
];

export function DesktopAppBar({ active = "Today" }: { active?: string }) {
  return (
    <div className="flex items-center gap-7 px-8 py-3.5 border-b border-line bg-bgDeep">
      <Link href="/dashboard" className="flex items-center gap-2.5">
        <BrandMark size={26} />
        <span
          className="serif-italic"
          style={{ fontSize: 22, color: "#f0ebe0", letterSpacing: -0.3, fontStyle: "normal" }}
        >
          Greenside
        </span>
      </Link>
      <div className="flex gap-1 items-center">
        {PRIMARY_TABS.map((t) => {
          const isActive = t.label === active;
          return (
            <Link
              key={t.label}
              href={t.href}
              className={`px-3 py-1.5 rounded-md text-sm transition ${
                isActive
                  ? "bg-surface-2 text-text font-semibold"
                  : "text-text-dim hover:text-text"
              }`}
              style={{ fontSize: 13.5 }}
            >
              {t.label}
            </Link>
          );
        })}
        <MoreDropdown label="DFS" active={active} tabs={DFS_TABS} />
        <MoreDropdown active={active} tabs={MORE_TABS} />
      </div>
      <span className="flex-1" />
      <SearchChip />
      <UserChip />
    </div>
  );
}

// ─── Desktop event strap ────────────────────────────────────
// Thin re-export so older pages (players/, courses/) keep working but get
// the live-data treatment instead of the stale "Quail Hollow R2" hardcode.
export { LiveEventStrap as DesktopEventStrap } from "./LiveEventStrap";

function Mini({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className="num font-semibold uppercase text-text-muted"
        style={{ fontSize: 9, letterSpacing: 1.1 }}
      >
        {label}
      </span>
      <span
        className="text-text inline-flex items-center gap-1.5"
        style={{ fontSize: 13 }}
      >
        {value}
      </span>
    </div>
  );
}
