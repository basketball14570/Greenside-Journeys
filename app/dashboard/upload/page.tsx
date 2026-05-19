"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookChip, type Book } from "@/components/edge/primitives";
import { QuotaLimitBanner } from "@/components/edge/QuotaBanner";
import { useQuota } from "@/lib/use-quota";
import { QUOTA_ERROR_CODE } from "@/lib/usage";
import { parsedBetToSlipLeg } from "@/lib/parsers/to-slip-leg";
import type { SlipLeg } from "@/lib/bet-slip";
import {
  legToOpenBet,
  describeLeg,
  americanToDecimal,
  decimalToAmerican,
} from "@/lib/bet-slip";
import { gradeBet, type Decision } from "@/lib/grading";
import {
  fetchLeaderboard,
  type LeaderboardSnapshot,
} from "@/lib/espn-leaderboard";
import { useBetSlip } from "@/lib/bet-slip-store";
import { toast } from "@/components/edge/Toast";
import {
  MatchupDetail,
  ThreeBallDetail,
} from "@/components/edge/LiveLegDetail";

type ParsedBet = {
  book: string;
  player: string;
  market: string;
  line: number | null;
  americanOdds: number;
  stake: number;
  toWin: number;
  confidence: number;
};

const BOOK_MAP: Record<string, Book> = {
  draftkings: "DK",
  fanduel: "FD",
  prizepicks: "PP",
  underdog: "UD",
};

// Fallback shown until the per-user address resolves. The forwarding API
// returns the real bets+<token>@<domain> when the user is signed in.
const FALLBACK_INBOUND = "bets+yourtoken@greensideedge.com";

// Match the server cap (4 MB base64 ≈ 3 MB raw image). Validated before
// the file leaves the browser so users get instant feedback instead of
// waiting on a 413 round-trip.
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

export default function UploadPage() {
  return (
    <div className="px-5 lg:px-8 py-6 space-y-6 max-w-5xl mx-auto">
      <header>
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
        >
          ● Ingestion
        </span>
        <h1
          className="serif-italic mt-1.5"
          style={{ fontSize: 36, letterSpacing: -0.4, fontStyle: "normal" }}
        >
          <em>Bring your bets in.</em>
        </h1>
        <p className="text-text-dim mt-2 max-w-2xl" style={{ fontSize: 14 }}>
          Two paths. Email forwarding is the easy one — set it up once, never
          think about it again. Screenshot upload is the fallback.
        </p>
      </header>

      <div className="grid lg:grid-cols-2 gap-5">
        <EmailForwardCard />
        <ScreenshotCard />
      </div>

      <div
        className="rounded-[14px] p-5 border border-line"
        style={{ background: "rgba(124,192,232,0.05)" }}
      >
        <div className="flex items-baseline gap-2 mb-2">
          <span style={{ fontSize: 14, color: "#7cc0e8" }}>ℹ</span>
          <span
            className="num font-semibold uppercase"
            style={{ fontSize: 10.5, letterSpacing: 1.2, color: "#7cc0e8" }}
          >
            Coming soon
          </span>
        </div>
        <p className="text-text-dim" style={{ fontSize: 13.5, lineHeight: 1.45 }}>
          <span className="text-text font-semibold">Mobile share sheet</span> —
          when the native app ships, you&apos;ll tap the share button on any
          bet slip in DraftKings, FanDuel, PrizePicks, or Underdog and pick
          &quot;Share to Greenside.&quot; Zero typing, zero screenshots, zero
          forwards. The lowest-friction path possible.
        </p>
      </div>
    </div>
  );
}

