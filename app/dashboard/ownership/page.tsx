"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  OWNERSHIP_DATA,
  TOURNAMENT_ORDER,
  type OwnershipMeta,
} from "@/lib/data/ownership";
import {
  fromLegacy,
  loadArchiveDataset,
  listPlayers,
  getPlayerHistory,
  listCourses,
  getCourseHistory,
  type ArchiveDataset,
} from "@/lib/data/ownership-archive";
import { ProjectedOwnership } from "@/components/dfs/ProjectedOwnership";
import { OwnershipAccuracy } from "@/components/dfs/OwnershipAccuracy";

// DFS ownership browser. Three views: tournaments grid, player leaderboard,
// drill-down on either. Mirrors the standalone HTML viewer but uses the
// Greenside design system and integrates with the rest of the dashboard.

type View =
  | { kind: "projections" }
  | { kind: "accuracy" }
  | { kind: "tournaments" }
  | { kind: "players" }
  | { kind: "courses" }
  | { kind: "tournament"; name: string }
  | { kind: "player"; name: string }
  | { kind: "course"; name: string };

export default function OwnershipPage() {
  const [view, setView] = useState<View>({ kind: "projections" });
  // Initial dataset is the legacy static one so the page renders instantly.
  // The Supabase archive replaces it once /api/dfs/archive resolves.
  const [ds, setDs] = useState<ArchiveDataset>(() =>
    fromLegacy(OWNERSHIP_DATA, TOURNAMENT_ORDER),
  );
  const [archiveLoaded, setArchiveLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadArchiveDataset().then((live) => {
      if (cancelled || !live) return;
      setDs(live);
      setArchiveLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const tournaments = useMemo(
    () =>
      ds.order
        .filter((t) => ds.data[t])
        .map((t) => ({
          name: t,
          meta: ds.data[t].meta,
          count: ds.data[t].players.length,
        })),
    [ds],
  );

  const players = useMemo(() => listPlayers(ds), [ds]);
  const courses = useMemo(() => listCourses(ds), [ds]);

  const stats = useMemo(() => {
    let records = 0;
    for (const t of Object.values(ds.data)) records += t.players.length;
    return { tournaments: tournaments.length, players: players.length, records };
  }, [ds, tournaments.length, players.length]);

  return (
    <div className="px-5 lg:px-8 py-6 space-y-5 max-w-6xl mx-auto">
      <header>
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
        >
          ● DFS Ownership
        </span>
        <h1
          className="serif-italic mt-1.5"
          style={{ fontSize: 36, letterSpacing: -0.4 }}
        >
          <em>Field ownership history.</em>
        </h1>
        <p className="text-text-dim mt-2 max-w-2xl" style={{ fontSize: 14 }}>
          DraftKings finishing ownership{archiveLoaded ? " across every event in the archive" : " across the 2026 season"}. Use it to
          find leverage plays (chronically under-owned for their salary)
          and to gauge chalk levels at similar courses.{" "}
          {stats.records.toLocaleString()} records · {stats.players}{" "}
          players · {stats.tournaments} events.
        </p>
      </header>

      <div className="flex items-center gap-2 flex-wrap">
        <Tab
          active={view.kind === "projections"}
          onClick={() => setView({ kind: "projections" })}
        >
          This week
        </Tab>
        <Tab
          active={view.kind === "accuracy"}
          onClick={() => setView({ kind: "accuracy" })}
        >
          vs Actual
        </Tab>
        <Tab
          active={view.kind === "tournaments" || view.kind === "tournament"}
          onClick={() => setView({ kind: "tournaments" })}
        >
          Tournaments
        </Tab>
        <Tab
          active={view.kind === "players" || view.kind === "player"}
          onClick={() => setView({ kind: "players" })}
        >
          Players
        </Tab>
        <Tab
          active={view.kind === "courses" || view.kind === "course"}
          onClick={() => setView({ kind: "courses" })}
        >
          Courses
        </Tab>
        <span className="flex-1" />
        <Link
          href="/dashboard/ownership/projection"
          className="num font-semibold uppercase mr-2"
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            fontSize: 11,
            letterSpacing: 0.8,
            color: "#f5c558",
            background: "rgba(245,197,88,0.1)",
            border: "1px solid rgba(245,197,88,0.3)",
          }}
        >
          This week&apos;s projection
        </Link>
        <Link
          href="/dashboard/ownership/upload"
          className="num font-semibold uppercase"
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            fontSize: 11,
            letterSpacing: 0.8,
            color: "#8ee68e",
            background: "rgba(142,230,142,0.13)",
            border: "1px solid rgba(142,230,142,0.3)",
          }}
        >
          + Add tournament
        </Link>
      </div>

      {view.kind === "projections" && <ProjectedOwnership />}
      {view.kind === "accuracy" && <OwnershipAccuracy />}
      {view.kind === "tournaments" && (
        <TournamentsTable
          rows={tournaments}
          onPick={(name) => setView({ kind: "tournament", name })}
        />
      )}
      {view.kind === "players" && (
        <PlayersTable rows={players} onPick={(name) => setView({ kind: "player", name })} />
      )}
      {view.kind === "courses" && (
        <CoursesTable rows={courses} onPick={(name) => setView({ kind: "course", name })} />
      )}
      {view.kind === "tournament" && (
        <TournamentDetail
          ds={ds}
          name={view.name}
          onBack={() => setView({ kind: "tournaments" })}
          onPickPlayer={(name) => setView({ kind: "player", name })}
        />
      )}
      {view.kind === "player" && (
        <PlayerDetail
          ds={ds}
          name={view.name}
          onBack={() => setView({ kind: "players" })}
          onPickTournament={(name) => setView({ kind: "tournament", name })}
        />
      )}
      {view.kind === "course" && (
        <CourseDetail
          ds={ds}
          name={view.name}
          onBack={() => setView({ kind: "courses" })}
          onPickPlayer={(name) => setView({ kind: "player", name })}
          onPickTournament={(name) => setView({ kind: "tournament", name })}
        />
      )}
    </div>
  );
}

