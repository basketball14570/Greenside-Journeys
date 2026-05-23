"use client";

import { useMemo, useState } from "react";
import {
  parseStandingsCsv,
  parsePayoutStructure,
  findMyEntries,
  currentRoi,
  type ContestStandings,
} from "@/lib/dfs/payouts";

const GREEN = "#2faa5f";
const RED = "#e5544b";

type Slot = {
  id: number;
  name: string;
  standings: ContestStandings | null;
  ladderText: string;
  fee: string;
};

let nextId = 1;
const blankSlot = (): Slot => ({ id: nextId++, name: "", standings: null, ladderText: "", fee: "" });

// Portfolio ROI across several contests at once: one standings CSV + ladder +
// fee per contest, summed into a combined "if it ended now" line. Matching
// reuses Entry IDs (from the entries CSV) or the saved DK username.
export function PortfolioRoi({ entryIds, username }: { entryIds: Set<string>; username: string }) {
  const [slots, setSlots] = useState<Slot[]>([blankSlot()]);

  function patch(id: number, next: Partial<Slot>) {
    setSlots((s) => s.map((x) => (x.id === id ? { ...x, ...next } : x)));
  }
  async function onFile(id: number, e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    patch(id, { name: f.name, standings: parseStandingsCsv(await f.text()) });
  }

  const rows = useMemo(() => {
    return slots.map((slot) => {
      if (!slot.standings) return { slot, roi: null };
      const tiers = parsePayoutStructure(slot.ladderText);
      if (tiers.length === 0) return { slot, roi: null };
      const mine = findMyEntries(slot.standings.entries, entryIds.size > 0 ? { entryIds } : { username });
      if (mine.length === 0) return { slot, roi: null };
      return { slot, roi: currentRoi(mine, tiers, slot.standings.tieCounts, Number(slot.fee) || 0) };
    });
  }, [slots, entryIds, username]);

  const total = useMemo(() => {
    const live = rows.filter((r) => r.roi);
    const fees = live.reduce((s, r) => s + r.roi!.fees, 0);
    const prizes = live.reduce((s, r) => s + r.roi!.prizes, 0);
    const entries = live.reduce((s, r) => s + r.roi!.entries, 0);
    const cashes = live.reduce((s, r) => s + r.roi!.cashes, 0);
    return { contests: live.length, fees, prizes, entries, cashes, net: prizes - fees, roi: fees ? (prizes - fees) / fees : 0 };
  }, [rows]);

  return (
    <div className="rounded-[14px] bg-surface-1 border border-line p-5">
      <div className="serif-italic mb-1 text-text" style={{ fontSize: 18, fontStyle: "normal" }}>
        Portfolio ROI · all your contests
      </div>
      <p className="text-text-dim mb-3" style={{ fontSize: 13 }}>
        Add each contest&apos;s standings CSV + payout ladder for a combined &ldquo;if it ended now&rdquo; line across
        every contest you&apos;re in.
      </p>

      {total.contests > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <Stat label="Combined ROI" value={`${total.roi >= 0 ? "+" : ""}${(total.roi * 100).toFixed(0)}%`} tone={total.roi >= 0 ? "pos" : "neg"} />
          <Stat label="Net" value={`${total.net >= 0 ? "+" : "-"}$${Math.abs(total.net).toLocaleString()}`} tone={total.net >= 0 ? "pos" : "neg"} />
          <Stat label="Prizes" value={`$${total.prizes.toLocaleString()}`} />
          <Stat label="Cashing" value={`${total.cashes}/${total.entries}`} />
        </div>
      )}

      <div className="space-y-3">
        {slots.map((slot, i) => {
          const roi = rows.find((r) => r.slot.id === slot.id)?.roi ?? null;
          return (
            <div key={slot.id} className="rounded-[10px] border border-line p-3 bg-bg">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <label className="inline-flex items-center gap-2 rounded-[8px] border border-line px-3 py-1.5 cursor-pointer hover:border-line-strong" style={{ fontSize: 12 }}>
                  <input type="file" accept=".csv,text/csv" onChange={(e) => onFile(slot.id, e)} className="hidden" />
                  {slot.name ? `📄 ${slot.name}` : `Contest ${i + 1} standings…`}
                </label>
                <input
                  value={slot.fee}
                  onChange={(e) => patch(slot.id, { fee: e.target.value })}
                  placeholder="Fee $"
                  inputMode="decimal"
                  className="num rounded-[8px] border border-line bg-bg px-2 py-1.5 text-text w-24"
                  style={{ fontSize: 12 }}
                />
                {roi && (
                  <span className="num ml-auto" style={{ fontSize: 12 }}>
                    <span className="text-text-dim">{roi.cashes}/{roi.entries} cashing · </span>
                    <span style={{ color: roi.net >= 0 ? GREEN : RED, fontWeight: 600 }}>
                      {roi.net >= 0 ? "+" : "-"}${Math.abs(roi.net).toLocaleString()}
                    </span>
                  </span>
                )}
                {slots.length > 1 && (
                  <button
                    onClick={() => setSlots((s) => s.filter((x) => x.id !== slot.id))}
                    className="num text-text-dim hover:text-text"
                    style={{ fontSize: 14 }}
                    aria-label="Remove contest"
                  >
                    ✕
                  </button>
                )}
              </div>
              <textarea
                value={slot.ladderText}
                onChange={(e) => patch(slot.id, { ladderText: e.target.value })}
                placeholder={"Paste this contest's payout ladder…"}
                rows={2}
                className="num w-full rounded-[8px] border border-line bg-bg px-3 py-2 text-text"
                style={{ fontSize: 12 }}
              />
              {slot.standings && !roi && slot.ladderText && (
                <p className="text-text-dim mt-1" style={{ fontSize: 11 }}>
                  No matching entries — check the file is yours and the username/Entry IDs line up.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setSlots((s) => [...s, blankSlot()])}
        className="num mt-3 rounded-[8px] border border-line px-3 py-1.5 hover:border-line-strong"
        style={{ fontSize: 12 }}
      >
        + Add contest
      </button>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  const color = tone === "pos" ? GREEN : tone === "neg" ? RED : "#f0ebe0";
  return (
    <div className="rounded-[12px] border border-line p-3 bg-bg">
      <div className="num uppercase text-text-muted" style={{ fontSize: 9.5, letterSpacing: 1.2 }}>{label}</div>
      <div className="num font-semibold mt-1" style={{ fontSize: 20, color }}>{value}</div>
    </div>
  );
}
