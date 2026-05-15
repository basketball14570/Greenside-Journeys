import { BetCard, type Bet } from "@/components/dashboard/BetCard";
import {
  ConditionsBanner,
  type ConditionAlert,
} from "@/components/dashboard/ConditionsBanner";
import {
  LeaderboardWidget,
  type LeaderboardRow,
} from "@/components/dashboard/LeaderboardWidget";

// MOCK data — wired to real Supabase queries + DataGolf in subsequent commits.
// Kept here so the design surface is reviewable end-to-end.
const ALERT: ConditionAlert = {
  id: "a1",
  severity: "warning",
  course: "Quail Hollow · AM Wave",
  headline: "Wind jumped from 8mph to 18mph — gusts to 24",
  detail:
    "AM wave players now facing meaningfully tougher conditions than overnight forecast. 3 of your bets shifted negative; 1 props bet improved.",
  affectedBets: 4,
  evDelta: -6.2,
};

const BETS: Bet[] = [
  {
    id: "b1",
    book: "prizepicks",
    player: "Scottie Scheffler",
    market: "Fairways Hit Over 8.5",
    line: 8.5,
    americanOdds: -120,
    stake: 25,
    toWin: 20.83,
    status: "live",
    liveEvDelta: -4.1,
  },
  {
    id: "b2",
    book: "draftkings",
    player: "Rory McIlroy",
    market: "Top 10 Finish",
    line: null,
    americanOdds: 220,
    stake: 50,
    toWin: 110,
    status: "live",
    liveEvDelta: 8.4,
  },
  {
    id: "b3",
    book: "underdog",
    player: "Xander Schauffele",
    market: "Round 1 Score Under 69.5",
    line: 69.5,
    americanOdds: -110,
    stake: 20,
    toWin: 18.18,
    status: "live",
    liveEvDelta: -2.3,
  },
  {
    id: "b4",
    book: "fanduel",
    player: "Collin Morikawa vs Cantlay",
    market: "Matchup — Morikawa",
    line: null,
    americanOdds: -135,
    stake: 30,
    toWin: 22.22,
    status: "live",
    liveEvDelta: 1.2,
  },
];

const ROWS: LeaderboardRow[] = [
  { position: 1, player: "Rory McIlroy", toPar: -5, thru: 14, wave: "AM", userExposure: { bets: 1, netRisk: 50 } },
  { position: 2, player: "Scottie Scheffler", toPar: -3, thru: 14, wave: "AM", userExposure: { bets: 1, netRisk: 25 } },
  { position: 3, player: "Collin Morikawa", toPar: -2, thru: 12, wave: "AM", userExposure: { bets: 1, netRisk: 30 } },
  { position: 4, player: "Patrick Cantlay", toPar: -1, thru: 12, wave: "AM" },
  { position: 5, player: "Xander Schauffele", toPar: 0, thru: 8, wave: "PM", userExposure: { bets: 1, netRisk: 20 } },
];

export default function DashboardHome() {
  const totalStake = BETS.reduce((s, b) => s + b.stake, 0);
  const totalToWin = BETS.reduce((s, b) => s + b.toWin, 0);
  const netEv = BETS.reduce((s, b) => s + (b.liveEvDelta ?? 0), 0) / BETS.length;

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-gold mb-1">
            Wells Fargo Championship · Round 1
          </div>
          <h1 className="font-display text-4xl">Your Edge Today</h1>
        </div>
        <div className="flex gap-6 text-right">
          <Stat label="Live Bets" value={BETS.length.toString()} />
          <Stat label="Total Risk" value={`$${totalStake.toFixed(0)}`} />
          <Stat label="Total To Win" value={`$${totalToWin.toFixed(0)}`} />
          <Stat
            label="Avg Live EV"
            value={`${netEv > 0 ? "+" : ""}${netEv.toFixed(1)}%`}
            tone={netEv >= 0 ? "pos" : "neg"}
          />
        </div>
      </header>

      <ConditionsBanner alert={ALERT} />

      <section>
        <h2 className="font-display text-2xl mb-4">Live Bet Portfolio</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BETS.map((b) => (
            <BetCard key={b.id} bet={b} />
          ))}
        </div>
      </section>

      <section>
        <LeaderboardWidget tournament="Wells Fargo Championship" rows={ROWS} />
      </section>
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
  tone?: "pos" | "neg";
}) {
  const color =
    tone === "pos"
      ? "text-signal-positive"
      : tone === "neg"
        ? "text-signal-negative"
        : "text-ink";
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-ink-light">
        {label}
      </div>
      <div className={`num font-display text-2xl ${color}`}>{value}</div>
    </div>
  );
}
