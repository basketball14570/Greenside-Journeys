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

type Projection = {
  source: string;
  cutLine: number | null;
  lastUpdate?: string | null;
  round?: number | null;
  players: { name: string; makeCut: number; scoreToPar: number | null; thru: number | null }[];
};

const GREEN = "#2faa5f";
const RED = "#e5544b";

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

  useEffect(() => {
    fetch("/api/dfs/cut-projection", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: Projection) => setProj(j))
      .catch(() => setProj({ source: "error", cutLine: null, players: [] }))
      .finally(() => setLoading(false));
  }, []);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setEntries(parseEntriesCsv(await f.text()));
  }

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
