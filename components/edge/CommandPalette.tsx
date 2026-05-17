"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { listPlayers, listTournaments } from "@/lib/data/ownership";

// Cmd+K command palette. Provides one-keystroke navigation to any
// page, any player in the ownership dataset, or any tournament. Mounted
// once in the dashboard layout; opens/closes on ⌘K (Mac) or Ctrl+K
// (everyone else) and on Escape.

type CommandKind = "page" | "player" | "tournament";

type Command = {
  kind: CommandKind;
  label: string;
  hint?: string;
  href: string;
};

const PAGE_COMMANDS: Command[] = [
  { kind: "page", label: "Today", href: "/dashboard", hint: "Dashboard home" },
  { kind: "page", label: "Tickets", href: "/dashboard/bets", hint: "Bet portfolio + PnL" },
  { kind: "page", label: "Ask Greenside", href: "/dashboard/ask", hint: "Conversational AI" },
  { kind: "page", label: "DFS Optimizer", href: "/dashboard/dfs", hint: "Monte Carlo lineup builder" },
  { kind: "page", label: "Course Lab", href: "/dashboard/conditions", hint: "Per-course conditions" },
  { kind: "page", label: "Leaderboard", href: "/dashboard/leaderboard", hint: "Live ESPN field" },
  { kind: "page", label: "Slip Editor", href: "/dashboard/slip", hint: "Build a slip / paste import" },
  { kind: "page", label: "Showdown", href: "/dashboard/showdown", hint: "6-golfer tracker" },
  { kind: "page", label: "Previews", href: "/dashboard/preview", hint: "Tournament reads" },
  { kind: "page", label: "Backtest", href: "/dashboard/backtest", hint: "Strategy backtests" },
  { kind: "page", label: "Model Calibration", href: "/dashboard/model", hint: "Wind-sensitivity drift" },
  { kind: "page", label: "Newsletter", href: "/dashboard/newsletter", hint: "Daily digest preview" },
  { kind: "page", label: "Ownership Database", href: "/dashboard/ownership", hint: "DK ownership history" },
  { kind: "page", label: "Add Ownership Tournament", href: "/dashboard/ownership/upload", hint: "Paste new event JSON" },
  { kind: "page", label: "PGA Schedule", href: "/dashboard/schedule", hint: "Full 2026 season" },
  { kind: "page", label: "Bankroll", href: "/dashboard/account", hint: "Settings + alerts" },
  { kind: "page", label: "Admin Integrations", href: "/dashboard/admin", hint: "Health probe" },
  { kind: "page", label: "Bookmarklet", href: "/bookmarklet", hint: "Sportsbook → slip" },
  { kind: "page", label: "Changelog", href: "/changelog", hint: "Release notes" },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build the full command index once. Players + tournaments come from
  // the static ownership dataset, so this is essentially free.
  const commands: Command[] = useMemo(() => {
    const playerCmds: Command[] = listPlayers().map((p) => ({
      kind: "player",
      label: p.name,
      hint: `${p.appearances} apps · ${p.avgOwn.toFixed(1)}% avg own`,
      href: `/players/${slugify(p.name)}`,
    }));
    const tournamentCmds: Command[] = listTournaments().map((t) => ({
      kind: "tournament",
      label: t.name,
      hint: `${t.meta.course} · ${t.count} players`,
      href: `/dashboard/ownership?t=${encodeURIComponent(t.name)}`,
    }));
    return [...PAGE_COMMANDS, ...playerCmds, ...tournamentCmds];
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Empty query: show pages first as a quick-nav menu, capped.
      return commands.filter((c) => c.kind === "page").slice(0, 20);
    }
    const scored: { cmd: Command; score: number }[] = [];
    for (const cmd of commands) {
      const score = fuzzyScore(q, cmd.label.toLowerCase());
      if (score > 0) scored.push({ cmd, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 25).map((s) => s.cmd);
  }, [query, commands]);

  // Global keyboard listener.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Reset query / focus when opened.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      // Give the modal a frame to mount before focusing.
      setTimeout(() => inputRef.current?.focus(), 16);
    }
  }, [open]);

  // Keep active row in view as the user arrows through.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector<HTMLElement>(`[data-cmd-idx="${activeIndex}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const select = useCallback(
    (cmd: Command) => {
      setOpen(false);
      router.push(cmd.href);
    },
    [router],
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = results[activeIndex];
      if (cmd) select(cmd);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={() => setOpen(false)}
    >
      <div
        className="mt-[12vh] w-full max-w-xl mx-4 rounded-[12px] border border-line bg-surface-1 overflow-hidden"
        style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-3 px-4 py-3 border-b border-line"
          style={{ background: "rgba(0,0,0,0.2)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="#a8b3ac" strokeWidth="2" />
            <path
              d="M20 20l-3.5-3.5"
              stroke="#a8b3ac"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search pages, players, tournaments…"
            className="flex-1 bg-transparent text-text outline-none"
            style={{ fontSize: 15 }}
          />
          <kbd
            className="num"
            style={{
              fontSize: 10,
              letterSpacing: 0.5,
              padding: "2px 6px",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 4,
              color: "#a8b3ac",
            }}
          >
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[55vh] overflow-y-auto">
          {results.length === 0 ? (
            <div
              className="px-4 py-10 text-center text-text-dim"
              style={{ fontSize: 13 }}
            >
              No matches for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            <RenderResults
              results={results}
              activeIndex={activeIndex}
              onHover={setActiveIndex}
              onPick={select}
            />
          )}
        </div>

        <div
          className="px-4 py-2 border-t border-line flex items-center gap-3 text-text-muted"
          style={{ fontSize: 10.5, letterSpacing: 0.4, background: "rgba(0,0,0,0.18)" }}
        >
          <KbdHint k="↑↓" label="navigate" />
          <KbdHint k="↵" label="open" />
          <KbdHint k="esc" label="close" />
          <span className="flex-1" />
          <span>{results.length} results</span>
        </div>
      </div>
    </div>
  );
}

