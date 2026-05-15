export default function DfsPage() {
  return (
    <div className="max-w-4xl mx-auto px-5 lg:px-0 py-6 space-y-6">
      <header>
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
        >
          ● DraftKings DFS
        </span>
        <h1
          className="serif-italic mt-1.5"
          style={{ fontSize: 36, letterSpacing: -0.4, fontStyle: "normal" }}
        >
          <em>Wave-aware lineups.</em>
        </h1>
        <p className="text-text-dim mt-2" style={{ fontSize: 14 }}>
          Optimizer that prices in tee-time wave, live weather, and course fit
          on top of DK salaries.
        </p>
      </header>
      <div className="rounded-[14px] bg-surface-1 border border-line p-12 text-center">
        <div
          className="serif-italic mb-2"
          style={{ fontSize: 22, fontStyle: "normal", color: "#f0ebe0" }}
        >
          Coming next
        </div>
        <p className="text-text-dim" style={{ fontSize: 13.5 }}>
          Salary import · projections × wave multiplier · Monte Carlo lineup
          builder · deep-link export to DraftKings.
        </p>
      </div>
    </div>
  );
}
