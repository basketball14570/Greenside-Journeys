"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  parseEntriesCsv,
  analyzeEntry,
  summarizeByContest,
  normalizeName,
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

type LivePoints = {
  source: string;
  event?: string | null;
  state?: string | null;
  parCoverage?: number | null;
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

type ContestPreset = {
  id: string;
  name: string;
  ladder: string;
  fee: string;
  format: "classic" | "showdown";
  round: string;
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
  const [standings, setStandings] = useState<ContestStandings | null>(null);
  const [standingsName, setStandingsName] = useState<string | null>(null);
  const [ladderText, setLadderText] = useState("");
  const [fee, setFee] = useState("");
  const [username, setUsername] = useState("");
  const [format, setFormat] = useState<"classic" | "showdown">("classic");
  const [roundParam, setRoundParam] = useState("");
  const [live, setLive] = useState<LivePoints | null>(null);
  const [livePending, setLivePending] = useState(false);
  const [presets, setPresets] = useState<ContestPreset[]>([]);
  const [presetName, setPresetName] = useState("");

  useEffect(() => {
    setPresets(loadPresets());
  }, []);

  function persistPresets(next: ContestPreset[]) {
    setPresets(next);
    try {
      localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
    } catch {}
  }

  function saveCurrentPreset() {
    const name = presetName.trim();
    if (!name || !ladderText.trim()) return;
    const preset: ContestPreset = {
      id: `${Date.now()}`,
      name,
      ladder: ladderText,
      fee,
      format,
      round: roundParam,
    };
    // Replace an existing preset with the same name, otherwise append.
    const next = [...presets.filter((p) => p.name !== name), preset];
    persistPresets(next);
    setPresetName("");
  }

  function applyPreset(id: string) {
    const p = presets.find((x) => x.id === id);
    if (!p) return;
    setLadderText(p.ladder);
    setFee(p.fee);
    setFormat(p.format);
    setRoundParam(p.round);
  }

  function deletePreset(id: string) {
    persistPresets(presets.filter((p) => p.id !== id));
  }

  useEffect(() => {
    fetch("/api/dfs/cut-projection", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: Projection) => setProj(j))
      .catch(() => setProj({ source: "error", cutLine: null, players: [] }))
      .finally(() => setLoading(false));
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
    setStandingsName(f.name);
    setStandings(parseStandingsCsv(await f.text()));
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

  async function pullLive() {
    setLivePending(true);
    const qs = new URLSearchParams({ format });
    if (roundParam) qs.set("round", roundParam);
    try {
      const r = await fetch(`/api/dfs/live-points?${qs}`, { cache: "no-store" });
      setLive(await r.json());
    } catch {
      setLive({ source: "error", players: [] });
    } finally {
      setLivePending(false);
    }
  }

  // Per-golfer state for projections: CURRENT points come from the standings
  // CSV's FPTS column (DK-official, and the names match the lineup column
  // exactly); HOLES PLAYED come from ESPN's live `thru` (no hole-par needed).
  // This is why projections work even when ESPN omits hole pars.
  const golferStates = useMemo(() => {
    if (!standings) return null;
    // Live points (computed from ESPN holes) are always fresh, so prefer them
    // — this works even when the CSV was exported at lock (FPTS all 0). Fall
    // back to the CSV's FPTS for any golfer ESPN hasn't listed.
    const liveByName = new Map<string, { points: number; thru: number }>();
    for (const p of live?.players ?? [])
      liveByName.set(normalizeName(p.name), { points: p.points, thru: p.thru ?? 18 });
    const states = new Map<string, GolferState>();
    for (const pl of standings.players) {
      const key = normalizeName(pl.name);
      const l = liveByName.get(key);
      const points = l ? l.points : pl.fpts;
      const thru = l ? l.thru : 18; // unknown → treat as done
      states.set(key, { points, holesPlayed: thru, holesRemaining: Math.max(0, 18 - thru) });
    }
    return states;
  }, [standings, live]);

  const matchedGolfers = useMemo(() => {
    if (!golferStates || !live) return 0;
    const thru = new Set((live.players ?? []).map((p) => normalizeName(p.name)));
    let n = 0;
    for (const k of golferStates.keys()) if (thru.has(k)) n++;
    return n;
  }, [golferStates, live]);

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
    if (format !== "showdown" || !standings || !golferStates || !live || live.players.length === 0)
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
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <span className="num font-semibold uppercase" style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}>
            ● DraftKings DFS
          </span>
          <h1 className="serif-italic mt-1.5" style={{ fontSize: 36, letterSpacing: -0.4, fontStyle: "normal" }}>
            <em>Cut sweat.</em>
          </h1>
          <p className="text-text-dim mt-1" style={{ fontSize: 13.5 }}>
            Projected cut line{" "}
            <strong className="num text-text">{loading ? "…" : fmtToPar(cutLine)}</strong>
            {proj?.round ? ` · round ${proj.round}` : ""}
            {proj?.source === "unavailable" ? " · DataGolf not configured" : ""}
            {proj?.source === "error" ? " · live feed unavailable" : ""}
          </p>
        </div>
        <Link href="/dashboard/dfs" className="num text-text-dim hover:text-text" style={{ fontSize: 12 }}>
          ← Lineup builder
        </Link>
      </header>

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

        {/* Saved contests — load a stored setup (CSV is still re-uploaded fresh each round) */}
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
                    title="Load this contest's fee, payout ladder, format and round"
                  >
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
            <SetupStep n={1} label="Upload this contest's standings CSV" />
            <label className="inline-flex items-center gap-2 rounded-[8px] border border-line-strong px-3 py-2 cursor-pointer hover:border-[#2faa5f]" style={{ fontSize: 13 }}>
              <input type="file" accept=".csv,text/csv" onChange={onStandings} className="hidden" />
              {standingsName ? `📄 ${standingsName}` : "Choose standings CSV…"}
            </label>
            {standings && (
              <span className="num text-text-dim ml-3" style={{ fontSize: 12 }}>
                {standings.entries.length.toLocaleString()} entries in field
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
              disabled={!presetName.trim() || !ladderText.trim()}
              className="num rounded-[8px] px-5 py-2.5 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                fontSize: 13,
                background: !presetName.trim() || !ladderText.trim() ? "transparent" : GREEN,
                color: !presetName.trim() || !ladderText.trim() ? "#8a8f98" : "#0a1f12",
                border: `1px solid ${!presetName.trim() || !ladderText.trim() ? "#3a3f48" : GREEN}`,
              }}
            >
              Save contest
            </button>
            <span className="num text-text-muted" style={{ fontSize: 11 }}>
              {!presetName.trim() || !ladderText.trim()
                ? "Add a name + payout structure to save."
                : standings
                  ? "Saved contests reload instantly — results update automatically below."
                  : "Saved. Upload the standings CSV above and ROI runs automatically."}
            </span>
          </div>
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
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as "classic" | "showdown")}
                  className="num rounded-[8px] border border-line bg-bg px-2 py-1.5 text-text"
                  style={{ fontSize: 12 }}
                >
                  <option value="classic">Classic</option>
                  <option value="showdown">Showdown</option>
                </select>
                {format === "showdown" && (
                  <input
                    value={roundParam}
                    onChange={(e) => setRoundParam(e.target.value)}
                    placeholder="Rd"
                    inputMode="numeric"
                    className="num rounded-[8px] border border-line bg-bg px-2 py-1.5 text-text w-14"
                    style={{ fontSize: 12 }}
                  />
                )}
                <button
                  onClick={pullLive}
                  disabled={livePending}
                  className="num rounded-[8px] border border-line px-3 py-1.5 hover:border-line-strong disabled:opacity-50"
                  style={{ fontSize: 12 }}
                >
                  {livePending ? "Pulling…" : "Pull live scores"}
                </button>
              </div>
            </div>

            {live && live.players.length > 0 && (
              <p className="num text-text-dim mb-3" style={{ fontSize: 11 }}>
                {live.event ?? "live"} · projecting from CSV points + live pace ·{" "}
                <span style={{ color: matchedGolfers > 0 ? GREEN : "#c9a23a" }}>
                  {matchedGolfers} golfers with live holes-played
                </span>
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
                          {ent && golferStates && (
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
                            </div>
                          )}
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
