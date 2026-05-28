"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  parseEntriesCsv,
  analyzeEntry,
  summarizeByContest,
  normalizeName,
  buildNameResolver,
  type DkEntry,
  type CutLookup,
} from "@/lib/dfs/cut-sweat";
import {
  parseStandingsCsv,
  parsePayoutStructure,
  findMyEntries,
  currentRoi,
  projectedRoi,
  type ContestStandings,
} from "@/lib/dfs/payouts";
import {
  winProbability,
  projectGolferFinal,
  fieldAveragePace,
  type GolferState,
} from "@/lib/dfs/projection";
import { PortfolioRoi } from "@/components/edge/PortfolioRoi";
import { DK_SALARIES, DK_EVENT } from "@/lib/data/dfs-salaries";
import { projectOwnership } from "@/lib/dfs/project-ownership";
import { SCORING_FORMATS, type ScoringFormat } from "@/lib/dfs/scoring";
import { DfsMobileNav } from "@/components/dfs/DfsMobileNav";

const FORMAT_LABELS: Record<ScoringFormat, string> = {
  classic: "Classic",
  showdown: "Showdown",
  showdown_r4: "Showdown R4",
};
function asFormat(v: unknown): ScoringFormat {
  return typeof v === "string" && v in SCORING_FORMATS ? (v as ScoringFormat) : "classic";
}

type LivePoints = {
  source: string;
  event?: string | null;
  course?: string | null;
  state?: string | null;
  round?: number | null;
  parCoverage?: number | null;
  realParHoles?: number | null;
  players: { name: string; points: number; thru?: number | null }[];
};

type Projection = {
  source: string;
  cutLine: number | null;
  lastUpdate?: string | null;
  round?: number | null;
  players: { name: string; makeCut: number; scoreToPar: number | null; thru: number | null }[];
};

const GREEN = "#2faa5f";
const RED = "#e5544b";

const PRESETS_KEY = "cutSweat.contestPresets";
// Standings CSVs are large, so store each preset's CSV under its own key
// rather than inline in the presets array — keeps the metadata list tiny and
// avoids loading every CSV just to render the saved-contest chips.
const csvKey = (id: string) => `cutSweat.csv.${id}`;

