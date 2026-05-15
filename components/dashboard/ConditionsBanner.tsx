export type ConditionAlert = {
  id: string;
  severity: "info" | "warning" | "critical";
  course: string;
  headline: string;
  detail: string;
  affectedBets: number;
  evDelta: number; // signed percent, e.g. -8 means -8% EV
};

export function ConditionsBanner({ alert }: { alert: ConditionAlert }) {
  const tone =
    alert.severity === "critical"
      ? "bg-signal-negative/10 border-signal-negative/30 text-signal-negative"
      : alert.severity === "warning"
        ? "bg-gold/10 border-gold/40 text-green-deep"
        : "bg-green-bright/10 border-green-bright/30 text-green-deep";

  return (
    <div className={`card p-5 border-l-4 ${tone}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="text-xs uppercase tracking-[0.18em] opacity-70 mb-1">
            {alert.course} · Live Condition Alert
          </div>
          <h3 className="font-display text-xl mb-1.5">{alert.headline}</h3>
          <p className="text-sm opacity-90">{alert.detail}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="num text-2xl font-semibold">
            {alert.evDelta > 0 ? "+" : ""}
            {alert.evDelta.toFixed(1)}%
          </div>
          <div className="text-xs opacity-70">
            EV shift · {alert.affectedBets} bet{alert.affectedBets === 1 ? "" : "s"}
          </div>
        </div>
      </div>
    </div>
  );
}
