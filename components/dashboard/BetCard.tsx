export type Book = "draftkings" | "fanduel" | "prizepicks" | "underdog" | "caesars" | "other";

export type Bet = {
  id: string;
  book: Book;
  player: string;
  market: string; // e.g. "Fairways Hit Over 8.5"
  line: number | null;
  americanOdds: number;
  stake: number;
  toWin: number;
  status: "live" | "won" | "lost" | "void" | "pending";
  liveEvDelta?: number;
};

const BOOK_LABEL: Record<Book, string> = {
  draftkings: "DraftKings",
  fanduel: "FanDuel",
  prizepicks: "PrizePicks",
  underdog: "Underdog",
  caesars: "Caesars",
  other: "Other",
};

export function BetCard({ bet }: { bet: Bet }) {
  const evColor =
    bet.liveEvDelta == null
      ? "text-ink-light"
      : bet.liveEvDelta >= 0
        ? "text-signal-positive"
        : "text-signal-negative";

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="pill bg-cream-dark text-ink-mid">
          {BOOK_LABEL[bet.book]}
        </span>
        <span
          className={`pill ${
            bet.status === "live"
              ? "bg-signal-positive/10 text-signal-positive"
              : "bg-cream-dark text-ink-mid"
          }`}
        >
          {bet.status.toUpperCase()}
        </span>
      </div>
      <div className="font-display text-lg leading-tight mb-1">{bet.player}</div>
      <div className="text-sm text-ink-mid mb-3">{bet.market}</div>
      <div className="flex items-end justify-between">
        <div className="text-sm">
          <div className="text-ink-light text-xs uppercase tracking-wider">
            Stake / To Win
          </div>
          <div className="num">
            ${bet.stake.toFixed(2)} → ${bet.toWin.toFixed(2)}
          </div>
        </div>
        {bet.liveEvDelta != null && (
          <div className={`text-right ${evColor}`}>
            <div className="text-xs uppercase tracking-wider">Live EV</div>
            <div className="num text-lg font-semibold">
              {bet.liveEvDelta > 0 ? "+" : ""}
              {bet.liveEvDelta.toFixed(1)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
