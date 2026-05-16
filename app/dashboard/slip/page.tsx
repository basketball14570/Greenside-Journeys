"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchLeaderboard,
  type LeaderboardSnapshot,
} from "@/lib/espn-leaderboard";
import { useBetSlip } from "@/lib/bet-slip-store";
import { describeLeg, legToOpenBet, type SlipLeg } from "@/lib/bet-slip";
import { gradeBet } from "@/lib/grading";

type LegKind = SlipLeg["kind"];

const KIND_LABELS: Record<LegKind, string> = {
  top_n: "Top N",
  winner: "Outright winner",
  matchup: "Matchup",
  three_ball: "3-Ball",
  round_prop: "Round prop O/U",
  make_cut: "Make / Miss cut",
};

export default function SlipPage() {
  const { slip, addLeg, removeLeg, clear, ready, signedIn } = useBetSlip();
  const [snapshot, setSnapshot] = useState<LeaderboardSnapshot | null>(null);

  useEffect(() => {
    fetchLeaderboard().then(setSnapshot).catch(() => undefined);
  }, []);

  const fieldNames = useMemo(
    () => (snapshot?.players ?? []).map((p) => p.name).sort(),
    [snapshot],
  );

  return (
    <div className="px-5 lg:px-8 py-6 space-y-5 max-w-5xl mx-auto">
      <header>
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
        >
          ● Slip Editor
        </span>
        <h1
          className="serif-italic mt-1.5"
          style={{ fontSize: 36, letterSpacing: -0.4 }}
        >
          <em>Build the slip.</em>
        </h1>
        <p className="text-text-dim mt-2 max-w-2xl" style={{ fontSize: 14 }}>
          Add legs across every market — top N, head-to-head, round
          over/unders, make-cut. Saves to your browser instantly; syncs to
          your account when{" "}
          {signedIn ? (
            <span style={{ color: "#7fd49a" }}>signed in.</span>
          ) : (
            <Link href="/login" className="text-text underline">
              signed in.
            </Link>
          )}{" "}
          The{" "}
          <Link href="/dashboard/leaderboard" className="text-text underline">
            leaderboard
          </Link>{" "}
          decorates rows with live grading.
        </p>
      </header>

      <AddLegForm fieldNames={fieldNames} onAdd={addLeg} />

      <SlipList
        legs={slip.legs}
        snapshot={snapshot}
        onRemove={removeLeg}
        onClear={clear}
        ready={ready}
      />
    </div>
  );
}