// ─── Email forwarding card ──────────────────────────────────
function EmailForwardCard() {
  const [copied, setCopied] = useState(false);
  const [address, setAddress] = useState<string>(FALLBACK_INBOUND);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/account/forwarding", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.signedIn && j.address) {
          setAddress(j.address);
          setSignedIn(true);
        } else {
          setSignedIn(!!j.signedIn);
        }
      })
      .catch(() => undefined);
  }, []);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Older browsers / no permission — fall through silently.
    }
  }

  return (
    <div className="rounded-[14px] bg-surface-1 border border-line p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="num font-semibold uppercase"
          style={{
            fontSize: 9.5,
            letterSpacing: 1.2,
            color: "#8ee68e",
            padding: "3px 8px",
            borderRadius: 4,
            background: "rgba(142,230,142,0.13)",
            border: "1px solid rgba(142,230,142,0.3)",
          }}
        >
          ★ Recommended
        </span>
        <span
          className="num text-text-muted"
          style={{ fontSize: 10.5, letterSpacing: 0.6 }}
        >
          Set up once · works forever
        </span>
      </div>

      <div
        className="serif-italic text-text mb-1"
        style={{ fontSize: 22, letterSpacing: -0.3, fontStyle: "normal" }}
      >
        Forward bet emails
      </div>
      <p className="text-text-dim mb-4" style={{ fontSize: 13.5, lineHeight: 1.45 }}>
        Every sportsbook emails a confirmation when you place a bet. Forward
        that email to your unique address and we&apos;ll parse the line, odds,
        and stake automatically.
      </p>

      <div
        className="rounded-[10px] p-3 mb-4 flex items-center gap-3"
        style={{
          background: "rgba(0,0,0,0.3)",
          border: "1px dashed rgba(255,255,255,0.12)",
        }}
      >
        <span
          className="num text-text flex-1 truncate"
          style={{ fontSize: 13, letterSpacing: 0.3 }}
        >
          {address}
        </span>
        <button
          onClick={copyAddress}
          className="font-semibold transition"
          style={{
            background: copied ? "#8ee68e" : "#1e4030",
            color: copied ? "#06140c" : "#f0ebe0",
            padding: "6px 11px",
            borderRadius: 5,
            fontSize: 11.5,
            letterSpacing: 0.4,
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div
        className="num font-semibold uppercase text-text-muted mb-2"
        style={{ fontSize: 9.5, letterSpacing: 1.2 }}
      >
        Or auto-forward from your inbox
      </div>
      <div className="space-y-2 text-text-dim" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
        <Step
          n="1"
          body={
            <>
              In Gmail, open Settings → <em>Forwarding and POP/IMAP</em> →
              add the address above.
            </>
          }
        />
        <Step
          n="2"
          body={
            <>
              Create a filter: from{" "}
              <span className="num text-text">@draftkings.com</span>,{" "}
              <span className="num text-text">@fanduel.com</span>,{" "}
              <span className="num text-text">@prizepicks.com</span>,{" "}
              <span className="num text-text">@underdogfantasy.com</span> →
              forward + mark as read.
            </>
          }
        />
        <Step
          n="3"
          body={<>That&apos;s it. Every future bet shows up in your dashboard within ~30 seconds of placement.</>}
        />
      </div>

      <div
        className="mt-4 pt-3 border-t border-line num text-text-muted"
        style={{ fontSize: 10.5, letterSpacing: 0.4 }}
      >
        {signedIn === null
          ? "Loading address…"
          : signedIn
            ? "This is your unique address — rotate it from /dashboard/account."
            : "Sign in to claim your unique forwarding address."}
      </div>
    </div>
  );
}

function Step({ n, body }: { n: string; body: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span
        className="num font-semibold shrink-0"
        style={{
          fontSize: 10,
          color: "#8ee68e",
          width: 20,
          height: 20,
          borderRadius: 99,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(142,230,142,0.13)",
          border: "1px solid rgba(142,230,142,0.3)",
        }}
      >
        {n}
      </span>
      <span>{body}</span>
    </div>
  );
}

// ─── Screenshot card ────────────────────────────────────────
function ScreenshotCard() {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ParsedBet[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const { usage, setUsage } = useQuota("screenshot_parse");
  const overLimit = usage?.allowed === false;

  async function saveToBets() {
    if (!result || result.length === 0) return;
    setSaving(true);
    setSaved(null);
    setError(null);
    try {
      const r = await fetch("/api/bets/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bets: result, source: "screenshot" }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 401) throw new Error("Sign in to save bets to your account");
        throw new Error(j.error ?? `Save failed (${r.status})`);
      }
      setSaved(`Saved ${j.inserted}. Confirm them on /dashboard/bets.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(
        `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB — keep screenshots under 3 MB`,
      );
      return;
    }
    setParsing(true);
    setError(null);
    setResult(null);
    try {
      const buf = await file.arrayBuffer();
      const b64 = btoa(
        new Uint8Array(buf).reduce((s, b) => s + String.fromCharCode(b), ""),
      );
      const res = await fetch("/api/bets/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: b64, mediaType: file.type }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Sign in to upload bet slips");
        }
        if (res.status === 429 && data.error === QUOTA_ERROR_CODE) {
          if (data.limit != null) {
            setUsage({ used: data.used, limit: data.limit, allowed: false });
          }
          throw new Error(data.message ?? "Daily limit reached");
        }
        throw new Error(data.error || `Parse failed (${res.status})`);
      }
      if (!data.bets || data.bets.length === 0) {
        throw new Error(
          "No bets found in that image — try a clearer crop of the slip",
        );
      }
      if (data.usage) setUsage(data.usage);
      setResult(data.bets);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse");
    } finally {
      setParsing(false);
    }
  }

  return (
    <div className="rounded-[14px] bg-surface-1 border border-line p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="num font-semibold uppercase"
          style={{
            fontSize: 9.5,
            letterSpacing: 1.2,
            color: "#a8b3ac",
            padding: "3px 8px",
            borderRadius: 4,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          Fallback
        </span>
        <span
          className="num text-text-muted"
          style={{ fontSize: 10.5, letterSpacing: 0.6 }}
        >
          For bets that don&apos;t email
        </span>
      </div>

      <div
        className="serif-italic text-text mb-1"
        style={{ fontSize: 22, letterSpacing: -0.3, fontStyle: "normal" }}
      >
        Upload a screenshot
      </div>
      <p className="text-text-dim mb-4" style={{ fontSize: 13.5, lineHeight: 1.45 }}>
        Drop a bet slip image. Claude vision extracts the structured fields with
        a confidence score — low-confidence parses prompt for a one-tap edit.
      </p>

      <label className="block cursor-pointer flex-1">
        <div
          className="rounded-[12px] p-8 text-center transition h-full flex flex-col items-center justify-center"
          style={{
            border: "2px dashed rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.18)",
          }}
        >
          {file ? (
            <>
              <div className="text-text font-semibold mb-1">{file.name}</div>
              <div className="num text-text-muted" style={{ fontSize: 11 }}>
                {(file.size / 1024).toFixed(1)} KB
              </div>
            </>
          ) : (
            <>
              <div
                className="serif-italic mb-1.5"
                style={{
                  fontSize: 18,
                  fontStyle: "normal",
                  color: "#f0ebe0",
                }}
              >
                Drop or click to select
              </div>
              <div
                className="num text-text-muted"
                style={{ fontSize: 10.5, letterSpacing: 0.5 }}
              >
                PNG or JPG · up to 3 MB
              </div>
            </>
          )}
          <input
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </label>

      <button
        disabled={!file || parsing}
        onClick={handleSubmit}
        className="mt-4 font-bold rounded-md disabled:opacity-40"
        style={{
          background: "#8ee68e",
          color: "#06140c",
          padding: "10px 0",
          fontSize: 13.5,
        }}
      >
        {parsing ? "Parsing slip…" : "Extract bets"}
      </button>

      {usage && usage.limit != null && (
        <div
          className="mt-2 num text-text-muted"
          style={{ fontSize: 10.5, letterSpacing: 0.4 }}
        >
          {usage.used} of {usage.limit} parses today · resets at midnight UTC
        </div>
      )}

      {overLimit && (
        <div className="mt-3">
          <QuotaLimitBanner
            body="You've used your free screenshot parses for today. Forward slip emails (unlimited on free) or"
          />
        </div>
      )}

      {error && !overLimit && (
        <div className="mt-3 text-red" style={{ fontSize: 12.5 }}>
          {error}
        </div>
      )}

      {result && result.length > 0 && (
        <ResultsSection
          bets={result}
          saving={saving}
          saved={saved}
          onSave={saveToBets}
        />
      )}
    </div>
  );
}

// Renders parsed bets with a live tracker preview attached to each.
// Converts the generic ParsedBet into the typed SlipLeg so it can be
// graded against the live ESPN snapshot — that gives the user instant
// feedback like "Currently T8, 1 stroke clear of top 10" right under
// the bet they just uploaded, before they even click "Save".
function ResultsSection({
  bets,
  saving,
  saved,
  onSave,
}: {
  bets: ParsedBet[];
  saving: boolean;
  saved: string | null;
  onSave: () => void;
}) {
  const router = useRouter();
  const { importLegs } = useBetSlip();
  const [snapshot, setSnapshot] = useState<LeaderboardSnapshot | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchLeaderboard()
      .then((s) => {
        if (!cancelled) setSnapshot(s);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const legs = useMemo(
    () => bets.map((b, i) => parsedBetToSlipLeg(b, i)),
    [bets],
  );
  const decisions = useMemo(() => {
    if (!snapshot) return [];
    return legs.map((l) => (l ? gradeBet(legToOpenBet(l), snapshot) : null));
  }, [legs, snapshot]);

  // Parlay detection: more than one bet AND every bet has the same stake
  // is overwhelmingly a parlay (DK / FD / Hard Rock all do this). Mixed
  // stakes = list of singles. Single bet = single, obviously.
  const heuristicParlay =
    bets.length > 1 &&
    bets.every((b) => b.stake === bets[0].stake) &&
    bets[0].stake > 0;
  // User override — the heuristic is right ~95% of the time but books do
  // occasionally let you build same-stake singles. Toggle visible only
  // when multi-leg so we don't clutter single-bet uploads.
  const [parlayOverride, setParlayOverride] = useState<boolean | null>(null);
  const isParlay = parlayOverride ?? heuristicParlay;

  const trackOnLive = () => {
    const validLegs = legs.filter((l): l is SlipLeg => l !== null);
    if (validLegs.length === 0) {
      toast("Couldn't classify any legs — fix the parsed cards first", "warn");
      return;
    }
    importLegs(validLegs);
    toast(
      `Tracking ${validLegs.length} leg${validLegs.length === 1 ? "" : "s"} on the Live page`,
      "success",
    );
    router.push("/dashboard/parlay");
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={trackOnLive}
          className="rounded-[8px] px-3 py-1.5 font-semibold"
          style={{ background: "#8ee68e", color: "#06140c", fontSize: 12 }}
        >
          Track on Live page →
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-[8px] px-3 py-1.5 border border-line hover:bg-surface-2 disabled:opacity-40"
          style={{ fontSize: 12 }}
        >
          {saving ? "Saving…" : "Save to my tickets"}
        </button>
        {saved && (
          <span className="text-text-dim" style={{ fontSize: 11 }}>
            {saved}
          </span>
        )}
        {bets.length > 1 && (
          <div className="flex items-center gap-1 rounded-md border border-line p-0.5">
            <button
              onClick={() => setParlayOverride(true)}
              className="num font-semibold uppercase rounded px-2 py-1 transition"
              style={{
                fontSize: 10,
                letterSpacing: 0.6,
                background: isParlay ? "#1e4030" : "transparent",
                color: isParlay ? "#8ee68e" : "#6c7a72",
              }}
            >
              Parlay
            </button>
            <button
              onClick={() => setParlayOverride(false)}
              className="num font-semibold uppercase rounded px-2 py-1 transition"
              style={{
                fontSize: 10,
                letterSpacing: 0.6,
                background: !isParlay ? "#1e4030" : "transparent",
                color: !isParlay ? "#8ee68e" : "#6c7a72",
              }}
            >
              Singles
            </button>
          </div>
        )}
        <span
          className="num text-text-muted ml-auto"
          style={{ fontSize: 10.5, letterSpacing: 0.5 }}
        >
          {snapshot ? `● Live · ${snapshot.event?.shortName ?? ""}` : "Loading live data…"}
        </span>
      </div>

      {isParlay ? (
        <ParlayGroup
          bets={bets}
          legs={legs}
          decisions={decisions}
          snapshot={snapshot}
        />
      ) : (
        bets.map((b, i) => (
          <div
            key={i}
            className="rounded-[14px] border-2 overflow-hidden"
            style={{ borderColor: "rgba(255,255,255,0.10)" }}
          >
            <ParsedBetCard
              bet={b}
              leg={legs[i]}
              decision={decisions[i] ?? undefined}
              snapshot={snapshot}
            />
          </div>
        ))
      )}
    </div>
  );
}

// Parlay wrapper — visually groups every leg under one outer border
// with a header summarizing total stake + combined odds + payout.
// Mirrors the way DK / Hard Rock present 6-leg parlay slips so the
// user can instantly tell "this is one bet, not six."
function ParlayGroup({
  bets,
  legs,
  decisions,
  snapshot,
}: {
  bets: ParsedBet[];
  legs: (SlipLeg | null)[];
  decisions: (Decision | null)[];
  snapshot: LeaderboardSnapshot | null;
}) {
  const stake = bets[0].stake;
  const parlayDecimal = bets.reduce(
    (acc, b) => acc * americanToDecimal(b.americanOdds),
    1,
  );
  const parlayAmerican = decimalToAmerican(parlayDecimal);
  const payout = stake * parlayDecimal;

  // Roll up status: any lost → LOST. Any unknown/manual → PENDING.
  // Any live → LIVE. All won → WON.
  let rollup: "won" | "lost" | "live" | "pending" = "won";
  let wonCount = 0;
  let liveCount = 0;
  let lostCount = 0;
  for (const d of decisions) {
    if (!d) {
      rollup = "pending";
      continue;
    }
    if (d.status === "won") wonCount++;
    else if (d.status === "lost") {
      lostCount++;
      rollup = "lost";
    } else if (d.status === "live") {
      liveCount++;
      if (rollup !== "lost") rollup = "live";
    } else if (rollup !== "lost") {
      rollup = "pending";
    }
  }
  const rollupColor =
    rollup === "won"
      ? "#7fd49a"
      : rollup === "lost"
        ? "#e87c7c"
        : rollup === "live"
          ? "#f5c558"
          : "#a8b3ac";

  return (
    <div
      className="rounded-[14px] border-2 overflow-hidden"
      style={{
        borderColor: rollup === "live"
          ? "rgba(245,197,88,0.5)"
          : rollup === "won"
            ? "rgba(127,212,154,0.5)"
            : rollup === "lost"
              ? "rgba(232,124,124,0.5)"
              : "rgba(255,255,255,0.18)",
        background: "rgba(0,0,0,0.18)",
      }}
    >
      <div
        className="flex items-baseline justify-between px-4 py-3 border-b border-line"
        style={{ background: "rgba(0,0,0,0.25)" }}
      >
        <div className="flex items-baseline gap-3">
          <span
            className="num font-semibold uppercase"
            style={{ fontSize: 10, letterSpacing: 1.2, color: rollupColor }}
          >
            ● {bets.length}-leg parlay
          </span>
          <span
            className="num"
            style={{ fontSize: 11, color: "#a8b3ac" }}
          >
            {wonCount}W · {liveCount}L · {lostCount}X
          </span>
        </div>
        <div className="flex items-baseline gap-3">
          <span
            className="num text-text-dim"
            style={{ fontSize: 11 }}
          >
            {stake}u → {payout.toFixed(2)}u
          </span>
          <span
            className="num"
            style={{ fontSize: 13, color: "#f0ebe0", fontWeight: 600 }}
          >
            {parlayAmerican > 0 ? "+" : ""}
            {parlayAmerican}
          </span>
        </div>
      </div>
      <div className="divide-y divide-line/40">
        {bets.map((b, i) => (
          <div key={i}>
            <ParsedBetCard
              bet={b}
              leg={legs[i]}
              decision={decisions[i] ?? undefined}
              snapshot={snapshot}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ParsedBetCard({
  bet,
  leg,
  decision,
  snapshot,
}: {
  bet: ParsedBet;
  leg: SlipLeg | null;
  decision: Decision | null | undefined;
  snapshot: LeaderboardSnapshot | null;
}) {
  const bookChip = BOOK_MAP[bet.book.toLowerCase()] ?? null;
  const status = decision?.status;
  const pillColor =
    status === "won"
      ? "#7fd49a"
      : status === "lost"
        ? "#e87c7c"
        : status === "live"
          ? "#f5c558"
          : "#a8b3ac";
  const pillLabel =
    status === "won"
      ? "WON"
      : status === "lost"
        ? "LOST"
        : status === "live"
          ? "LIVE"
          : status === "push"
            ? "PUSH"
            : leg === null
              ? "MANUAL"
              : "PRE";

  return (
    <div>
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          {bookChip && <BookChip book={bookChip} />}
          <span
            className="text-text font-semibold flex-1 truncate"
            style={{ fontSize: 13.5 }}
          >
            {leg ? describeBetTitle(leg, bet) : bet.player}
          </span>
          <span
            className="num"
            style={{ fontSize: 11.5, color: "#a8b3ac" }}
          >
            {bet.americanOdds > 0 ? "+" : ""}
            {bet.americanOdds}
          </span>
          <span
            className="num uppercase"
            style={{
              fontSize: 9.5,
              letterSpacing: 0.8,
              color: pillColor,
              background: `${pillColor}1a`,
              border: `1px solid ${pillColor}33`,
              padding: "3px 8px",
              borderRadius: 4,
            }}
          >
            {pillLabel}
          </span>
        </div>
        <div className="text-text-dim" style={{ fontSize: 12 }}>
          {leg ? describeLeg(leg) : bet.market}
        </div>
        {decision && (
          <div
            className="text-text-dim mt-1.5"
            style={{ fontSize: 11.5, lineHeight: 1.4 }}
          >
            {decision.reason}
          </div>
        )}
        {!leg && (
          <div
            className="num text-text-muted mt-1.5"
            style={{ fontSize: 10.5, letterSpacing: 0.4 }}
          >
            Couldn&apos;t auto-classify this market — it&apos;ll save as a
            generic ticket. Confirm + edit on the Tickets page.
          </div>
        )}
        {bet.confidence < 0.7 && (
          <div
            className="num mt-1.5"
            style={{ fontSize: 10.5, letterSpacing: 0.4, color: "#f5c558" }}
          >
            Low OCR confidence ({Math.round(bet.confidence * 100)}%) — double-check the values.
          </div>
        )}
      </div>
      {/* Live match-play / 3-ball tracker rendered directly under the
          parsed card so the user sees "Hovland 2 UP" or the 3-ball
          standings the instant their slip is parsed. */}
      {leg && leg.kind === "matchup" && (
        <MatchupDetail leg={leg} snapshot={snapshot} />
      )}
      {leg && leg.kind === "three_ball" && (
        <ThreeBallDetail leg={leg} snapshot={snapshot} />
      )}
    </div>
  );
}

function describeBetTitle(leg: SlipLeg, fallback: ParsedBet): string {
  if (leg.kind === "matchup") return `${leg.player} vs ${leg.opponent}`;
  if (leg.kind === "three_ball")
    return `${leg.player} (3-ball vs ${leg.others.join(" / ")})`;
  return fallback.player;
}
