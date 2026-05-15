export default function ConditionsPage() {
  return (
    <div className="max-w-4xl mx-auto px-5 lg:px-0 py-6 space-y-6">
      <header>
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
        >
          ● Live Conditions
        </span>
        <h1
          className="serif-italic mt-1.5"
          style={{ fontSize: 36, letterSpacing: -0.4, fontStyle: "normal" }}
        >
          <em>Course weather & alerts.</em>
        </h1>
        <p className="text-text-dim mt-2" style={{ fontSize: 14 }}>
          Real-time wind, precip, and gust readings for tournament venues, plus
          historical comparison and forecast trajectory.
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
          Tomorrow.io feed visualization · per-hole wind direction overlay ·
          AM/PM wave delta · alert history timeline.
        </p>
      </div>
    </div>
  );
}
