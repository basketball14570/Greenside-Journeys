import Link from "next/link";
import { notFound } from "next/navigation";
import { decodeSlipToken } from "@/lib/slip-share";
import { fetchLeaderboard, type LeaderboardSnapshot } from "@/lib/espn-leaderboard";
import { describeLeg, legToOpenBet, type SlipLeg } from "@/lib/bet-slip";
import { gradeBet, type Decision } from "@/lib/grading";
import { BrandMark } from "@/components/edge/primitives";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public, read-only slip viewer. Anyone with the URL can see the slip and
// its live grading — no auth, no DB row. The token is the slip itself,
// base64url-encoded.

export default async function PublicSlipPage({
  params,
}: {
  params: { token: string };
}) {
  const slip = decodeSlipToken(decodeURIComponent(params.token));
  if (!slip) return notFound();

  let snapshot: LeaderboardSnapshot | null = null;
  try {
    snapshot = await fetchLeaderboard();
  } catch {
    snapshot = null;
  }

  const decisions: (Decision | null)[] = slip.legs.map((leg) =>
    snapshot ? gradeBet(legToOpenBet(leg), snapshot) : null,
  );

  const stats = summarize(slip.legs, decisions);

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-line">
        <div className="max-w-3xl mx-auto px-5 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark size={24} />
            <span
              className="serif-italic"
              style={{
                fontSize: 18,
                letterSpacing: -0.3,
                fontStyle: "normal",
                color: "#f0ebe0",
              }}
            >
              Greenside
            </span>
          </Link>
          <Link
            href="/dashboard/slip"
            className="rounded-[8px] px-3 py-1.5"
            style={{ background: "#8ee68e", color: "#0a1f14", fontSize: 12, fontWeight: 600 }}
          >
            Build your own
          </Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-5 lg:px-8 py-8 space-y-5">
        <div>
          <span
            className="num font-semibold uppercase"
            style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
          >
            ● Shared Slip
          </span>
          <h1
            className="serif-italic mt-1.5"
            style={{ fontSize: 32, letterSpacing: -0.4 }}
          >
            <em>{slip.legs.length}-leg slip · {stats.totalStake.toFixed(1)}u risked</em>
          </h1>
          <p className="text-text-dim mt-1.5" style={{ fontSize: 13 }}>
            {snapshot?.event?.name ?? "Live tournament"} · graded against the
            live leaderboard at{" "}
            <span className="num">
              {new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </span>
          </p>
        </div>

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Legs" value={`${slip.legs.length}`} />
          <Stat label="Risked" value={`${stats.totalStake.toFixed(1)}u`} />
          <Stat
            label="Live PnL"
            value={`${stats.pnl >= 0 ? "+" : ""}${stats.pnl.toFixed(2)}u`}
            tone={stats.pnl > 0 ? "good" : stats.pnl < 0 ? "bad" : "neutral"}
          />
          <Stat label="Won / Lost / Live" value={`${stats.won}/${stats.lost}/${stats.live}`} />
        </section>

        <section className="rounded-[14px] border border-line overflow-hidden">
          {slip.legs.length === 0 ? (
            <div className="px-4 py-10 text-center text-text-dim" style={{ fontSize: 13 }}>
              No legs in this slip.
            </div>
          ) : (
            slip.legs.map((leg, i) => (
              <LegRow key={`${leg.id}-${i}`} leg={leg} decision={decisions[i]} />
            ))
          )}
        </section>

        <footer className="text-text-dim text-center" style={{ fontSize: 11 }}>
          Static share link — anyone with the URL can view this slip. The
          original lineup is not editable here. Greenside is an analytics
          product; we don&apos;t accept wagers.
        </footer>
      </article>
    </div>
  );
}

function LegRow({ leg, decision }: { leg: SlipLeg; decision: Decision | null }) {
  return (
    <div className="flex items-baseline gap-3 px-4 py-3 border-b border-line/50 last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="font-medium" style={{ fontSize: 14 }}>
          {leg.player}
        </div>
        <div className="text-text-dim mt-0.5" style={{ fontSize: 12 }}>
          {describeLeg(leg)} ·{" "}
          <span className="num">
            {leg.americanOdds > 0 ? "+" : ""}
            {leg.americanOdds}
          </span>
          {" · "}
          <span className="num">{leg.stake}u</span>
          {leg.book ? ` · ${leg.book}` : ""}
          {decision?.reason ? ` · ${decision.reason}` : ""}
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
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "good" | "bad" | "neutral";
}) {
  const color =
    tone === "good" ? "#7fd49a" : tone === "bad" ? "#e87c7c" : "#f0ebe0";
  return (
    <div className="rounded-[12px] border border-line p-3 bg-surface-1">
      <div
        className="text-text-dim uppercase"
        style={{ fontSize: 10, letterSpacing: 1.2 }}
      >
        {label}
      </div>
      <div className="num mt-1" style={{ fontSize: 20, color }}>
        {value}
      </div>
    </div>
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

function summarize(legs: SlipLeg[], decisions: (Decision | null)[]) {
  let won = 0;
  let lost = 0;
  let live = 0;
  let pnl = 0;
  let totalStake = 0;
  for (let i = 0; i < legs.length; i++) {
    const l = legs[i];
    const d = decisions[i];
    totalStake += l.stake;
    if (!d) continue;
    if (d.status === "won") won++;
    else if (d.status === "lost") lost++;
    else if (d.status === "live") live++;
    if (typeof d.pnl === "number") pnl += d.pnl;
  }
  return { won, lost, live, pnl, totalStake };
}

export function generateMetadata({ params }: { params: { token: string } }) {
  const slip = decodeSlipToken(decodeURIComponent(params.token));
  if (!slip) return { title: "Slip not found · Greenside" };
  const players = slip.legs
    .slice(0, 3)
    .map((l) => l.player.split(" ").pop())
    .join(", ");
  return {
    title: `${slip.legs.length}-leg slip · Greenside`,
    description: `Shared bet slip: ${players}${slip.legs.length > 3 ? "…" : ""}. Live-graded against the leaderboard.`,
  };
}