// A Showdown contest is fixed to one round (its name usually says which, e.g.
// "... (Round 3 TOUR)"). Parse it so we score that round even after the
// tournament has moved on — never auto-jump to the live tournament round.
function parseRoundFromName(name: string): number | null {
  const m = name.match(/round\s*([1-4])\b/i) ?? name.match(/\(\s*r\s*([1-4])\b/i) ?? name.match(/\br([1-4])\b/i);
  return m ? Number(m[1]) : null;
}

type ContestPreset = {
  id: string;
  name: string;
  ladder: string;
  fee: string;
  format: ScoringFormat;
  round: string;
  standingsName?: string; // file name of the saved CSV, if any
};

// A contest published server-side (via Share) that any visitor can load
// without uploading a CSV. Listing omits the (large) standings_csv.
type SharedContestItem = {
  id: string;
  name: string;
  eventName: string | null;
  fieldSize: number | null;
  format: ScoringFormat;
  round: number | null;
  createdAt: string;
};

function loadPresets(): ContestPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function fmtToPar(n: number | null): string {
  if (n === null) return "—";
  return n === 0 ? "E" : n > 0 ? `+${n}` : `${n}`;
}
function fmtMargin(n: number | null): string {
  if (n === null) return "—";
  return n >= 0 ? `+${n} safe` : `${n} off`;
}

export default function CutSweatPage() {
  const [entries, setEntries] = useState<DkEntry[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [proj, setProj] = useState<Projection | null>(null);
  const [loading, setLoading] = useState(true);

  // Projected ownership for the bubble watch: same static DK-salary heuristic
  // the projection page uses, so it's always available (no DataGolf call).
  // Keyed by normalized name to join DataGolf's live "Last, First" rows.
  const ownership = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of projectOwnership(DK_SALARIES))
      m.set(normalizeName(p.name), p.projOwn);
    return m;
  }, []);
  const [standings, setStandings] = useState<ContestStandings | null>(null);
  const [standingsName, setStandingsName] = useState<string | null>(null);
  const [standingsCsv, setStandingsCsv] = useState("");
  const [ladderText, setLadderText] = useState("");
  const [fee, setFee] = useState("");
  const [username, setUsername] = useState("");
  const [format, setFormat] = useState<ScoringFormat>("classic");
  const [roundParam, setRoundParam] = useState("");
  const [live, setLive] = useState<LivePoints | null>(null);
  const [livePending, setLivePending] = useState(false);
  const [presets, setPresets] = useState<ContestPreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharePending, setSharePending] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [loadedFrom, setLoadedFrom] = useState<string | null>(null);
  const [sharedList, setSharedList] = useState<SharedContestItem[]>([]);

  useEffect(() => {
    setPresets(loadPresets());
  }, []);

  // Auto-publish any locally-saved contest that has a stored field but
  // hasn't made it to the shared list yet. Covers presets saved before the
  // server-side persistence shipped — the user shouldn't have to re-save
  // each one by hand to get them published.
  const autoPublishedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (presets.length === 0) return;
    const eventName = live?.event ?? DK_EVENT;
    const sharedKeys = new Set(
      sharedList.map((c) => `${c.name}::${c.eventName ?? ""}`),
    );
    const toPublish = presets.filter((p) => {
      if (autoPublishedRef.current.has(p.id)) return false;
      if (sharedKeys.has(`${p.name}::${eventName}`)) return false;
      let csv: string | null = null;
      try {
        csv = localStorage.getItem(csvKey(p.id));
      } catch {}
      return !!csv;
    });
    if (toPublish.length === 0) return;

    (async () => {
      let pushed = false;
      for (const p of toPublish) {
        autoPublishedRef.current.add(p.id);
        let csv: string | null = null;
        try {
          csv = localStorage.getItem(csvKey(p.id));
        } catch {}
        if (!csv) continue;
        try {
          const r = await fetch("/api/dfs/contests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: p.name,
              fee: p.fee ? Number(p.fee) : null,
              format: p.format,
              round: p.round ? Number(p.round) : null,
              payoutLadder: p.ladder,
              eventName,
              standingsCsv: csv,
            }),
          });
          if (r.ok) pushed = true;
        } catch {}
      }
      if (pushed) {
        const list = await fetch("/api/dfs/contests", { cache: "no-store" })
          .then((rr) => rr.json())
          .catch(() => null);
        if (list?.contests) setSharedList(list.contests);
      }
    })();
  }, [presets, sharedList, live?.event]);

  // Published contests anyone can load without uploading a CSV. The list is
  // public (read-only); selecting one pulls the full field server-side.
  useEffect(() => {
    fetch("/api/dfs/contests", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { contests?: SharedContestItem[] }) => setSharedList(j.contests ?? []))
      .catch(() => {});
  }, []);

  // Pull a published contest by share id and populate everything except the
  // visitor's username, so they just type their DK name to see their ROI.
  const loadSharedContest = useCallback((id: string) => {
    fetch(`/api/dfs/contests/${id}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("not found"))))
      .then((c) => {
        setPresetName(c.name ?? "");
        setLadderText(c.payoutLadder ?? "");
        setFee(c.fee != null ? String(c.fee) : "");
        setFormat(asFormat(c.format));
        setRoundParam(c.round != null ? String(c.round) : "");
        if (c.standingsCsv) {
          setStandingsCsv(c.standingsCsv);
          setStandings(parseStandingsCsv(c.standingsCsv));
          setStandingsName(`${c.name} (shared)`);
        }
        setLoadedFrom(c.name ?? id);
        setShareError(null);
      })
      .catch(() => setShareError("That shared contest wasn't found."));
  }, []);

  // Auto-open a shared contest from ?contest=<id> (the share-link path).
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("contest");
    if (id) loadSharedContest(id);
  }, [loadSharedContest]);

  async function shareContest() {
    if (!standingsCsv || !presetName.trim() || !ladderText.trim()) return;
    setSharePending(true);
    setShareError(null);
    try {
      const r = await fetch("/api/dfs/contests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: presetName.trim(),
          fee: fee ? Number(fee) : null,
          format,
          round: roundParam ? Number(roundParam) : null,
          payoutLadder: ladderText,
          eventName: live?.event ?? null,
          standingsCsv,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setShareError(j.error === "not signed in" ? "Sign in to publish a shareable link." : j.error ?? "Share failed.");
        return;
      }
      const url = `${window.location.origin}${window.location.pathname}?contest=${j.id}`;
      setShareUrl(url);
      try {
        await navigator.clipboard.writeText(url);
      } catch {}
    } catch {
      setShareError("Share failed — check your connection.");
    } finally {
      setSharePending(false);
    }
  }

  function persistPresets(next: ContestPreset[]) {
    setPresets(next);
    try {
      localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
    } catch {}
  }

  async function saveCurrentPreset() {
    const name = presetName.trim();
    if (!name || !ladderText.trim()) return;
    // Reuse the existing id when overwriting a same-named preset.
    const existing = presets.find((p) => p.name === name);
    const id = existing?.id ?? `${Date.now()}`;

    // Local preset stores ladder/fee/format/round only — small and safe. We
    // deliberately stopped writing the standings CSV to localStorage because
    // a multi-MB field could blow the quota and silently drop the entire
    // preset list. The field now lives server-side via the publish below.
    const preset: ContestPreset = {
      id,
      name,
      ladder: ladderText,
      fee,
      format,
      round: roundParam,
      standingsName: undefined,
    };
    const next = [...presets.filter((p) => p.name !== name), preset];
    persistPresets(next);

    // Publish the contest to the shared list so the full field + payout
    // ladder persist across browsers and sessions until Sunday 9pm Central.
    // Re-saving the same name overwrites server-side, so no duplicates.
    if (standingsCsv) {
      setSharePending(true);
      setShareError(null);
      try {
        const r = await fetch("/api/dfs/contests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            fee: fee ? Number(fee) : null,
            format,
            round: roundParam ? Number(roundParam) : null,
            payoutLadder: ladderText,
            eventName: live?.event ?? DK_EVENT,
            standingsCsv,
          }),
        });
        const j = await r.json();
        if (r.ok) {
          // Refresh the published-contests list so the new save shows up.
          const list = await fetch("/api/dfs/contests", { cache: "no-store" })
            .then((rr) => rr.json())
            .catch(() => null);
          if (list?.contests) setSharedList(list.contests);
        } else {
          setShareError(
            j.error === "not signed in"
              ? "Saved locally. Sign in to also save it for everyone."
              : j.error ?? "Server save failed — saved locally only.",
          );
        }
      } catch {
        setShareError("Server save failed — saved locally only.");
      } finally {
        setSharePending(false);
      }
    }

    setPresetName("");
  }

  function applyPreset(id: string) {
    const p = presets.find((x) => x.id === id);
    if (!p) return;
    setLadderText(p.ladder);
    setFee(p.fee);
    setFormat(p.format);
    setRoundParam(p.round);
    // Restore the saved standings field if one was stored with this preset.
    let csv: string | null = null;
    try {
      csv = localStorage.getItem(csvKey(id));
    } catch {}
    if (csv) {
      setStandingsCsv(csv);
      setStandings(parseStandingsCsv(csv));
      setStandingsName(p.standingsName ?? "saved field");
      setShareUrl(null);
    }
  }

  function deletePreset(id: string) {
    try {
      localStorage.removeItem(csvKey(id));
    } catch {}
    persistPresets(presets.filter((p) => p.id !== id));
  }

  // Live make-cut model. Re-polls every 3 minutes so the bubble watch tracks
  // the cut line through the day without a manual refresh.
  useEffect(() => {
    let cancelled = false;
    const pull = () =>
      fetch("/api/dfs/cut-projection", { cache: "no-store" })
        .then((r) => r.json())
        .then((j: Projection) => {
          if (!cancelled) setProj(j);
        })
        .catch(() => {
          if (!cancelled) setProj({ source: "error", cutLine: null, players: [] });
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    pull();
    const id = setInterval(pull, 3 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Prefill the matcher from the user's saved DraftKings username.
  useEffect(() => {
    fetch("/api/account/profile", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j?.dkUsername) setUsername((u) => u || j.dkUsername);
      })
      .catch(() => {});
  }, []);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const parsed = parseEntriesCsv(await f.text());
    setEntries(parsed);
    if (!fee && parsed[0]) setFee(String(parsed[0].entryFee));
  }

  async function onStandings(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    setStandingsName(f.name);
    setStandingsCsv(text);
    setStandings(parseStandingsCsv(text));
    setShareUrl(null); // a new CSV needs a fresh share link
  }

  const roi = useMemo(() => {
    if (!standings) return null;
    const tiers = parsePayoutStructure(ladderText);
    if (tiers.length === 0) return null;
    const entryIds = new Set(entries.map((e) => e.entryId).filter(Boolean));
    const mine = findMyEntries(
      standings.entries,
      entryIds.size > 0 ? { entryIds } : { username },
    );
    if (mine.length === 0) return null;
    return currentRoi(mine, tiers, standings.tieCounts, Number(fee) || 0);
  }, [standings, ladderText, entries, username, fee]);

  // The round actually scored: an explicit entry wins, else parse it from the
  // contest name. Empty only when neither is available (then the server falls
  // back to the live tournament round — fine for a current-round contest).
  const effectiveRound =
    format === "showdown_r4"
      ? "4"
      : roundParam || (parseRoundFromName(presetName) ?? "");
  // Both Showdown variants score a single round; Classic is cumulative.
  const isShowdown = format === "showdown" || format === "showdown_r4";

  async function pullLive() {
    setLivePending(true);
    const qs = new URLSearchParams({ format });
    if (effectiveRound) qs.set("round", String(effectiveRound));
    try {
      const r = await fetch(`/api/dfs/live-points?${qs}`, { cache: "no-store" });
      const data: LivePoints = await r.json();
      setLive(data);
    } catch {
      setLive({ source: "error", players: [] });
    } finally {
      setLivePending(false);
    }
  }

  // Per-golfer state for projections. CURRENT points are recomputed LIVE from
  // ESPN's hole-by-hole feed with the chosen format (Showdown scores a single
  // round; Classic is cumulative), using the course's real scorecard pars — so
  // they stay correct as the round plays out and don't go stale like a CSV
  // snapshot. The CSV's FPTS is only a fallback for golfers ESPN hasn't listed.
  const golferStates = useMemo(() => {
    if (!standings) return null;
    const resolve = buildNameResolver(
      (live?.players ?? []).map((p) => ({ name: p.name, points: p.points, thru: p.thru ?? 18 })),
    );
    const states = new Map<string, GolferState>();
    for (const pl of standings.players) {
      const key = normalizeName(pl.name);
      const l = resolve(pl.name);
      const points = l ? l.points : pl.fpts;
      const thru = l ? l.thru : 18; // no live hole data → treat round as done
      states.set(key, { points, holesPlayed: thru, holesRemaining: Math.max(0, 18 - thru) });
    }
    return states;
  }, [standings, live]);

  const matchedGolfers = useMemo(() => {
    if (!golferStates || !live) return 0;
    const resolve = buildNameResolver(live.players ?? []);
    let n = 0;
    for (const pl of standings?.players ?? []) if (resolve(pl.name)) n++;
    return n;
  }, [golferStates, live, standings]);

  // How many DISTINCT golfers actually used across the field's lineups got a
  // live score. Any unmatched golfer falls back to the (possibly stale) CSV
  // FPTS, which under-scores every entry that holds them and throws off the
  // re-ranked standings — this surfaces exactly which names to fix.
  const fieldMatch = useMemo(() => {
    if (!standings || !live) return null;
    const resolve = buildNameResolver(live.players ?? []);
    const distinct = new Map<string, string>();
    for (const e of standings.entries) for (const g of e.golfers) distinct.set(normalizeName(g), g);
    const unmatched: string[] = [];
    for (const disp of distinct.values()) if (!resolve(disp)) unmatched.push(disp);
    return { matched: distinct.size - unmatched.length, total: distinct.size, unmatched };
  }, [standings, live]);

  const projected = useMemo(() => {
    if (!standings || !golferStates || !live || live.players.length === 0) return null;
    const tiers = parsePayoutStructure(ladderText);
    if (tiers.length === 0) return null;
    // Pace-project each golfer's final (pace shrunk toward field average),
    // then re-rank the field on projections.
    const priorPace = fieldAveragePace(golferStates.values());
    const pts = new Map<string, number>();
    for (const [name, st] of golferStates) pts.set(name, projectGolferFinal(st, { priorPace }));
    const entryIds = new Set(entries.map((e) => e.entryId).filter(Boolean));
    const res = projectedRoi(
      standings.entries,
      pts,
      entryIds.size > 0 ? { entryIds } : { username },
      tiers,
      Number(fee) || 0,
    );
    return res.entries > 0 ? res : null;
  }, [standings, golferStates, live, ladderText, entries, username, fee]);

  // Showdown win probability: Monte-Carlo the rest of the round from each
  // golfer's pace. Only meaningful single-round.
  const winProb = useMemo(() => {
    if (!isShowdown || !standings || !golferStates || !live || live.players.length === 0)
      return null;
    const entryIds = new Set(entries.map((e) => e.entryId).filter(Boolean));
    const wantUser = username ? normalizeName(username.replace(/\s*\(.*$/, "")) : null;
    const myIds = new Set(
      standings.entries
        .filter((e) =>
          entryIds.size > 0
            ? entryIds.has(e.entryId)
            : wantUser
              ? normalizeName(e.entryName.replace(/\s*\(.*$/, "")) === wantUser
              : false,
        )
        .map((e) => e.entryId),
    );
    if (myIds.size === 0) return null;
    return winProbability(standings.entries, golferStates, { myIds, sims: 1500 });
  }, [format, standings, golferStates, live, entries, username]);

  const lookup: CutLookup = useMemo(() => {
    const m: CutLookup = new Map();
    for (const p of proj?.players ?? []) {
      m.set(normalizeName(p.name), {
        makeCutProb: p.makeCut,
        scoreToPar: p.scoreToPar,
        thru: p.thru,
        isCut: false,
      });
    }
    return m;
  }, [proj]);

  const cutLine = proj?.cutLine ?? null;
  // Auto-detect where we are relative to the cut. The 36-hole cut settles
  // after round 2, so from round 3 on there's nothing left to sweat — the
  // line is final, not projected.
  const round = proj?.round ?? null;
  const cutIsFinal = round != null && round >= 3;
  // The cut line during round 1 is half-a-tournament's worth of noise — the
  // field hasn't sorted out yet. Hold the bubble list until round 2 starts.
  const bubbleNotReady = round == null || round < 2;

  // Field-wide bubble watch: every player within 2 strokes of the cut line
  // (either side), sorted by projected ownership so the chalkiest names on
  // the bubble surface first. Players 3+ shots clear in either direction drop
  // off. Independent of any uploaded lineup — this is the live cut sweat.
  const fieldBubble = useMemo(() => {
    if (cutLine === null || cutIsFinal) return [];
    const rows = (proj?.players ?? [])
      .filter((p) => p.scoreToPar !== null)
      .map((p) => ({
        name: p.name,
        scoreToPar: p.scoreToPar as number,
        makeCut: p.makeCut,
        thru: p.thru,
        margin: cutLine - (p.scoreToPar as number),
        own: ownership.get(normalizeName(p.name)) ?? null,
      }))
      .filter((p) => Math.abs(p.margin) <= 2);
    // Highest ownership first; ties broken by who's closest to the line.
    rows.sort(
      (a, b) => (b.own ?? -1) - (a.own ?? -1) || Math.abs(a.margin) - Math.abs(b.margin),
    );
    return rows;
  }, [proj, ownership, cutLine, cutIsFinal]);

  const haveOwnership = ownership.size > 0;

  const summaries = useMemo(
    () => summarizeByContest(entries, lookup, cutLine),
    [entries, lookup, cutLine],
  );
  const outlooks = useMemo(
    () => entries.map((e) => analyzeEntry(e, lookup, cutLine)),
    [entries, lookup, cutLine],
  );

  // Bubble: distinct golfers within 2 shots of the cut, with lineup exposure.
  const bubble = useMemo(() => {
    const exposure = new Map<string, number>();
    for (const e of entries) for (const g of e.golfers) {
      exposure.set(g, (exposure.get(g) ?? 0) + 1);
    }
    const rows: { name: string; count: number; makeCut: number; margin: number | null; score: number | null }[] = [];
    for (const [name, count] of exposure) {
      const hit = lookup.get(normalizeName(name));
      if (!hit || hit.scoreToPar === null || cutLine === null) continue;
      const margin = cutLine - hit.scoreToPar;
      if (Math.abs(margin) <= 2) rows.push({ name, count, makeCut: hit.makeCutProb, margin, score: hit.scoreToPar });
    }
    return rows.sort((a, b) => b.count - a.count || (a.margin ?? 0) - (b.margin ?? 0));
  }, [entries, lookup, cutLine]);

  const totalFees = entries.reduce((s, e) => s + e.entryFee, 0);
  const expectedSixSix = outlooks.reduce((s, o) => s + (o.distribution[o.entry.golfers.length] ?? 0), 0);

  return (
    <div className="px-5 lg:px-8 py-6 space-y-6 max-w-6xl mx-auto">
      <DfsMobileNav />
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <span className="num font-semibold uppercase" style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}>
            ● DraftKings DFS
          </span>
          <h1 className="serif-italic mt-1.5" style={{ fontSize: 36, letterSpacing: -0.4, fontStyle: "normal" }}>
            <em>Cut sweat.</em>
          </h1>
          <p className="text-text-dim mt-1" style={{ fontSize: 13.5 }}>
            {cutIsFinal ? "Cut line (final)" : "Projected cut line"}{" "}
            <strong className="num text-text">{loading ? "…" : fmtToPar(cutLine)}</strong>
            {round ? ` · round ${round}` : ""}
            {cutIsFinal ? " · cut settled" : ""}
            {proj?.source === "unavailable" ? " · DataGolf not configured" : ""}
            {proj?.source === "error" ? " · live feed unavailable" : ""}
          </p>
        </div>
        <Link href="/dashboard/dfs" className="num text-text-dim hover:text-text" style={{ fontSize: 12 }}>
          ← Lineup builder
        </Link>
      </header>

      {/* Field-wide bubble watch — the live cut sweat. Independent of any
          uploaded lineup: every golfer within 2 of the line, chalk first. */}
      {!loading && !cutIsFinal && proj?.players?.length ? (
        <section className="rounded-[14px] bg-surface-1 border border-line p-5">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <span className="num font-semibold uppercase text-text-muted" style={{ fontSize: 10, letterSpacing: 1.4 }}>
              ● Bubble watch · within 2 of the cut{haveOwnership ? " · chalk first" : ""}
            </span>
            <span className="num text-text-muted" style={{ fontSize: 11 }}>
              {bubbleNotReady
                ? "starts after round 1"
                : `cut ${fmtToPar(cutLine)} · auto-refreshing`}
            </span>
          </div>
          {bubbleNotReady ? (
            <p className="text-text-dim" style={{ fontSize: 12.5 }}>
              Waiting for round 1 to finish — the cut line is half-a-tournament
              of noise until Friday. The bubble starts as round 2 gets going.
            </p>
          ) : fieldBubble.length === 0 ? (
            <p className="text-text-dim" style={{ fontSize: 12.5 }}>
              No one is within 2 shots of the line right now — the bubble is
              quiet. This updates automatically as scores move.
            </p>
          ) : (
            <>
              <div
                className="grid gap-2 px-3 py-1.5 num font-semibold uppercase text-text-muted"
                style={{ gridTemplateColumns: "2fr 70px 70px 80px 90px", fontSize: 9.5, letterSpacing: 1 }}
              >
                <span>Player</span>
                <span className="text-right">Score</span>
                <span className="text-right">Thru</span>
                <span className="text-right">Own</span>
                <span className="text-right">Cut</span>
              </div>
              <div className="space-y-1">
                {fieldBubble.map((b) => {
                  const safe = b.margin >= 0;
                  return (
                    <div
                      key={b.name}
                      className="grid gap-2 items-center rounded-[8px] border border-line px-3 py-2 bg-bg"
                      style={{ gridTemplateColumns: "2fr 70px 70px 80px 90px", fontSize: 12.5 }}
                    >
                      <span className="text-text truncate">
                        {b.name}{" "}
                        <span className="num" style={{ fontSize: 10.5, color: safe ? GREEN : RED }}>
                          {fmtMargin(b.margin)}
                        </span>
                      </span>
                      <span className="num text-right text-text-dim">{fmtToPar(b.scoreToPar)}</span>
                      <span className="num text-right text-text-muted">
                        {b.thru == null ? "—" : b.thru >= 18 ? "F" : b.thru}
                      </span>
                      <span className="num text-right text-text">
                        {b.own == null ? "—" : `${b.own.toFixed(1)}%`}
                      </span>
                      <span className="num text-right" style={{ color: safe ? GREEN : RED, fontWeight: 600 }}>
                        {(b.makeCut * 100).toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-text-muted mt-3" style={{ fontSize: 10.5 }}>
                {haveOwnership
                  ? "Ownership is this week's projection; players 3+ shots clear (either way) drop off."
                  : "Projected ownership unavailable — sorted by distance to the cut. Players 3+ shots clear drop off."}
              </p>
            </>
          )}
        </section>
      ) : null}

      {!loading && cutIsFinal && (
        <section className="rounded-[14px] bg-surface-1 border border-line p-4">
          <p className="text-text-dim" style={{ fontSize: 12.5 }}>
            The cut is final{cutLine != null ? ` at ${fmtToPar(cutLine)}` : ""} (round {round}). Nothing left to
            sweat — the bubble watch returns next event during rounds 1–2.
          </p>
        </section>
      )}

      <div className="rounded-[14px] bg-surface-1 border border-line p-5">
        <div className="serif-italic mb-1 text-text" style={{ fontSize: 18, fontStyle: "normal" }}>
          Upload your DraftKings entries
        </div>
        <p className="text-text-dim mb-3" style={{ fontSize: 13 }}>
          Export your entries from DraftKings (the CSV with Entry ID, Contest, and your six golfers) and drop it here.
          Nothing is uploaded — it&apos;s parsed in your browser and joined to the live make-cut model.
        </p>
        <label className="inline-flex items-center gap-2 rounded-[8px] border border-line px-3 py-2 cursor-pointer hover:border-line-strong" style={{ fontSize: 13 }}>
          <input type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
          {fileName ? `📄 ${fileName}` : "Choose CSV…"}
        </label>
        {entries.length > 0 && (
          <span className="num text-text-dim ml-3" style={{ fontSize: 12 }}>
            {entries.length} entries · {summaries.length} contests · ${totalFees.toFixed(2)} in fees
          </span>
        )}
      </div>

      {/* Contest ROI — "if it ended now" from the standings CSV + payout ladder */}
      <div className="rounded-[14px] bg-surface-1 border border-line p-5">
        <div className="serif-italic mb-1 text-text" style={{ fontSize: 18, fontStyle: "normal" }}>
          Contest ROI · if it ended now
        </div>
        <p className="text-text-dim mb-3" style={{ fontSize: 13 }}>
          Upload one contest&apos;s standings CSV (the full field) and paste that contest&apos;s payout ladder.
          Your entries are matched {entries.length > 0 ? "by Entry ID from the file above" : "by your DK username"}.
        </p>

        {loadedFrom && (
          <div className="mb-4 rounded-[10px] border border-[#2faa5f] bg-bg px-3 py-2.5">
            <div className="num font-semibold" style={{ fontSize: 12, color: GREEN }}>
              Shared contest loaded · {loadedFrom}
            </div>
            <p className="text-text-dim mt-0.5" style={{ fontSize: 11.5 }}>
              Field and payouts are pre-filled. Just enter your DK username below to see your ROI.
            </p>
          </div>
        )}

        {/* Published contests — server-side fields anyone can load and just
            type their username. No CSV upload needed. */}
        {sharedList.length > 0 && (
          <div className="mb-4">
            <span className="num font-semibold uppercase text-text-muted" style={{ fontSize: 9.5, letterSpacing: 1.2 }}>
              ● Published contests · tap to load your lineups
            </span>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {sharedList.map((c) => (
                <button
                  key={c.id}
                  onClick={() => loadSharedContest(c.id)}
                  className="num inline-flex items-center gap-1.5 rounded-[6px] border border-line-strong bg-bg px-2.5 py-1.5 text-text hover:border-[#2faa5f]"
                  style={{ fontSize: 11.5 }}
                  title={`${c.fieldSize ?? "?"} entries · ${FORMAT_LABELS[c.format] ?? c.format}`}
                >
                  {c.name}
                  <span className="text-text-muted" style={{ fontSize: 10 }}>
                    {c.fieldSize ? `· ${c.fieldSize.toLocaleString()}` : ""}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-text-muted mt-1.5" style={{ fontSize: 10.5 }}>
              Pick a contest, then enter your DK username below — no upload needed.
            </p>
          </div>
        )}

        {/* Saved contests — load a stored setup, including the standings field
            when one was saved with it. */}
        {presets.length > 0 && (
          <div className="mb-4">
            <span className="num font-semibold uppercase text-text-muted" style={{ fontSize: 9.5, letterSpacing: 1.2 }}>
              ● Saved contests · tap to load
            </span>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {presets.map((p) => (
                <span
                  key={p.id}
                  className="num inline-flex items-center gap-1.5 rounded-[6px] border border-line-strong bg-bg px-2.5 py-1.5"
                  style={{ fontSize: 11.5 }}
                >
                  <button
                    onClick={() => applyPreset(p.id)}
                    className="text-text hover:text-[#2faa5f]"
                    title={
                      p.standingsName
                        ? "Load this contest's field, fee, payout ladder, format and round"
                        : "Load this contest's fee, payout ladder, format and round"
                    }
                  >
                    {p.standingsName ? "📄 " : ""}
                    {p.name}
                  </button>
                  <button
                    onClick={() => deletePreset(p.id)}
                    className="text-text-muted hover:text-[#e5544b]"
                    title="Delete preset"
                    style={{ fontSize: 14, lineHeight: 1 }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* One setup: upload CSV → name + fee → payout → save & it runs automatically */}
        <div className="space-y-4">
          <div>
            <SetupStep n={1} label="Upload standings CSV + pick the scoring format" />
            <div className="flex gap-2 flex-wrap items-center">
              <label className="inline-flex items-center gap-2 rounded-[8px] border border-line-strong px-3 py-2 cursor-pointer hover:border-[#2faa5f]" style={{ fontSize: 13 }}>
                <input type="file" accept=".csv,text/csv" onChange={onStandings} className="hidden" />
                {standingsName ? `📄 ${standingsName}` : "Choose standings CSV…"}
              </label>
              {/* Format drives the live-scoring engine: Showdown = single round
                  (DK Showdown points), Showdown R4 = same per-hole scoring plus
                  finishing-position points (it's the final round), Classic =
                  cumulative across rounds. */}
              <div className="inline-flex rounded-[8px] border border-line-strong overflow-hidden" style={{ fontSize: 12 }}>
                {(["classic", "showdown", "showdown_r4"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className="num px-3 py-2 whitespace-nowrap"
                    style={{
                      background: format === f ? GREEN : "transparent",
                      color: format === f ? "#0a1f12" : "#8a8f98",
                      fontWeight: format === f ? 600 : 400,
                    }}
                  >
                    {FORMAT_LABELS[f]}
                  </button>
                ))}
              </div>
              {format === "showdown" && (
                <input
                  value={roundParam}
                  onChange={(e) => setRoundParam(e.target.value)}
                  placeholder="Round #"
                  inputMode="numeric"
                  className="num rounded-[8px] border border-line-strong bg-bg px-3 py-2 text-text w-24 placeholder:text-text-muted focus:outline-none focus:border-[#2faa5f]"
                  style={{ fontSize: 13 }}
                  title="Which round this Showdown contest scores"
                />
              )}
            </div>
            {standings && (
              <span className="num text-text-dim" style={{ fontSize: 12 }}>
                {standings.entries.length.toLocaleString()} entries in field
                {format === "showdown_r4"
                  ? " · scored as Round 4 Showdown (incl. finish points)"
                  : format === "showdown"
                    ? " · scored as a single Showdown round"
                    : " · scored cumulative (Classic)"}
              </span>
            )}
          </div>

          <div>
            <SetupStep n={2} label="Name this contest + entry fee" />
            <div className="flex gap-2 flex-wrap">
              <input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Contest name (e.g. PGA TOUR Showdown $70K Sand Trap [$20K to 1st] R3)"
                className="num rounded-[8px] border border-line-strong bg-bg px-3 py-2 text-text flex-1 min-w-[240px] placeholder:text-text-muted focus:outline-none focus:border-[#2faa5f]"
                style={{ fontSize: 13 }}
              />
              <input
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="Fee $"
                inputMode="decimal"
                className="num rounded-[8px] border border-line-strong bg-bg px-3 py-2 text-text w-24 placeholder:text-text-muted focus:outline-none focus:border-[#2faa5f]"
                style={{ fontSize: 13 }}
              />
              {entries.length === 0 && (
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="DK username"
                  className="num rounded-[8px] border border-line-strong bg-bg px-3 py-2 text-text w-40 placeholder:text-text-muted focus:outline-none focus:border-[#2faa5f]"
                  style={{ fontSize: 13 }}
                />
              )}
            </div>
          </div>

          <div>
            <SetupStep n={3} label="Paste the payout structure" />
            <textarea
              value={ladderText}
              onChange={(e) => setLadderText(e.target.value)}
              placeholder={"1st\n$20,000\n2nd\n$10,000\n7th - 8th\n$1,000"}
              rows={4}
              className="num rounded-[8px] border border-line-strong bg-bg px-3 py-2 text-text w-full placeholder:text-text-muted focus:outline-none focus:border-[#2faa5f]"
              style={{ fontSize: 12 }}
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={saveCurrentPreset}
              disabled={!presetName.trim() || !ladderText.trim() || sharePending}
              className="num rounded-[8px] px-5 py-2.5 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                fontSize: 13,
                background: !presetName.trim() || !ladderText.trim() ? "transparent" : GREEN,
                color: !presetName.trim() || !ladderText.trim() ? "#8a8f98" : "#0a1f12",
                border: `1px solid ${!presetName.trim() || !ladderText.trim() ? "#3a3f48" : GREEN}`,
              }}
            >
              {sharePending ? "Saving…" : "Save contest"}
            </button>
            <button
              onClick={shareContest}
              disabled={sharePending || !standingsCsv || !presetName.trim() || !ladderText.trim()}
              className="num rounded-[8px] border border-line-strong px-4 py-2.5 hover:border-[#2faa5f] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ fontSize: 13 }}
              title="Publish a link anyone can open and just type their username"
            >
              {sharePending ? "Publishing…" : "Share link"}
            </button>
            <span className="num text-text-muted" style={{ fontSize: 11 }}>
              {!presetName.trim() || !ladderText.trim()
                ? "Add a name + payout structure to save or share."
                : !standingsCsv
                  ? "Save stores the setup locally; upload a CSV to also save the field for everyone."
                  : sharePending
                    ? "Saving to the website…"
                    : "Save stores the field on the website until Sunday 9pm Central — load it back any time from Published contests above."}
            </span>
          </div>

          {shareUrl && (
            <div className="rounded-[8px] border border-[#2faa5f] bg-bg px-3 py-2" style={{ fontSize: 12 }}>
              <span className="num text-text-dim">Share link (copied):</span>{" "}
              <a href={shareUrl} className="num" style={{ color: GREEN, wordBreak: "break-all" }}>{shareUrl}</a>
              <p className="num text-text-muted mt-1" style={{ fontSize: 10.5 }}>
                Anyone who opens this sees the field + payouts pre-loaded and just types their DK username.
              </p>
            </div>
          )}
          {shareError && (
            <p className="num" style={{ fontSize: 11, color: RED }}>{shareError}</p>
          )}
        </div>

        {roi && (
          <div className="mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <RoiStat label="ROI" value={`${roi.roi >= 0 ? "+" : ""}${(roi.roi * 100).toFixed(0)}%`} tone={roi.roi >= 0 ? "pos" : "neg"} />
              <RoiStat label="Net" value={`${roi.net >= 0 ? "+" : "-"}$${Math.abs(roi.net).toLocaleString()}`} tone={roi.net >= 0 ? "pos" : "neg"} />
              <RoiStat label="Prizes" value={`$${roi.prizes.toLocaleString()}`} />
              <RoiStat label="Cashing" value={`${roi.cashes}/${roi.entries}`} />
            </div>
            <div className="mt-3 space-y-1">
              {roi.detail
                .slice()
                .sort((a, b) => a.rank - b.rank)
                .map((d) => (
                  <div key={d.entryId} className="flex items-center justify-between rounded-[8px] border border-line px-3 py-1.5 bg-bg num" style={{ fontSize: 12 }}>
                    <span className="text-text-dim truncate">#{d.rank.toLocaleString()} · {d.entryName}</span>
                    <span style={{ color: d.prize > 0 ? GREEN : "#8a8f98", fontWeight: 600 }}>
                      {d.prize > 0 ? `$${d.prize.toLocaleString()}` : "—"}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
        {standings && ladderText && !roi && (
          <p className="text-text-dim mt-3" style={{ fontSize: 12 }}>
            No matching entries found — {entries.length > 0 ? "the standings file may be for a different contest than your entries." : "enter the DK username exactly as it appears in the standings."}
          </p>
        )}

        {/* Projected ROI — re-rank the whole field from live scoring */}
        {standings && (
          <div className="mt-5 pt-4 border-t border-line">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <span className="num font-semibold uppercase text-text-muted" style={{ fontSize: 10, letterSpacing: 1.4 }}>
                ● Projected ROI · where it&apos;s heading
              </span>
              <div className="flex items-center gap-2">
                <span className="num capitalize text-text-dim" style={{ fontSize: 11 }}>
                  {FORMAT_LABELS[format]}{isShowdown && effectiveRound ? ` · R${effectiveRound}` : ""} scoring
                </span>
                <button
                  onClick={pullLive}
                  disabled={livePending}
                  className="num rounded-[8px] border border-line-strong px-3 py-1.5 hover:border-[#2faa5f] disabled:opacity-50"
                  style={{ fontSize: 12 }}
                >
                  {livePending ? "Pulling…" : "Pull live scores"}
                </button>
              </div>
            </div>

            {format === "showdown" && !effectiveRound && (
              <p className="num mb-3" style={{ fontSize: 11, color: RED }}>
                ⚠ No contest round set — scoring the live tournament round
                {live?.round != null ? ` (R${live.round})` : ""}. If this is a past-round contest
                (e.g. a Round 3 Showdown), set the round in step 1 above.
              </p>
            )}
            {live && live.players.length > 0 && (
              <p className="num text-text-dim mb-3" style={{ fontSize: 11 }}>
                {live.event ?? "live"}
                {live.course ? ` · ${live.course}` : ""} ·{" "}
                <span style={{ color: matchedGolfers > 0 ? GREEN : "#c9a23a" }}>
                  {matchedGolfers} golfers live
                </span>
                {live.realParHoles != null && (
                  <>
                    {" · "}
                    <span style={{ color: live.realParHoles === 18 ? GREEN : RED }}>
                      {live.realParHoles}/18 holes on real scorecard par
                      {live.realParHoles < 18 ? " (rest estimated — scores may be off)" : ""}
                    </span>
                  </>
                )}
              </p>
            )}
            {fieldMatch && (
              <p className="num mb-3" style={{ fontSize: 11 }}>
                <span style={{ color: fieldMatch.unmatched.length === 0 ? GREEN : "#c9a23a" }}>
                  {fieldMatch.matched}/{fieldMatch.total} field golfers matched to live scores
                </span>
                {fieldMatch.unmatched.length > 0 && (
                  <span className="text-text-muted">
                    {" "}· unmatched (using CSV value, may skew ranks):{" "}
                    {fieldMatch.unmatched.slice(0, 12).join(", ")}
                    {fieldMatch.unmatched.length > 12 ? ` +${fieldMatch.unmatched.length - 12} more` : ""}
                  </span>
                )}
              </p>
            )}
            {live && live.players.length === 0 && (
              <p className="text-text-dim mb-3" style={{ fontSize: 12 }}>
                No live scoring available — either no round is in progress or the feed has no hole data yet.
              </p>
            )}

            {projected && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <RoiStat label="Proj ROI" value={`${projected.roi >= 0 ? "+" : ""}${(projected.roi * 100).toFixed(0)}%`} tone={projected.roi >= 0 ? "pos" : "neg"} />
                  <RoiStat label="Proj net" value={`${projected.net >= 0 ? "+" : "-"}$${Math.abs(projected.net).toLocaleString()}`} tone={projected.net >= 0 ? "pos" : "neg"} />
                  <RoiStat label="Proj prizes" value={`$${projected.prizes.toLocaleString()}`} />
                  <RoiStat label="Cashing" value={`${projected.cashes}/${projected.entries}`} />
                </div>
                <div className="mt-3 space-y-1">
                  {projected.detail
                    .slice()
                    .sort((a, b) => a.rank - b.rank)
                    .map((d) => {
                      const ent = standings?.entries.find((e) => e.entryId === d.entryId);
                      const prior = golferStates ? fieldAveragePace(golferStates.values()) : 2;
                      return (
                        <div key={d.entryId} className="rounded-[8px] border border-line bg-bg" style={{ fontSize: 12 }}>
                          <div className="flex items-center justify-between px-3 py-1.5 num">
                            <span className="text-text-dim truncate">proj #{d.rank.toLocaleString()} · {d.entryName}</span>
                            <span style={{ color: d.prize > 0 ? GREEN : "#8a8f98", fontWeight: 600 }}>
                              {d.prize > 0 ? `$${d.prize.toLocaleString()}` : "—"}
                            </span>
                          </div>
                          {ent && golferStates && (() => {
                            const sts = ent.golfers
                              .map((g) => golferStates.get(normalizeName(g)))
                              .filter((s): s is GolferState => !!s);
                            const totalPts = sts.reduce((s, st) => s + st.points, 0);
                            const phr = sts.reduce((s, st) => s + st.holesRemaining, 0);
                            const totalProj = sts.reduce((s, st) => s + projectGolferFinal(st, { priorPace: prior }), 0);
                            return (
                              <div className="px-3 pb-2 pt-0.5 border-t border-line/60">
                                {ent.golfers.map((g) => {
                                  const st = golferStates.get(normalizeName(g));
                                  if (!st) return null;
                                  const proj = projectGolferFinal(st, { priorPace: prior });
                                  return (
                                    <div key={g} className="flex items-center justify-between num text-text-dim" style={{ fontSize: 10.5, padding: "1px 0" }}>
                                      <span className="truncate" style={{ maxWidth: "55%" }}>{g}</span>
                                      <span>
                                        {st.points.toFixed(1)} pt · thru {st.holesPlayed} ({st.holesRemaining} left) →{" "}
                                        <span className="text-text" style={{ fontWeight: 600 }}>{proj.toFixed(1)}</span>
                                      </span>
                                    </div>
                                  );
                                })}
                                <div className="flex items-center justify-between num mt-1 pt-1 border-t border-line/40" style={{ fontSize: 11.5 }}>
                                  <span className="text-text" style={{ fontWeight: 700 }}>
                                    {totalPts.toFixed(1)} pt
                                  </span>
                                  <span className="text-text-dim">
                                    <span className="text-text" style={{ fontWeight: 600 }}>{phr}</span> PHR left ·
                                    proj <span className="text-text" style={{ fontWeight: 600 }}>{totalProj.toFixed(1)}</span>
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                </div>
                {projected.unmatchedGolfers.length > 0 && (
                  <p className="text-text-dim mt-2" style={{ fontSize: 11 }}>
                    No live score for: {projected.unmatchedGolfers.join(", ")} (counted as 0)
                  </p>
                )}
              </>
            )}

            {winProb && (
              <div className="mt-4 pt-3 border-t border-line">
                <div className="flex items-center justify-between mb-2">
                  <span className="num font-semibold uppercase text-text-muted" style={{ fontSize: 10, letterSpacing: 1.4 }}>
                    ● Chance of winning · pace-adjusted
                  </span>
                  <span className="num text-text-dim" style={{ fontSize: 11 }}>
                    {winProb.totalHolesRemaining} golfer-holes left
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <RoiStat
                    label="Win (any entry)"
                    value={`${(winProb.anyMine * 100).toFixed(1)}%`}
                    tone={winProb.anyMine > 0 ? "pos" : undefined}
                  />
                </div>
                <div className="mt-3 space-y-1">
                  {[...winProb.perEntry.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .map(([id, p]) => {
                      const entry = standings?.entries.find((e) => e.entryId === id);
                      return (
                        <div key={id} className="flex items-center justify-between rounded-[8px] border border-line px-3 py-1.5 bg-bg num" style={{ fontSize: 12 }}>
                          <span className="text-text-dim truncate">
                            proj #{winProb.projectedRank.get(id)?.toLocaleString() ?? "?"} · {entry?.entryName ?? id}
                          </span>
                          <span style={{ color: p > 0.01 ? GREEN : "#8a8f98", fontWeight: 600 }}>
                            {(p * 100).toFixed(1)}% win
                          </span>
                        </div>
                      );
                    })}
                </div>
                <p className="text-text-muted mt-2" style={{ fontSize: 10.5 }}>
                  Projects each golfer&apos;s points-per-hole over their remaining holes, then simulates the rest of the
                  round 1,500×. Most reliable late, when fewer holes remain.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <PortfolioRoi
        entryIds={new Set(entries.map((e) => e.entryId).filter(Boolean))}
        username={username}
      />

      {entries.length > 0 && (
        <>
          {/* Survival by contest — expected entries at each survival level */}
          <section className="rounded-[14px] bg-surface-1 border border-line p-5">
            <div className="num font-semibold uppercase text-text-muted mb-3" style={{ fontSize: 10, letterSpacing: 1.4 }}>
              ● Projected survival by contest
            </div>
            <div className="space-y-3">
              {summaries.map((s) => {
                const slots = s.expectedByLevel.length - 1;
                const levels = [slots, slots - 1, slots - 2].filter((k) => k >= 0);
                const max = s.entries;
                return (
                  <div key={s.contestId || s.contest}>
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <span className="text-text truncate" style={{ fontSize: 13 }}>{s.contest || "(unnamed)"}</span>
                      <span className="num text-text-dim shrink-0" style={{ fontSize: 11 }}>{s.entries} entries · ${s.entryFee}</span>
                    </div>
                    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${levels.length}, 1fr)` }}>
                      {levels.map((k) => {
                        const v = s.expectedByLevel[k] ?? 0;
                        const pct = max ? (v / max) * 100 : 0;
                        const color = k === slots ? GREEN : k === slots - 1 ? "#c9a23a" : RED;
                        return (
                          <div key={k}>
                            <div className="num text-text-dim mb-0.5" style={{ fontSize: 10.5 }}>
                              {k}/{slots} · {v.toFixed(1)}
                            </div>
                            <div className="rounded-[6px] overflow-hidden bg-bg" style={{ height: 22 }}>
                              <div style={{ width: `${pct}%`, height: "100%", background: color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Bubble watch */}
          {bubble.length > 0 && (
            <section className="rounded-[14px] bg-surface-1 border border-line p-5">
              <div className="num font-semibold uppercase text-text-muted mb-3" style={{ fontSize: 10, letterSpacing: 1.4 }}>
                ● Your golfers within 2 of the cut
              </div>
              <div className="space-y-1.5">
                {bubble.map((b) => (
                  <div key={b.name} className="flex items-center justify-between rounded-[8px] border border-line px-3 py-2 bg-bg">
                    <span className="text-text" style={{ fontSize: 13 }}>
                      {b.name} <span className="num text-text-dim" style={{ fontSize: 11 }}>· in {b.count} lineups</span>
                    </span>
                    <span className="num" style={{ fontSize: 12 }}>
                      <span className="text-text-dim">{fmtToPar(b.score)} · {(b.makeCut * 100).toFixed(0)}% cut · </span>
                      <span style={{ color: (b.margin ?? 0) >= 0 ? GREEN : RED, fontWeight: 600 }}>{fmtMargin(b.margin)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Per-lineup detail */}
          <section className="rounded-[14px] bg-surface-1 border border-line p-5">
            <div className="num font-semibold uppercase text-text-muted mb-3" style={{ fontSize: 10, letterSpacing: 1.4 }}>
              ● Lineups · {expectedSixSix.toFixed(1)} projected to go {entries[0]?.golfers.length ?? 6}/{entries[0]?.golfers.length ?? 6}
            </div>
            <div className="space-y-2">
              {outlooks.map((o, i) => {
                const slots = o.entry.golfers.length;
                return (
                  <div key={o.entry.entryId || i} className="rounded-[10px] border border-line p-3 bg-bg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="num text-text-dim truncate" style={{ fontSize: 11 }}>{o.entry.contest || o.entry.entryId}</span>
                      <span className="num" style={{ fontSize: 12 }}>
                        <span className="text-text-dim">E[alive] </span>
                        <span className="text-text font-semibold">{o.expectedAlive.toFixed(2)}/{slots}</span>
                        <span className="text-text-dim"> · {slots}/{slots} </span>
                        <span style={{ color: GREEN, fontWeight: 600 }}>{(o.pAllMakeCut * 100).toFixed(0)}%</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {o.golfers.map((g) => {
                        const safe = (g.margin ?? 1) >= 0;
                        return (
                          <span
                            key={g.name}
                            className="num rounded-[6px] px-2 py-1"
                            title={g.found ? `${(g.makeCutProb * 100).toFixed(0)}% make cut` : "not found in live field"}
                            style={{
                              fontSize: 11,
                              background: !g.found ? "rgba(255,255,255,0.05)" : safe ? "rgba(47,170,95,0.14)" : "rgba(229,84,75,0.14)",
                              border: `1px solid ${!g.found ? "rgba(255,255,255,0.12)" : safe ? "rgba(47,170,95,0.4)" : "rgba(229,84,75,0.4)"}`,
                              color: !g.found ? "#9aa" : safe ? GREEN : RED,
                            }}
                          >
                            {g.name} {g.found ? fmtToPar(g.scoreToPar) : "?"}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <p className="text-text-muted" style={{ fontSize: 11 }}>
            Survival assumes independent make-cut probabilities from DataGolf&apos;s live model. Dollar ROI isn&apos;t shown
            yet — it needs each contest&apos;s payout structure, which isn&apos;t in the entries export. Upload a
            contest-standings CSV (with the payout column) and we can simulate placement ROI next.
          </p>
        </>
      )}
    </div>
  );
}

function SetupStep({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span
        className="num inline-flex items-center justify-center rounded-full font-semibold"
        style={{ width: 18, height: 18, fontSize: 10.5, background: "rgba(47,170,95,0.18)", color: GREEN }}
      >
        {n}
      </span>
      <span className="num uppercase text-text-muted" style={{ fontSize: 10, letterSpacing: 1.1 }}>
        {label}
      </span>
    </div>
  );
}

function RoiStat({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  const color = tone === "pos" ? GREEN : tone === "neg" ? RED : "#f0ebe0";
  return (
    <div className="rounded-[12px] border border-line p-3 bg-bg">
      <div className="num uppercase text-text-muted" style={{ fontSize: 9.5, letterSpacing: 1.2 }}>{label}</div>
      <div className="num font-semibold mt-1" style={{ fontSize: 20, color }}>{value}</div>
    </div>
  );
}
