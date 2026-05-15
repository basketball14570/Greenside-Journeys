export default function BetsPage() {
  return (
    <div className="max-w-4xl mx-auto px-5 lg:px-0 py-6 space-y-6">
      <header>
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
        >
          ● Portfolio
        </span>
        <h1
          className="serif-italic mt-1.5"
          style={{ fontSize: 36, letterSpacing: -0.4, fontStyle: "normal" }}
        >
          <em>All tickets.</em>
        </h1>
        <p className="text-text-dim mt-2" style={{ fontSize: 14 }}>
          Filter by book, tournament, status, market. Export CSV. Tag for model
          training.
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
          Full table view · book filters · CSV export · win/loss analytics ·
          correlation visualizer.
        </p>
      </div>
    </div>
  );
}