function RenderResults({
  results,
  activeIndex,
  onHover,
  onPick,
}: {
  results: Command[];
  activeIndex: number;
  onHover: (i: number) => void;
  onPick: (cmd: Command) => void;
}) {
  // Group sequentially by kind so users see "Pages", then "Players", etc.
  const groups: { kind: CommandKind; rows: { cmd: Command; idx: number }[] }[] = [];
  results.forEach((cmd, idx) => {
    const last = groups[groups.length - 1];
    if (last && last.kind === cmd.kind) last.rows.push({ cmd, idx });
    else groups.push({ kind: cmd.kind, rows: [{ cmd, idx }] });
  });

  return (
    <>
      {groups.map((g, gi) => (
        <div key={gi}>
          <div
            className="num font-semibold uppercase text-text-muted px-4 pt-3 pb-1.5"
            style={{ fontSize: 10, letterSpacing: 1.1 }}
          >
            {kindLabel(g.kind)}
          </div>
          {g.rows.map(({ cmd, idx }) => {
            const active = idx === activeIndex;
            return (
              <button
                key={idx}
                data-cmd-idx={idx}
                onClick={() => onPick(cmd)}
                onMouseEnter={() => onHover(idx)}
                className="w-full text-left flex items-center gap-3 px-4 py-2.5"
                style={{
                  background: active ? "rgba(142,230,142,0.08)" : "transparent",
                  borderLeft: active
                    ? "2px solid #8ee68e"
                    : "2px solid transparent",
                  fontSize: 13.5,
                }}
              >
                <span
                  className="num uppercase shrink-0"
                  style={{
                    width: 18,
                    fontSize: 10,
                    letterSpacing: 0.6,
                    color: kindColor(cmd.kind),
                  }}
                >
                  {kindGlyph(cmd.kind)}
                </span>
                <span className="text-text flex-1 truncate">{cmd.label}</span>
                {cmd.hint && (
                  <span
                    className="text-text-muted truncate"
                    style={{ fontSize: 11.5, maxWidth: "50%" }}
                  >
                    {cmd.hint}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </>
  );
}

function KbdHint({ k, label }: { k: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <kbd
        className="num"
        style={{
          padding: "1px 5px",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 3,
          fontSize: 10,
        }}
      >
        {k}
      </kbd>
      {label}
    </span>
  );
}

function kindLabel(k: CommandKind): string {
  return k === "page" ? "Pages" : k === "player" ? "Players" : "Tournaments";
}

function kindColor(k: CommandKind): string {
  return k === "page" ? "#7fd49a" : k === "player" ? "#f5c558" : "#7cc0e8";
}

function kindGlyph(k: CommandKind): string {
  return k === "page" ? "→" : k === "player" ? "P" : "T";
}

// Lightweight fuzzy scoring: every query character must appear in order in
// the target. Score rewards consecutive matches and matches near the start.
function fuzzyScore(query: string, target: string): number {
  if (query.length === 0) return 0;
  if (target.includes(query)) {
    // Exact substring → big bonus, plus position-based score
    const idx = target.indexOf(query);
    return 1000 - idx;
  }
  let qi = 0;
  let lastMatch = -1;
  let score = 0;
  for (let ti = 0; ti < target.length && qi < query.length; ti++) {
    if (target[ti] === query[qi]) {
      // Reward consecutive matches; small bonus for matching after a space
      if (lastMatch === ti - 1) score += 4;
      else if (ti === 0 || target[ti - 1] === " ") score += 3;
      else score += 1;
      lastMatch = ti;
      qi++;
    }
  }
  if (qi < query.length) return 0;
  // Penalize long targets so shorter matches win ties.
  return score - target.length * 0.02;
}

function slugify(name: string): string {
  const last = name.split(" ").pop() ?? name;
  return last
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/g, "");
}
