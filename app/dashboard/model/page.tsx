import { buildResiduals, calibrate, perPlayer } from "@/lib/wind-model";

export const metadata = {
  title: "Wind Model · Greenside",
};

export default function ModelPage() {
  const stats = calibrate();
  const players = perPlayer().sort(
    (a, b) => Math.abs(b.bias) - Math.abs(a.bias),
  );
  const residuals = buildResiduals();

  return (
    <div className="px-5 lg:px-8 py-6 space-y-6 max-w-6xl mx-auto">
      <header>
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
        >
          ● Model Lab
        </span>
        <h1
          className="serif-italic mt-1.5"
          style={{ fontSize: 36, letterSpacing: -0.4 }}
        >
          <em>Is the wind model right?</em>
        </h1>
        <p className="text-text-dim mt-2 max-w-2xl" style={{ fontSize: 14 }}>
          Each player&apos;s windSensitivity coefficient predicts how many
          strokes per round they lose per +10 mph of wind. Here we check
          the prediction against their actual round history — round-level
          residuals, calibration buckets, and per-player drift. Same engine
          will run nightly once DataGolf round data is wired.
        </p>
      </header>

      <SummaryStats stats={stats} />

      <CalibrationBuckets stats={stats} />

      <PlayerDriftTable rows={players} />

      <ResidualScatter residuals={residuals} />

      <ReadingTheNumbers />
    </div>
  );
}

