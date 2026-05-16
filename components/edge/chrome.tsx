import Link from "next/link";
import { BrandMark, StatusDot } from "./primitives";
import UserChip from "./UserChip";

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
export function EventStrap() {
  return (
    <div className="mx-5 mb-4 p-3.5 rounded-xl bg-surface-1 border border-line flex items-center justify-between">
      <div className="flex flex-col gap-0.5">
        <span
          className="num font-semibold uppercase text-text-muted"
          style={{ fontSize: 9.5, letterSpacing: 1.3 }}
        >
          This Week · Round 2
        </span>
        <span
          className="serif-italic"
          style={{ fontSize: 18, color: "#f0ebe0", letterSpacing: -0.2, fontStyle: "normal" }}
        >
          Quail Hollow Championship
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <StatusDot status="live" />
        <span
          className="num font-semibold"
          style={{ fontSize: 10.5, color: "#8ee68e", letterSpacing: 0.8 }}
        >
          R2 LIVE
        </span>
      </div>
    </div>
  );
}

// ─── Mobile bottom nav ──────────────────────────────────────
const TABS = [
  { id: "home", href: "/dashboard", label: "Today" },
  { id: "bets", href: "/dashboard/bets", label: "Tickets" },
  { id: "ask", href: "/dashboard/ask", label: "Ask" },
  { id: "dfs", href: "/dashboard/dfs", label: "DFS" },
  { id: "course", href: "/dashboard/conditions", label: "Course" },
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
  course: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 21V5l8-2v18M5 9l8 2M19 11v10M19 11l-3-3v6l3-3z"
        stroke={c}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  ),
  me: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke={c} strokeWidth="1.7" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" stroke={c} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
};

export function MobileBottomNav({ active }: { active: string }) {
  return (
    <div className="flex justify-around px-2 pt-2.5 pb-7 border-t border-line bg-bgDeep">
      {TABS.map((t) => {
        const isActive = t.id === active;
        const c = isActive ? "#8ee68e" : "#6c7a72";
        return (
          <Link
            key={t.id}
            href={t.href}
            className="flex flex-col items-center gap-1 flex-1"
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
const DESKTOP_TABS = [
  { label: "Today", href: "/dashboard" },
  { label: "Tickets", href: "/dashboard/bets" },
  { label: "Ask", href: "/dashboard/ask" },
  { label: "DFS Optimizer", href: "/dashboard/dfs" },
  { label: "Course Lab", href: "/dashboard/conditions" },
  { label: "Leaderboard", href: "/dashboard/leaderboard" },
  { label: "Slip", href: "/dashboard/slip" },
  { label: "Showdown", href: "/dashboard/showdown" },
  { label: "Previews", href: "/dashboard/preview" },
  { label: "Backtest", href: "/dashboard/backtest" },
  { label: "Model", href: "/dashboard/model" },
  { label: "Newsletter", href: "/dashboard/newsletter" },
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
      <div className="flex gap-1">
        {DESKTOP_TABS.map((t) => {
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
      </div>
      <span className="flex-1" />
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-1 border border-line num text-text-dim"
        style={{ fontSize: 11.5, letterSpacing: 0.4 }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="#6c7a72" strokeWidth="2" />
          <path d="M20 20l-3.5-3.5" stroke="#6c7a72" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Search players, books, markets…
        <span className="text-text-muted ml-3">⌘K</span>
      </div>
      <UserChip />
    </div>
  );
}

// ─── Desktop event strap ────────────────────────────────────
export function DesktopEventStrap() {
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
          style={{ fontSize: 22, color: "#f0ebe0", letterSpacing: -0.3, fontStyle: "normal" }}
        >
          Quail Hollow Championship
        </span>
      </div>
      <div className="h-7 w-px bg-line" />
      <Mini label="Round" value="2 of 4" />
      <Mini
        label="Status"
        value={
          <>
            <StatusDot status="live" />
            <span className="font-semibold" style={{ color: "#8ee68e" }}>
              R2 Live
            </span>
          </>
        }
      />
      <Mini label="Cut Line" value="−1 (proj.)" />
      <Mini label="Course" value="Quail Hollow Club · Charlotte, NC" />
      <span className="flex-1" />
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-md"
        style={{ background: "rgba(245,197,88,0.1)", border: "1px solid rgba(245,197,88,0.27)" }}
      >
        <span
          className="rounded-full bg-amber"
          style={{ width: 6, height: 6, boxShadow: "0 0 8px rgba(245,197,88,0.53)" }}
        />
        <span
          className="num font-semibold"
          style={{ fontSize: 11.5, color: "#f5c558", letterSpacing: 0.4 }}
        >
          3 NEW ALERTS
        </span>
      </div>
    </div>
  );
}

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
