export default function ConditionsPage() {
  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-[0.2em] text-gold mb-1">
          Live Conditions
        </div>
        <h1 className="font-display text-4xl">Course Weather & Alerts</h1>
        <p className="text-ink-mid mt-2">
          Real-time wind, precip, and gust readings for tournament venues, plus
          historical comparison and forecast trajectory.
        </p>
      </header>
      <div className="card p-12 text-center text-ink-mid">
        <div className="font-display text-2xl mb-2">Coming next</div>
        <p>
          Tomorrow.io feed visualization · per-hole wind direction overlay ·
          AM/PM wave delta · alert history timeline.
        </p>
      </div>
    </div>
  );
}
