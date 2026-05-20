"use client";

import { useState } from "react";

// Manual bet entry — type a bet straight into your account, no OCR.
// Builds a market string the live grader understands (including 2-ball /
// 3-ball matchups, which encode opponents as "... vs A / B") and posts
// to /api/bets/save. Lands as a pending ticket to confirm on Tickets.

type BetType =
  | "matchup2"
  | "matchup3"
  | "top"
  | "towin"
  | "makecut"
  | "round_score"
  | "birdies"
  | "bogeys";

const BOOKS = [
  { v: "draftkings", label: "DraftKings" },
  { v: "fanduel", label: "FanDuel" },
  { v: "prizepicks", label: "PrizePicks" },
  { v: "underdog", label: "Underdog" },
  { v: "caesars", label: "Caesars" },
  { v: "betmgm", label: "BetMGM" },
  { v: "other", label: "Other (Hard Rock, etc.)" },
];

const TYPES: { v: BetType; label: string; needsOpp: 0 | 1 | 2; ou: boolean; line: boolean }[] = [
  { v: "matchup2", label: "2-ball matchup", needsOpp: 1, ou: false, line: false },
  { v: "matchup3", label: "3-ball matchup", needsOpp: 2, ou: false, line: false },
  { v: "top", label: "Top finish (Top N)", needsOpp: 0, ou: false, line: true },
  { v: "towin", label: "To win", needsOpp: 0, ou: false, line: false },
  { v: "makecut", label: "Make / miss cut", needsOpp: 0, ou: false, line: false },
  { v: "round_score", label: "Round score O/U", needsOpp: 0, ou: true, line: true },
  { v: "birdies", label: "Birdies or better O/U", needsOpp: 0, ou: true, line: true },
  { v: "bogeys", label: "Bogeys or worse O/U", needsOpp: 0, ou: true, line: true },
];

function toWinFromOdds(stake: number, odds: number): number {
  if (!odds) return 0;
  return odds > 0 ? (stake * odds) / 100 : (stake * 100) / Math.abs(odds);
}