function CoursesTable({
  rows,
  onPick,
}: {
  rows: { course: string; eventCount: number; meta: OwnershipMeta }[];
  onPick: (name: string) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = rows.filter((r) => r.course.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-3">
      <input
        placeholder="Search course…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full rounded-[8px] border border-line bg-surface-1 px-3 py-2 text-text"
        style={{ fontSize: 13 }}
      />
      <div className="rounded-[14px] border border-line overflow-hidden">
        <div
          className="grid gap-2 px-4 py-2.5 num font-semibold uppercase text-text-muted border-b border-line"
          style={{
            gridTemplateColumns: "2.5fr 70px 80px 80px 110px",
            fontSize: 10,
            letterSpacing: 1.1,
            background: "rgba(0,0,0,0.18)",
          }}
        >
          <span>Course</span>
          <span className="text-right">Events</span>
          <span className="text-right">Par</span>
          <span className="text-right">Yards</span>
          <span className="text-right">Type</span>
        </div>
        {filtered.map((r) => (
          <button
            key={r.course}
            onClick={() => onPick(r.course)}
            className="w-full text-left grid gap-2 px-4 py-3 border-b border-line/50 last:border-b-0 hover:bg-surface-2"
            style={{ gridTemplateColumns: "2.5fr 70px 80px 80px 110px", fontSize: 13 }}
          >
            <span className="text-text font-medium">{r.course}</span>
            <span className="num text-right text-text-dim">{r.eventCount}</span>
            <span className="num text-right text-text-dim">{r.meta.par}</span>
            <span className="num text-right text-text-dim">{r.meta.yards.toLocaleString()}</span>
            <span className="text-right"><TypeBadge type={r.meta.type} /></span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CourseDetail({
  ds,
  name,
  onBack,
  onPickPlayer,
  onPickTournament,
}: {
  ds: ArchiveDataset;
  name: string;
  onBack: () => void;
  onPickPlayer: (name: string) => void;
  onPickTournament: (name: string) => void;
}) {
  const h = getCourseHistory(ds, name);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"avg" | "max" | "apps">("avg");

  if (!h) return null;

  const filtered = useMemoFilter(h.playerStats, q, sort);
  // Players with the most repeat appearances at this course are the most
  // informative — they've shown up in the field multiple times.
  const repeats = filtered.filter((p) => p.appearances > 1);
  const oneOff = filtered.filter((p) => p.appearances === 1);

  return (
    <div className="space-y-3">
      <button
        onClick={onBack}
        className="text-text-dim hover:text-text"
        style={{ fontSize: 12 }}
      >
        ← All courses
      </button>
      <div className="rounded-[14px] border border-line p-5 bg-surface-1 space-y-3">
        <div className="serif-italic" style={{ fontSize: 24, fontStyle: "normal" }}>
          <em>{h.course}</em>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Events on file" value={`${h.events.length}`} />
          <Stat label="Unique players" value={`${h.playerStats.length}`} />
          <Stat label="Repeat field" value={`${repeats.length}`} tone="good" />
          <Stat
            label="Most-chalked"
            value={
              h.playerStats[0]
                ? `${h.playerStats[0].name.split(" ").pop()} ${h.playerStats[0].avgOwn.toFixed(0)}%`
                : "—"
            }
          />
        </div>
        <div className="flex flex-wrap gap-2 text-text-dim" style={{ fontSize: 12 }}>
          <span className="text-text-muted num uppercase" style={{ letterSpacing: 1, fontSize: 10 }}>
            Events:
          </span>
          {h.events.map((e) => (
            <button
              key={e.tournament}
              onClick={() => onPickTournament(e.tournament)}
              className="underline hover:text-text"
            >
              {e.tournament}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          placeholder="Filter players…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 min-w-[200px] rounded-[8px] border border-line bg-surface-1 px-3 py-2 text-text"
          style={{ fontSize: 13 }}
        />
        <SortChip current={sort} value="avg" onPick={setSort}>
          Sort: Avg
        </SortChip>
        <SortChip current={sort} value="max" onPick={setSort}>
          Peak
        </SortChip>
        <SortChip current={sort} value="apps" onPick={setSort}>
          Apps
        </SortChip>
      </div>

      {repeats.length > 0 && (
        <CoursePlayerTable
          title={`Repeat field (${repeats.length})`}
          rows={repeats}
          onPick={onPickPlayer}
        />
      )}
      {oneOff.length > 0 && (
        <CoursePlayerTable
          title={`One-off appearances (${oneOff.length})`}
          rows={oneOff}
          onPick={onPickPlayer}
        />
      )}
    </div>
  );
}

function CoursePlayerTable({
  title,
  rows,
  onPick,
}: {
  title: string;
  rows: { name: string; appearances: number; avgOwn: number; avgSalary: number; maxOwn: number; minOwn: number }[];
  onPick: (name: string) => void;
}) {
  return (
    <div className="rounded-[14px] border border-line overflow-hidden">
      <div
        className="px-4 py-2.5 border-b border-line num font-semibold uppercase text-text-muted"
        style={{ fontSize: 10, letterSpacing: 1.1, background: "rgba(0,0,0,0.18)" }}
      >
        {title}
      </div>
      <div
        className="grid gap-2 px-4 py-2 num font-semibold uppercase text-text-muted border-b border-line"
        style={{
          gridTemplateColumns: "1.8fr 60px 80px 100px 100px",
          fontSize: 9.5,
          letterSpacing: 1.1,
        }}
      >
        <span>Player</span>
        <span className="text-right">Apps</span>
        <span className="text-right">Avg own</span>
        <span className="text-right">Range</span>
        <span className="text-right">Avg salary</span>
      </div>
      {rows.slice(0, 100).map((r) => (
        <button
          key={r.name}
          onClick={() => onPick(r.name)}
          className="w-full text-left grid gap-2 px-4 py-2.5 border-b border-line/50 last:border-b-0 hover:bg-surface-2"
          style={{ gridTemplateColumns: "1.8fr 60px 80px 100px 100px", fontSize: 13 }}
        >
          <span className="text-text">{r.name}</span>
          <span className="num text-right text-text-dim">{r.appearances}</span>
          <span className="num text-right" style={{ color: ownColor(r.avgOwn) }}>
            {r.avgOwn.toFixed(1)}%
          </span>
          <span className="num text-right text-text-dim" style={{ fontSize: 11 }}>
            {r.minOwn.toFixed(1)}–{r.maxOwn.toFixed(1)}%
          </span>
          <span className="num text-right text-text-dim">
            ${Math.round(r.avgSalary).toLocaleString()}
          </span>
        </button>
      ))}
      {rows.length > 100 && (
        <div className="px-4 py-3 text-text-muted text-center" style={{ fontSize: 11 }}>
          Showing top 100 of {rows.length}.
        </div>
      )}
    </div>
  );
}

function useMemoFilter<
  T extends { name: string; appearances: number; avgOwn: number; maxOwn: number },
>(rows: T[], q: string, sort: "avg" | "max" | "apps"): T[] {
  return useMemo(() => {
    const f = rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));
    f.sort((a, b) => {
      if (sort === "apps") return b.appearances - a.appearances;
      if (sort === "max") return b.maxOwn - a.maxOwn;
      return b.avgOwn - a.avgOwn;
    });
    return f;
  }, [rows, q, sort]);
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="num font-semibold uppercase transition"
      style={{
        padding: "6px 12px",
        borderRadius: 6,
        fontSize: 11,
        letterSpacing: 0.8,
        color: active ? "#f0ebe0" : "#a8b3ac",
        background: active ? "#1e4030" : "transparent",
        border: active ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
      }}
    >
      {children}
    </button>
  );
}

function TournamentsTable({
  rows,
  onPick,
}: {
  rows: { name: string; meta: OwnershipMeta; count: number }[];
  onPick: (name: string) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-3">
      <input
        placeholder="Search tournament…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full rounded-[8px] border border-line bg-surface-1 px-3 py-2 text-text"
        style={{ fontSize: 13 }}
      />
      <div className="rounded-[14px] border border-line overflow-hidden">
        <div
          className="grid gap-2 px-4 py-2.5 num font-semibold uppercase text-text-muted border-b border-line"
          style={{
            gridTemplateColumns: "2fr 2fr 100px 80px 110px",
            fontSize: 10,
            letterSpacing: 1.1,
            background: "rgba(0,0,0,0.18)",
          }}
        >
          <span>Tournament</span>
          <span>Course</span>
          <span>Type</span>
          <span className="text-right">Players</span>
          <span className="text-right">Par / Yards</span>
        </div>
        {filtered.map((r) => (
          <button
            key={r.name}
            onClick={() => onPick(r.name)}
            className="w-full text-left grid gap-2 px-4 py-3 border-b border-line/50 last:border-b-0 hover:bg-surface-2"
            style={{ gridTemplateColumns: "2fr 2fr 100px 80px 110px", fontSize: 13 }}
          >
            <span className="font-medium text-text">{r.name}</span>
            <span className="text-text-dim truncate">{r.meta.course}</span>
            <span>
              <TypeBadge type={r.meta.type} />
            </span>
            <span className="num text-right text-text-dim">{r.count}</span>
            <span className="num text-right text-text-dim">
              {r.meta.par} / {r.meta.yards.toLocaleString()}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const label =
    type === "signature"
      ? "Signature"
      : type === "sig_cut"
        ? "Sig + cut"
        : type === "full_cut"
          ? "Full cut"
          : type;
  const color =
    type === "signature" || type === "sig_cut" ? "#8ee68e" : "#7cc0e8";
  return (
    <span
      className="num uppercase"
      style={{
        fontSize: 10,
        letterSpacing: 0.8,
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

function PlayersTable({
  rows,
  onPick,
}: {
  rows: ReturnType<typeof listPlayers>;
  onPick: (name: string) => void;
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"avg" | "max" | "apps">("avg");

  const filtered = useMemo(() => {
    const f = rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));
    f.sort((a, b) => {
      if (sort === "apps") return b.appearances - a.appearances;
      if (sort === "max") return b.maxOwn - a.maxOwn;
      return b.avgOwn - a.avgOwn;
    });
    return f;
  }, [rows, q, sort]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          placeholder="Search player…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 min-w-[200px] rounded-[8px] border border-line bg-surface-1 px-3 py-2 text-text"
          style={{ fontSize: 13 }}
        />
        <SortChip current={sort} value="avg" onPick={setSort}>
          Sort: Avg
        </SortChip>
        <SortChip current={sort} value="max" onPick={setSort}>
          Peak
        </SortChip>
        <SortChip current={sort} value="apps" onPick={setSort}>
          Apps
        </SortChip>
      </div>
      <div className="rounded-[14px] border border-line overflow-hidden">
        <div
          className="grid gap-2 px-4 py-2.5 num font-semibold uppercase text-text-muted border-b border-line"
          style={{
            gridTemplateColumns: "2fr 70px 90px 110px 110px",
            fontSize: 10,
            letterSpacing: 1.1,
            background: "rgba(0,0,0,0.18)",
          }}
        >
          <span>Player</span>
          <span className="text-right">Apps</span>
          <span className="text-right">Avg own</span>
          <span className="text-right">High / Low</span>
          <span className="text-right">Avg salary</span>
        </div>
        {filtered.slice(0, 200).map((r) => (
          <button
            key={r.name}
            onClick={() => onPick(r.name)}
            className="w-full text-left grid gap-2 px-4 py-3 border-b border-line/50 last:border-b-0 hover:bg-surface-2"
            style={{ gridTemplateColumns: "2fr 70px 90px 110px 110px", fontSize: 13 }}
          >
            <span className="font-medium text-text">{r.name}</span>
            <span className="num text-right text-text-dim">{r.appearances}</span>
            <span className="num text-right" style={{ color: ownColor(r.avgOwn) }}>
              {r.avgOwn.toFixed(1)}%
            </span>
            <span className="num text-right text-text-dim">
              {r.maxOwn.toFixed(1)}% / {r.minOwn.toFixed(1)}%
            </span>
            <span className="num text-right text-text-dim">
              ${Math.round(r.avgSalary).toLocaleString()}
            </span>
          </button>
        ))}
        {filtered.length > 200 && (
          <div className="px-4 py-3 text-text-muted text-center" style={{ fontSize: 11 }}>
            Showing top 200 of {filtered.length} — refine your search to see more.
          </div>
        )}
      </div>
    </div>
  );
}

function SortChip<T extends string>({
  current,
  value,
  onPick,
  children,
}: {
  current: T;
  value: T;
  onPick: (v: T) => void;
  children: React.ReactNode;
}) {
  const active = current === value;
  return (
    <button
      onClick={() => onPick(value)}
      className="num font-semibold uppercase transition"
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
      {children}
    </button>
  );
}

function TournamentDetail({
  ds,
  name,
  onBack,
  onPickPlayer,
}: {
  ds: ArchiveDataset;
  name: string;
  onBack: () => void;
  onPickPlayer: (name: string) => void;
}) {
  const t = ds.data[name];
  const [q, setQ] = useState("");
  if (!t) return null;
  const filtered = t.players.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  const chalkLine = t.players
    .slice(0, 5)
    .map((p) => `${p.name} ${p.own.toFixed(1)}%`)
    .join(" · ");

  return (
    <div className="space-y-3">
      <button
        onClick={onBack}
        className="text-text-dim hover:text-text"
        style={{ fontSize: 12 }}
      >
        ← All tournaments
      </button>
      <div className="rounded-[14px] border border-line p-5 bg-surface-1 space-y-3">
        <div className="serif-italic" style={{ fontSize: 24, fontStyle: "normal" }}>
          <em>{name}</em>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Course" value={t.meta.course} />
          <Stat label="Type" value={t.meta.type} />
          <Stat label="Field" value={`${t.players.length}`} />
          <Stat label="Par / Yards" value={`${t.meta.par} / ${t.meta.yards.toLocaleString()}`} />
        </div>
        <div className="text-text-dim" style={{ fontSize: 12 }}>
          <span className="text-text-muted num uppercase" style={{ letterSpacing: 1, fontSize: 10 }}>
            Top chalk:
          </span>{" "}
          {chalkLine}
        </div>
      </div>

      <input
        placeholder="Filter players…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full rounded-[8px] border border-line bg-surface-1 px-3 py-2 text-text"
        style={{ fontSize: 13 }}
      />

      <div className="rounded-[14px] border border-line overflow-hidden">
        <div
          className="grid gap-2 px-4 py-2.5 num font-semibold uppercase text-text-muted border-b border-line"
          style={{
            gridTemplateColumns: "2fr 90px 90px",
            fontSize: 10,
            letterSpacing: 1.1,
            background: "rgba(0,0,0,0.18)",
          }}
        >
          <span>Player</span>
          <span className="text-right">Salary</span>
          <span className="text-right">Ownership</span>
        </div>
        {filtered.map((p) => (
          <button
            key={p.name}
            onClick={() => onPickPlayer(p.name)}
            className="w-full text-left grid gap-2 px-4 py-3 border-b border-line/50 last:border-b-0 hover:bg-surface-2"
            style={{ gridTemplateColumns: "2fr 90px 90px", fontSize: 13 }}
          >
            <span className="text-text">{p.name}</span>
            <span className="num text-right text-text-dim">
              ${p.salary.toLocaleString()}
            </span>
            <span className="num text-right font-semibold" style={{ color: ownColor(p.own) }}>
              {p.own.toFixed(2)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PlayerDetail({
  ds,
  name,
  onBack,
  onPickTournament,
}: {
  ds: ArchiveDataset;
  name: string;
  onBack: () => void;
  onPickTournament: (name: string) => void;
}) {
  const h = getPlayerHistory(ds, name);
  if (!h) return null;
  return (
    <div className="space-y-3">
      <button
        onClick={onBack}
        className="text-text-dim hover:text-text"
        style={{ fontSize: 12 }}
      >
        ← All players
      </button>
      <div className="rounded-[14px] border border-line p-5 bg-surface-1 space-y-3">
        <div className="serif-italic" style={{ fontSize: 24, fontStyle: "normal" }}>
          <em>{h.name}</em>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Appearances" value={`${h.appearances}`} />
          <Stat label="Avg ownership" value={`${h.avgOwn.toFixed(2)}%`} tone="good" />
          <Stat label="Peak" value={`${h.maxOwn.toFixed(2)}%`} />
          <Stat label="Low" value={`${h.minOwn.toFixed(2)}%`} />
        </div>
        <Link
          href={`/players/${encodeURIComponent(h.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z-]/g, ""))}`}
          className="text-text-dim hover:text-text underline"
          style={{ fontSize: 12 }}
        >
          Open player profile →
        </Link>
      </div>

      <div className="rounded-[14px] border border-line overflow-hidden">
        <div
          className="grid gap-2 px-4 py-2.5 num font-semibold uppercase text-text-muted border-b border-line"
          style={{
            gridTemplateColumns: "2fr 90px 90px",
            fontSize: 10,
            letterSpacing: 1.1,
            background: "rgba(0,0,0,0.18)",
          }}
        >
          <span>Tournament</span>
          <span className="text-right">Ownership</span>
          <span className="text-right">Salary</span>
        </div>
        {h.history.map((e) => (
          <button
            key={e.tournament}
            onClick={() => onPickTournament(e.tournament)}
            className="w-full text-left grid gap-2 px-4 py-3 border-b border-line/50 last:border-b-0 hover:bg-surface-2"
            style={{ gridTemplateColumns: "2fr 90px 90px", fontSize: 13 }}
          >
            <span className="text-text">{e.tournament}</span>
            <span className="num text-right font-semibold" style={{ color: ownColor(e.own) }}>
              {e.own.toFixed(2)}%
            </span>
            <span className="num text-right text-text-dim">
              ${e.salary.toLocaleString()}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  const color = tone === "good" ? "#7fd49a" : tone === "bad" ? "#e87c7c" : "#f0ebe0";
  return (
    <div>
      <div
        className="num font-semibold uppercase text-text-muted"
        style={{ fontSize: 10, letterSpacing: 1.2 }}
      >
        {label}
      </div>
      <div className="num mt-1" style={{ fontSize: 16, color }}>
        {value}
      </div>
    </div>
  );
}

// Color ramp: deep green for low (good leverage), yellow for mid, red for
// chalk. Threshold ~5% / ~15% feels right for PGA DK fields.
function ownColor(own: number): string {
  if (own >= 20) return "#e87c7c";
  if (own >= 15) return "#f5c558";
  if (own >= 7) return "#f0ebe0";
  return "#7fd49a";
}
