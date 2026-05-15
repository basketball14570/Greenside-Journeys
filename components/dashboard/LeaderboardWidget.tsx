export type LeaderboardRow = {
  position: number;
  player: string;
  toPar: number;
  thru: number | "F";
  wave: "AM" | "PM";
  userExposure?: { bets: number; netRisk: number };
};

export function LeaderboardWidget({
  tournament,
  rows,
}: {
  tournament: string;
  rows: LeaderboardRow[];
}) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-cream-dark flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-gold">
            Live Leaderboard
          </div>
          <h3 className="font-display text-xl">{tournament}</h3>
        </div>
        <span className="pill bg-signal-positive/10 text-signal-positive">
          <span className="w-1.5 h-1.5 rounded-full bg-signal-positive animate-pulse" />
          LIVE
        </span>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-cream/60 text-xs uppercase tracking-wider text-ink-light">
          <tr>
            <th className="text-left px-5 py-2">Pos</th>
            <th className="text-left px-2 py-2">Player</th>
            <th className="text-right px-2 py-2">To Par</th>
            <th className="text-right px-2 py-2">Thru</th>
            <th className="text-right px-2 py-2">Wave</th>
            <th className="text-right px-5 py-2">Your Exposure</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.player} className="border-t border-cream-dark/60">
              <td className="px-5 py-2.5 num">{r.position}</td>
              <td className="px-2 py-2.5 font-medium">{r.player}</td>
              <td
                className={`px-2 py-2.5 text-right num ${
                  r.toPar < 0 ? "text-signal-positive" : r.toPar > 0 ? "text-signal-negative" : ""
                }`}
              >
                {r.toPar > 0 ? "+" : ""}
                {r.toPar === 0 ? "E" : r.toPar}
              </td>
              <td className="px-2 py-2.5 text-right num">{r.thru}</td>
              <td className="px-2 py-2.5 text-right text-ink-mid">{r.wave}</td>
              <td className="px-5 py-2.5 text-right num">
                {r.userExposure
                  ? `${r.userExposure.bets}× · $${r.userExposure.netRisk}`
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
