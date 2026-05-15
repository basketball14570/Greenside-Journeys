export default function DfsPage() {
  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-[0.2em] text-gold mb-1">
          DraftKings DFS
        </div>
        <h1 className="font-display text-4xl">Wave-Aware Lineup Builder</h1>
        <p className="text-ink-mid mt-2">
          Optimizer that prices in tee-time wave, live weather, and course fit
          on top of DK salaries.
        </p>
      </header>
      <div className="card p-12 text-center text-ink-mid">
        <div className="font-display text-2xl mb-2">Coming next</div>
        <p>
          Salary import · projections × wave multiplier · Monte Carlo lineup
          builder · deep-link export to DraftKings.
        </p>
      </div>
    </div>
  );
}