function SummaryStats({ stats }: { stats: ReturnType<typeof calibrate> }) {
  return (
    <div className="rounded-[14px] border border-line p-5 bg-surface-1">
      <h2 className="font-medium mb-4" style={{ fontSize: 18 }}>
        Headline calibration
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Metric
          label="Rounds sampled"
          value={stats.rounds.toString()}
          sub="player × event grid"
        />
        <Metric
          label="Bias (signed)"
          value={fmtPlus(stats.meanResidual)}
          sub="strokes/round"
          tone={Math.abs(stats.meanResidual) < 0.15 ? "good" : "bad"}
        />
        <Metric
          label="MAE"
          value={`${stats.meanAbsResidual.toFixed(2)}u`}
          sub="mean abs error"
          tone={stats.meanAbsResidual < 0.5 ? "good" : "bad"}
        />
        <Metric
          label="R² / r"
          value={`${stats.rSquared.toFixed(2)} / ${stats.pearson.toFixed(2)}`}
          sub="fit vs correlation"
          tone={stats.pearson > 0.4 ? "good" : "bad"}
        />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "bad";
}) {
  const color =
    tone === "good" ? "#7fd49a" : tone === "bad" ? "#e87c7c" : undefined;
  return (
    <div>
      <div
        className="num text-text-dim uppercase"
        style={{ fontSize: 10, letterSpacing: 1.2 }}
      >
        {label}
      </div>
      <div className="num mt-1" style={{ fontSize: 24, color }}>
        {value}
      </div>
      {sub && (
        <div className="text-text-dim mt-0.5" style={{ fontSize: 11 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function CalibrationBuckets({
  stats,
}: {
  stats: ReturnType<typeof calibrate>;
}) {
  return (
    <div className="rounded-[14px] border border-line overflow-hidden">
      <div className="px-4 py-3 border-b border-line bg-surface-1">
        <h2 className="font-medium" style={{ fontSize: 18 }}>
          Calibration by wind regime
        </h2>
        <p className="text-text-dim mt-1" style={{ fontSize: 12 }}>
          Mean predicted vs actual drag for each wind bucket. Bias = predicted − actual; positive means the model over-predicts drag.
        </p>
      </div>
      <table className="w-full" style={{ fontSize: 13 }}>
        <thead>
          <tr
            className="bg-surface-1 text-text-dim uppercase"
            style={{ fontSize: 10, letterSpacing: 1.2 }}
          >
            <th className="text-left px-4 py-2.5">Regime</th>
            <th className="text-right px-4 py-2.5">Wind range</th>
            <th className="text-right px-4 py-2.5">Rounds</th>
            <th className="text-right px-4 py-2.5">Predicted</th>
            <th className="text-right px-4 py-2.5">Actual</th>
            <th className="text-right px-4 py-2.5">Bias</th>
          </tr>
        </thead>
        <tbody>
          {stats.buckets.map((b) => (
            <tr key={b.label} className="border-t border-line/40">
              <td className="px-4 py-2.5" style={{ fontWeight: 500 }}>
                {b.label}
              </td>
              <td className="text-right px-4 py-2.5 num text-text-dim">
                {b.windRangeLow}–{b.windRangeHigh === 99 ? "+" : b.windRangeHigh} mph
              </td>
              <td className="text-right px-4 py-2.5 num">{b.rounds}</td>
              <td className="text-right px-4 py-2.5 num">
                {b.meanPredicted.toFixed(2)}u
              </td>
              <td className="text-right px-4 py-2.5 num">
                {b.meanActual.toFixed(2)}u
              </td>
              <td
                className="text-right px-4 py-2.5 num"
                style={{
                  color:
                    Math.abs(b.bias) < 0.1
                      ? undefined
                      : b.bias > 0
                        ? "#e87c7c"
                        : "#f5c558",
                }}
              >
                {fmtPlus(b.bias)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlayerDriftTable({
  rows,
}: {
  rows: ReturnType<typeof perPlayer>;
}) {
  return (
    <div className="rounded-[14px] border border-line overflow-hidden">
      <div className="px-4 py-3 border-b border-line bg-surface-1">
        <h2 className="font-medium" style={{ fontSize: 18 }}>
          Per-player drift
        </h2>
        <p className="text-text-dim mt-1" style={{ fontSize: 12 }}>
          Where the current coefficient is most wrong. &quot;Suggested&quot; is the
          least-squares fit through that player&apos;s own recent rounds — adopt with caution; this is a small sample.
        </p>
      </div>
      <table className="w-full" style={{ fontSize: 13 }}>
        <thead>
          <tr
            className="bg-surface-1 text-text-dim uppercase"
            style={{ fontSize: 10, letterSpacing: 1.2 }}
          >
            <th className="text-left px-4 py-2.5">Player</th>
            <th className="text-right px-4 py-2.5">Rounds</th>
            <th className="text-right px-4 py-2.5">Current</th>
            <th className="text-right px-4 py-2.5">Suggested</th>
            <th className="text-right px-4 py-2.5">Bias</th>
            <th className="text-right px-4 py-2.5">MAE</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const delta = r.suggested - r.current;
            return (
              <tr key={r.slug} className="border-t border-line/40">
                <td className="px-4 py-2.5" style={{ fontWeight: 500 }}>
                  {r.name}
                </td>
                <td className="text-right px-4 py-2.5 num">{r.rounds}</td>
                <td className="text-right px-4 py-2.5 num">
                  {r.current.toFixed(2)}
                </td>
                <td
                  className="text-right px-4 py-2.5 num"
                  style={{
                    color:
                      Math.abs(delta) < 0.05
                        ? undefined
                        : delta > 0
                          ? "#e87c7c"
                          : "#7fd49a",
                  }}
                >
                  {r.suggested.toFixed(2)}
                  <span className="text-text-dim ml-1" style={{ fontSize: 10 }}>
                    ({fmtPlus(delta)})
                  </span>
                </td>
                <td
                  className="text-right px-4 py-2.5 num"
                  style={{
                    color:
                      Math.abs(r.bias) < 0.1
                        ? undefined
                        : r.bias > 0
                          ? "#e87c7c"
                          : "#f5c558",
                  }}
                >
                  {fmtPlus(r.bias)}
                </td>
                <td className="text-right px-4 py-2.5 num">
                  {r.mae.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ResidualScatter({
  residuals,
}: {
  residuals: ReturnType<typeof buildResiduals>;
}) {
  const W = 720;
  const H = 320;
  const PAD = 36;
  const xs = residuals.map((r) => r.predictedDrag);
  const ys = residuals.map((r) => r.actualDrag);
  if (!xs.length) return null;
  const xMin = Math.min(0, ...xs);
  const xMax = Math.max(0.5, ...xs);
  const yMin = Math.min(-0.5, ...ys);
  const yMax = Math.max(0.5, ...ys);
  const xs2 = (v: number) =>
    PAD + ((v - xMin) / (xMax - xMin)) * (W - PAD * 2);
  const ys2 = (v: number) =>
    H - PAD - ((v - yMin) / (yMax - yMin)) * (H - PAD * 2);

  return (
    <div className="rounded-[14px] border border-line p-5 bg-surface-1">
      <h2 className="font-medium" style={{ fontSize: 18 }}>
        Predicted vs actual drag
      </h2>
      <p className="text-text-dim mt-1 mb-3" style={{ fontSize: 12 }}>
        Each dot is one round. The diagonal is perfect calibration; dots
        above it are rounds where the player lost more strokes than the
        model predicted, dots below are over-predictions.
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {/* gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const v = xMin + (xMax - xMin) * t;
          return (
            <g key={`gx-${t}`}>
              <line
                x1={xs2(v)}
                x2={xs2(v)}
                y1={PAD}
                y2={H - PAD}
                stroke="rgba(255,255,255,0.05)"
              />
              <text
                x={xs2(v)}
                y={H - PAD + 14}
                textAnchor="middle"
                fill="rgba(255,255,255,0.4)"
                fontSize="10"
              >
                {v.toFixed(2)}
              </text>
            </g>
          );
        })}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const v = yMin + (yMax - yMin) * t;
          return (
            <g key={`gy-${t}`}>
              <line
                x1={PAD}
                x2={W - PAD}
                y1={ys2(v)}
                y2={ys2(v)}
                stroke="rgba(255,255,255,0.05)"
              />
              <text
                x={PAD - 6}
                y={ys2(v) + 3}
                textAnchor="end"
                fill="rgba(255,255,255,0.4)"
                fontSize="10"
              >
                {v.toFixed(2)}
              </text>
            </g>
          );
        })}
        {/* y=x diagonal */}
        <line
          x1={xs2(Math.max(xMin, yMin))}
          x2={xs2(Math.min(xMax, yMax))}
          y1={ys2(Math.max(xMin, yMin))}
          y2={ys2(Math.min(xMax, yMax))}
          stroke="rgba(127,212,154,0.5)"
          strokeDasharray="4 4"
        />
        {/* y=0 axis */}
        <line
          x1={PAD}
          x2={W - PAD}
          y1={ys2(0)}
          y2={ys2(0)}
          stroke="rgba(255,255,255,0.15)"
        />
        {residuals.map((r, i) => (
          <circle
            key={i}
            cx={xs2(r.predictedDrag)}
            cy={ys2(r.actualDrag)}
            r={4}
            fill={
              Math.abs(r.residual) < 0.15
                ? "#7fd49a"
                : r.residual > 0
                  ? "#f5c558"
                  : "#e87c7c"
            }
            fillOpacity={0.75}
          >
            <title>
              {r.player} · {r.event} · {r.windMph} mph · predicted {r.predictedDrag.toFixed(2)} · actual {r.actualDrag.toFixed(2)}
            </title>
          </circle>
        ))}
        <text
          x={W / 2}
          y={H - 4}
          textAnchor="middle"
          fill="rgba(255,255,255,0.55)"
          fontSize="11"
        >
          Predicted drag (strokes/round)
        </text>
        <text
          x={10}
          y={H / 2}
          textAnchor="middle"
          fill="rgba(255,255,255,0.55)"
          fontSize="11"
          transform={`rotate(-90 10 ${H / 2})`}
        >
          Actual drag (strokes/round)
        </text>
      </svg>
    </div>
  );
}

function ReadingTheNumbers() {
  return (
    <div
      className="rounded-[14px] p-5 border border-line"
      style={{ background: "rgba(124,192,232,0.05)" }}
    >
      <div className="flex items-baseline gap-2 mb-2">
        <span style={{ fontSize: 14, color: "#7cc0e8" }}>ℹ</span>
        <h3 className="font-medium" style={{ fontSize: 14 }}>
          Reading the numbers
        </h3>
      </div>
      <ul
        className="text-text-dim space-y-1.5 ml-5 list-disc"
        style={{ fontSize: 13 }}
      >
        <li>
          <strong>Bias</strong> near zero = unbiased. Positive = the model
          over-predicts how much wind hurts; negative = it under-predicts.
        </li>
        <li>
          <strong>MAE</strong> = mean absolute error in strokes per round.
          A figure under 0.5 strokes is acceptable; under 0.3 is good.
        </li>
        <li>
          <strong>R²</strong> can be negative on small samples — it just
          means predicted-drag is worse than a constant predictor of mean
          actual drag. Pearson r is more interpretable: 0 = no relationship,
          1 = perfect linear.
        </li>
        <li>
          The current sample is the demo player set (5 rounds × 5 players).
          Once DataGolf round data is wired, this page becomes meaningful.
        </li>
      </ul>
    </div>
  );
}

function fmtPlus(n: number): string {
  if (Math.abs(n) < 0.005) return "0.00";
  return n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2);
}
