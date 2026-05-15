export default function BetsPage() {
  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-[0.2em] text-gold mb-1">
          Portfolio
        </div>
        <h1 className="font-display text-4xl">All Bets</h1>
        <p className="text-ink-mid mt-2">
          Filter by book, tournament, status, market. Export CSV. Tag for
          model training.
        </p>
      </header>
      <div className="card p-12 text-center text-ink-mid">
        <div className="font-display text-2xl mb-2">Coming next</div>
        <p>
          Full table view · book filters · CSV export · win/loss analytics ·
          correlation visualizer.
        </p>
      </div>
    </div>
  );
}