function AddLegForm({
  fieldNames,
  onAdd,
}: {
  fieldNames: string[];
  onAdd: ReturnType<typeof useBetSlip>["addLeg"];
}) {
  const [kind, setKind] = useState<LegKind>("top_n");
  const [player, setPlayer] = useState("");
  const [opponent, setOpponent] = useState("");
  const [third, setThird] = useState("");
  const [fourth, setFourth] = useState("");
  const [n, setN] = useState(10);
  const [round, setRound] = useState(3);
  const [side, setSide] = useState<"over" | "under">("over");
  const [metric, setMetric] = useState<"strokes" | "birdies" | "bogeys" | "eagles">("strokes");
  const [line, setLine] = useState<string>("4.5");
  const [cutSide, setCutSide] = useState<"make" | "miss">("make");
  const [stake, setStake] = useState<string>("1");
  const [odds, setOdds] = useState<string>("+150");
  const [book, setBook] = useState("DK");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    const stakeN = Number(stake);
    const oddsN = parseAmerican(odds);
    if (!player.trim()) return setError("Player is required");
    if (!Number.isFinite(stakeN) || stakeN <= 0) return setError("Stake must be a positive number");
    if (!Number.isFinite(oddsN)) return setError("Odds must be a number like +250 or -115");

    const base = {
      player: player.trim(),
      stake: stakeN,
      americanOdds: oddsN,
      book,
    };

    switch (kind) {
      case "top_n":
        onAdd({ kind: "top_n", ...base, n });
        break;
      case "winner":
        onAdd({ kind: "winner", ...base });
        break;
      case "matchup":
        if (!opponent.trim()) return setError("Opponent is required");
        onAdd({ kind: "matchup", ...base, opponent: opponent.trim(), round });
        break;
      case "three_ball":
        if (!third.trim() || !fourth.trim()) return setError("Both other players required");
        onAdd({
          kind: "three_ball",
          ...base,
          others: [third.trim(), fourth.trim()],
          round,
        });
        break;
      case "round_prop": {
        const lineN = Number(line);
        if (!Number.isFinite(lineN)) return setError("Line must be a number");
        onAdd({ kind: "round_prop", ...base, metric, side, line: lineN, round });
        break;
      }
      case "make_cut":
        onAdd({ kind: "make_cut", ...base, side: cutSide });
        break;
    }
    // Reset transient inputs but keep stake/odds — usually similar across legs.
    setPlayer("");
    setOpponent("");
    setThird("");
    setFourth("");
  }

  return (
    <div className="rounded-[14px] border border-line p-5 bg-surface-1 space-y-4">
      <h2 className="font-medium" style={{ fontSize: 18 }}>
        Add a leg
      </h2>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(KIND_LABELS) as LegKind[]).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`rounded-[10px] px-3 py-1.5 border ${
              kind === k
                ? "border-fairway"
                : "border-line hover:border-line-strong"
            }`}
            style={{
              fontSize: 12,
              background: kind === k ? "rgba(63,138,82,0.15)" : undefined,
              color: kind === k ? "#7fd49a" : undefined,
            }}
          >
            {KIND_LABELS[k]}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <PlayerInput label="Player" value={player} onChange={setPlayer} options={fieldNames} />
        {kind === "matchup" && (
          <PlayerInput
            label="Opponent"
            value={opponent}
            onChange={setOpponent}
            options={fieldNames}
          />
        )}
        {kind === "three_ball" && (
          <>
            <PlayerInput label="Other 1" value={third} onChange={setThird} options={fieldNames} />
            <PlayerInput label="Other 2" value={fourth} onChange={setFourth} options={fieldNames} />
          </>
        )}
        {kind === "top_n" && (
          <NumberInput
            label="Top finish (N)"
            value={n}
            onChange={(v) => setN(Number(v))}
            options={[5, 10, 20, 30, 40]}
          />
        )}
        {(kind === "matchup" || kind === "three_ball" || kind === "round_prop") && (
          <NumberInput label="Round" value={round} onChange={(v) => setRound(Number(v))} options={[1, 2, 3, 4]} />
        )}
        {kind === "round_prop" && (
          <>
            <Select
              label="Metric"
              value={metric}
              onChange={(v) => setMetric(v as typeof metric)}
              options={[
                { value: "strokes", label: "Round strokes" },
                { value: "birdies", label: "Birdies" },
                { value: "bogeys", label: "Bogeys" },
                { value: "eagles", label: "Eagles" },
              ]}
            />
            <Select
              label="Side"
              value={side}
              onChange={(v) => setSide(v as typeof side)}
              options={[
                { value: "over", label: "Over" },
                { value: "under", label: "Under" },
              ]}
            />
            <TextInput label="Line" value={line} onChange={setLine} />
          </>
        )}
        {kind === "make_cut" && (
          <Select
            label="Side"
            value={cutSide}
            onChange={(v) => setCutSide(v as typeof cutSide)}
            options={[
              { value: "make", label: "Make cut" },
              { value: "miss", label: "Miss cut" },
            ]}
          />
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <TextInput label="Stake (u)" value={stake} onChange={setStake} />
        <TextInput label="American odds" value={odds} onChange={setOdds} />
        <TextInput label="Book" value={book} onChange={setBook} />
      </div>

      {error && (
        <div
          className="rounded-[8px] px-3 py-2"
          style={{ background: "rgba(232,124,124,0.1)", color: "#e87c7c", fontSize: 12 }}
        >
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={submit}
          className="rounded-[10px] px-4 py-2"
          style={{ background: "#8ee68e", color: "#0a1f14", fontSize: 13, fontWeight: 600 }}
        >
          Add leg
        </button>
      </div>
    </div>
  );
}

function SlipList({
  legs,
  snapshot,
  onRemove,
  onClear,
  ready,
}: {
  legs: SlipLeg[];
  snapshot: LeaderboardSnapshot | null;
  onRemove: (id: string) => void;
  onClear: () => void;
  ready: boolean;
}) {
  if (!ready) {
    return <div className="text-text-dim" style={{ fontSize: 13 }}>Loading slip…</div>;
  }
  return (
    <div className="rounded-[14px] border border-line overflow-hidden">
      <div className="px-4 py-3 border-b border-line bg-surface-1 flex items-baseline justify-between">
        <h2 className="font-medium" style={{ fontSize: 18 }}>
          Current slip ({legs.length} legs)
        </h2>
        {legs.length > 0 && (
          <button
            onClick={onClear}
            className="text-text-dim hover:text-text"
            style={{ fontSize: 12 }}
          >
            Clear all
          </button>
        )}
      </div>
      {legs.length === 0 ? (
        <div className="px-4 py-8 text-center text-text-dim" style={{ fontSize: 13 }}>
          No legs yet. Add one above.
        </div>
      ) : (
        legs.map((leg) => {
          const decision = snapshot ? gradeBet(legToOpenBet(leg), snapshot) : null;
          return (
            <div
              key={leg.id}
              className="flex items-baseline gap-3 px-4 py-3 border-b border-line/50 last:border-b-0"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium" style={{ fontSize: 14 }}>
                  {leg.player}
                </div>
                <div className="text-text-dim mt-0.5" style={{ fontSize: 12 }}>
                  {describeLeg(leg)} ·{" "}
                  <span className="num">{leg.americanOdds > 0 ? "+" : ""}{leg.americanOdds}</span>
                  {" · "}
                  <span className="num">{leg.stake}u</span>
                  {leg.book ? ` · ${leg.book}` : ""}
                  {decision && decision.reason ? ` · ${decision.reason}` : ""}
                </div>
              </div>
              {decision && (
                <span
                  className="num uppercase px-2 py-0.5 rounded"
                  style={{
                    fontSize: 10,
                    letterSpacing: 1.2,
                    color: pillColor(decision.status),
                    background: `${pillColor(decision.status)}1a`,
                  }}
                >
                  {decision.status}
                </span>
              )}
              <button
                onClick={() => onRemove(leg.id)}
                className="text-text-dim hover:text-red"
                style={{ fontSize: 12 }}
              >
                Remove
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}

function PlayerInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const listId = `players-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <label className="block">
      <span className="text-text-dim uppercase block mb-1" style={{ fontSize: 10, letterSpacing: 1.2 }}>
        {label}
      </span>
      <input
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[8px] border border-line bg-surface-1 px-3 py-2 text-text"
        style={{ fontSize: 13 }}
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </label>
  );
}

function TextInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-text-dim uppercase block mb-1" style={{ fontSize: 10, letterSpacing: 1.2 }}>
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[8px] border border-line bg-surface-1 px-3 py-2 text-text num"
        style={{ fontSize: 13 }}
      />
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: number;
  onChange: (v: string) => void;
  options: number[];
}) {
  return (
    <label className="block">
      <span className="text-text-dim uppercase block mb-1" style={{ fontSize: 10, letterSpacing: 1.2 }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[8px] border border-line bg-surface-1 px-3 py-2 text-text"
        style={{ fontSize: 13 }}
      >
        {options.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-text-dim uppercase block mb-1" style={{ fontSize: 10, letterSpacing: 1.2 }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[8px] border border-line bg-surface-1 px-3 py-2 text-text"
        style={{ fontSize: 13 }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function pillColor(status: string): string {
  switch (status) {
    case "won":
      return "#7fd49a";
    case "lost":
      return "#e87c7c";
    case "live":
      return "#f5c558";
    case "push":
      return "#7cc0e8";
    default:
      return "#a8b3ac";
  }
}

function parseAmerican(s: string): number {
  const m = s.trim().match(/^([+-]?)(\d+)$/);
  if (!m) return NaN;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * parseInt(m[2], 10);
}