export function ManualBetEntry() {
  const [book, setBook] = useState("draftkings");
  const [type, setType] = useState<BetType>("matchup2");
  const [player, setPlayer] = useState("");
  const [opp1, setOpp1] = useState("");
  const [opp2, setOpp2] = useState("");
  const [round, setRound] = useState(1);
  const [topN, setTopN] = useState(10);
  const [ouSide, setOuSide] = useState<"over" | "under">("over");
  const [lineVal, setLineVal] = useState("");
  const [odds, setOdds] = useState("");
  const [stake, setStake] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const cfg = TYPES.find((t) => t.v === type)!;

  function buildMarket(): string {
    switch (type) {
      case "matchup2":
        return `R${round} 2-ball vs ${opp1.trim()}`;
      case "matchup3":
        return `R${round} 3-ball vs ${opp1.trim()} / ${opp2.trim()}`;
      case "top":
        return `Top ${topN}`;
      case "towin":
        return "To win";
      case "makecut":
        return "Make cut";
      case "round_score":
        return `R${round} round score ${ouSide}`;
      case "birdies":
        return `R${round} birdies or better ${ouSide}`;
      case "bogeys":
        return `R${round} bogeys or worse ${ouSide}`;
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!player.trim()) return setMsg({ ok: false, text: "Enter the player." });
    if (cfg.needsOpp >= 1 && !opp1.trim())
      return setMsg({ ok: false, text: "Enter the opponent." });
    if (cfg.needsOpp >= 2 && !opp2.trim())
      return setMsg({ ok: false, text: "Enter both opponents." });
    const stakeNum = Number(stake);
    if (!stakeNum || stakeNum <= 0)
      return setMsg({ ok: false, text: "Enter a stake (units)." });
    const oddsNum = Number(odds) || 0;
    const lineNum = cfg.line && lineVal !== "" ? Number(lineVal) : null;
    if (cfg.line && (lineNum === null || Number.isNaN(lineNum)))
      return setMsg({ ok: false, text: "Enter the line." });

    setBusy(true);
    try {
      const bet = {
        book,
        player: player.trim(),
        market: buildMarket(),
        line: type === "top" ? topN : lineNum,
        americanOdds: oddsNum,
        stake: stakeNum,
        toWin: Number(toWinFromOdds(stakeNum, oddsNum).toFixed(2)),
        confidence: 1,
      };
      const r = await fetch("/api/bets/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bets: [bet], source: "manual" }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 401) throw new Error("Sign in to save bets.");
        throw new Error(j.error ?? `Save failed (${r.status})`);
      }
      setMsg({ ok: true, text: "Saved. Confirm it on Tickets, then it tracks on Live." });
      setPlayer("");
      setOpp1("");
      setOpp2("");
      setLineVal("");
      setOdds("");
      setStake("");
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[14px] border border-line bg-surface-1 p-5">
      <div
        className="num font-semibold uppercase mb-3"
        style={{ fontSize: 10.5, letterSpacing: 1.2, color: "#8ee68e" }}
      >
        ✎ Enter manually
      </div>
      <p className="text-text-dim mb-4" style={{ fontSize: 13, lineHeight: 1.45 }}>
        Type a bet straight in — no screenshot. Best for matchups: 2-ball and
        3-ball legs track live against the leaderboard.
      </p>

      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Book">
            <Select value={book} onChange={setBook} options={BOOKS.map((b) => ({ v: b.v, label: b.label }))} />
          </Field>
          <Field label="Bet type">
            <Select
              value={type}
              onChange={(v) => setType(v as BetType)}
              options={TYPES.map((t) => ({ v: t.v, label: t.label }))}
            />
          </Field>
        </div>

        <Field label="Your player">
          <Input value={player} onChange={setPlayer} placeholder="e.g. Mac Meissner" />
        </Field>

        {cfg.needsOpp >= 1 && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Opponent 1">
              <Input value={opp1} onChange={setOpp1} placeholder="e.g. Adam Svensson" />
            </Field>
            {cfg.needsOpp >= 2 && (
              <Field label="Opponent 2">
                <Input value={opp2} onChange={setOpp2} placeholder="e.g. Dylan Wu" />
              </Field>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          {(cfg.needsOpp > 0 || cfg.ou || type === "round_score") && (
            <Field label="Round">
              <Select
                value={String(round)}
                onChange={(v) => setRound(Number(v))}
                options={[1, 2, 3, 4].map((n) => ({ v: String(n), label: `R${n}` }))}
              />
            </Field>
          )}
          {type === "top" && (
            <Field label="Top N">
              <Select
                value={String(topN)}
                onChange={(v) => setTopN(Number(v))}
                options={[5, 10, 20, 30, 40].map((n) => ({ v: String(n), label: `Top ${n}` }))}
              />
            </Field>
          )}
          {cfg.ou && (
            <>
              <Field label="Side">
                <Select
                  value={ouSide}
                  onChange={(v) => setOuSide(v as "over" | "under")}
                  options={[{ v: "over", label: "Over" }, { v: "under", label: "Under" }]}
                />
              </Field>
              <Field label="Line">
                <Input value={lineVal} onChange={setLineVal} placeholder="e.g. 4.5" inputMode="decimal" />
              </Field>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="American odds">
            <Input value={odds} onChange={setOdds} placeholder="e.g. +110 or -130" />
          </Field>
          <Field label="Stake (units)">
            <Input value={stake} onChange={setStake} placeholder="e.g. 1" inputMode="decimal" />
          </Field>
        </div>

        {msg && (
          <div style={{ fontSize: 13, color: msg.ok ? "#8ee68e" : "#e57373" }}>
            {msg.text}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full px-5 py-2.5 rounded font-semibold disabled:opacity-50"
          style={{ background: "#8ee68e", color: "#06140c", fontSize: 14 }}
        >
          {busy ? "Saving…" : "Add to my tickets"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span
        className="num text-text-muted block mb-1 uppercase"
        style={{ fontSize: 9.5, letterSpacing: 0.9 }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "decimal";
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      className="w-full bg-bg border border-line rounded px-3 py-2 text-text"
      style={{ fontSize: 14 }}
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { v: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-bg border border-line rounded px-3 py-2 text-text"
      style={{ fontSize: 14 }}
    >
      {options.map((o) => (
        <option key={o.v} value={o.v}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
