import Link from "next/link";
import type { WaveSplitSummary } from "@/lib/weather/forecast";

// Compact wave chip for the mobile Today screen. Headlines the combined
// Thu+Fri edge (Wave 1 = Thu AM / Fri PM, Wave 2 = Thu PM / Fri AM) since
// that's the pairing the tour actually uses for tee times. Falls back
// to the larger of the per-round splits when we don't have all four
// windows in the forecast yet.
export function WaveSplitChip({
  summary,
  href = "/dashboard/conditions",
}: {
  summary: WaveSplitSummary | null;
  href?: string;
}) {
  if (!summary || summary.rounds.length === 0) return null;

  if (summary.combined) {
    const c = summary.combined;
    const color =
      c.favors === "wave1"
        ? "#8ee68e"
        : c.favors === "wave2"
          ? "#f5c558"
          : "#a8b3ac";
    const headline =
      c.favors === "wave1"
        ? "Wave 1 has the edge"
        : c.favors === "wave2"
          ? "Wave 2 has the edge"
          : "Waves play even";
    const subline =
      c.favors === "even"
        ? `${c.wave1.label} ≈ ${c.wave2.label}`
        : c.favors === "wave1"
          ? `${c.wave1.label} plays softer`
          : `${c.wave2.label} plays softer`;

    return (
      <Link
        href={href}
        className="block mx-5 mb-3 rounded-[12px] border border-line bg-surface-1 px-3.5 py-2.5"
        style={{ boxShadow: "0 1px 0 rgba(0,0,0,0.15)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span
              className="num font-semibold uppercase block"
              style={{ fontSize: 9.5, letterSpacing: 1.1, color }}
            >
              ◐ Wave edge · Thu+Fri
            </span>
            <span
              className="block mt-0.5"
              style={{ fontSize: 14, fontWeight: 600, color: "#f0ebe0" }}
            >
              {headline}
            </span>
            <span
              className="block mt-0.5 num"
              style={{ fontSize: 11, color: "#a8b3ac", letterSpacing: 0.3 }}
            >
              {subline}
            </span>
          </div>
          <div className="text-right num" style={{ fontSize: 11.5 }}>
            <div style={{ color: "#a8b3ac" }}>
              W1 <strong style={{ color: "#f0ebe0" }}>{c.wave1.windAvg}</strong>{" "}
              <span style={{ color: "#6c7a72" }}>mph</span>
            </div>
            <div style={{ color: "#a8b3ac" }}>
              W2 <strong style={{ color: "#f0ebe0" }}>{c.wave2.windAvg}</strong>{" "}
              <span style={{ color: "#6c7a72" }}>mph</span>
            </div>
            <span
              className="num inline-block mt-1"
              style={{
                fontSize: 10,
                padding: "1.5px 6px",
                borderRadius: 4,
                color,
                background: `${color}1a`,
                border: `1px solid ${color}33`,
                letterSpacing: 0.4,
              }}
            >
              Δ {c.deltaWave2MinusWave1 >= 0 ? "+" : ""}
              {c.deltaWave2MinusWave1}
            </span>
          </div>
        </div>
      </Link>
    );
  }

  // Fallback: per-round split, pick the round with the larger absolute delta.
  const sorted = [...summary.rounds].sort(
    (a, b) =>
      Math.abs(b.deltaPmMinusAm ?? 0) - Math.abs(a.deltaPmMinusAm ?? 0),
  );
  const hero = sorted[0];
  if (!hero || hero.am == null || hero.pm == null) return null;
  const delta = hero.deltaPmMinusAm ?? 0;
  const favor = hero.favors;
  const color =
    favor === "am" ? "#8ee68e" : favor === "pm" ? "#f5c558" : "#a8b3ac";

  return (
    <Link
      href={href}
      className="block mx-5 mb-3 rounded-[12px] border border-line bg-surface-1 px-3.5 py-2.5"
      style={{ boxShadow: "0 1px 0 rgba(0,0,0,0.15)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span
            className="num font-semibold uppercase block"
            style={{ fontSize: 9.5, letterSpacing: 1.1, color }}
          >
            ◐ Wave split
          </span>
          <span
            className="block mt-0.5"
            style={{ fontSize: 14, fontWeight: 600, color: "#f0ebe0" }}
          >
            {favor === "am"
              ? `${hero.dayLabel} AM catches it`
              : favor === "pm"
                ? `${hero.dayLabel} PM catches it`
                : `${hero.dayLabel} plays even`}
          </span>
        </div>
        <div className="flex items-baseline gap-2.5 num" style={{ fontSize: 12 }}>
          <span style={{ color: "#a8b3ac" }}>
            AM <strong style={{ color: "#f0ebe0" }}>{hero.am.windAvg}</strong>
          </span>
          <span style={{ color: "#6c7a72" }}>·</span>
          <span style={{ color: "#a8b3ac" }}>
            PM <strong style={{ color: "#f0ebe0" }}>{hero.pm.windAvg}</strong>
          </span>
          <span
            className="num"
            style={{
              fontSize: 10.5,
              padding: "1.5px 6px",
              borderRadius: 4,
              color,
              background: `${color}1a`,
              border: `1px solid ${color}33`,
              letterSpacing: 0.4,
            }}
          >
            Δ {delta >= 0 ? "+" : ""}
            {delta}
          </span>
        </div>
      </div>
    </Link>
  );
}

// Full detail variant for the Course conditions tab. Three blocks:
//   1. Combined wave edge headline (Thu+Fri pairing)
//   2. Hour-by-hour wind+temp grid for Thu and Fri, 7am-5pm
//   3. Per-round AM/PM aggregates for quick comparison
export function WaveSplitDetail({ summary }: { summary: WaveSplitSummary | null }) {
  if (!summary || summary.rounds.length === 0) return null;

  return (
    <section className="rounded-[14px] border border-line bg-surface-1 p-4 space-y-4">
      <header>
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.2, color: "#8ee68e" }}
        >
          ◐ Wave forecast · Thu + Fri
        </span>
        <h3
          className="serif-italic mt-0.5"
          style={{ fontSize: 22, letterSpacing: -0.3, fontStyle: "normal" }}
        >
          <em>Tee-wave edge.</em>
        </h3>
        <p
          className="text-text-dim mt-1"
          style={{ fontSize: 12.5, lineHeight: 1.45 }}
        >
          Wave 1 plays Thu morning + Fri afternoon. Wave 2 plays Thu afternoon
          + Fri morning. Lower wind across both rounds = the edge.
        </p>
      </header>

      {summary.combined && <CombinedEdgeBlock combined={summary.combined} />}

      <HourlyGrid rounds={summary.rounds} />

      <RoundAggregates rounds={summary.rounds} />
    </section>
  );
}

function CombinedEdgeBlock({
  combined,
}: {
  combined: NonNullable<WaveSplitSummary["combined"]>;
}) {
  const color =
    combined.favors === "wave1"
      ? "#8ee68e"
      : combined.favors === "wave2"
        ? "#f5c558"
        : "#a8b3ac";
  return (
    <div
      className="rounded-[10px] border p-3"
      style={{
        borderColor: `${color}40`,
        background: `${color}0d`,
      }}
    >
      <div className="flex items-baseline justify-between gap-2 mb-2.5">
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.1, color }}
        >
          Combined edge
        </span>
        <span
          className="num"
          style={{ fontSize: 11, color: "#a8b3ac", letterSpacing: 0.3 }}
        >
          Δ {combined.deltaWave2MinusWave1 >= 0 ? "+" : ""}
          {combined.deltaWave2MinusWave1} mph
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <WaveBlock
          label={combined.wave1.label}
          name="Wave 1"
          wind={combined.wave1.windAvg}
          temp={combined.wave1.tempAvg}
          highlight={combined.favors === "wave1"}
        />
        <WaveBlock
          label={combined.wave2.label}
          name="Wave 2"
          wind={combined.wave2.windAvg}
          temp={combined.wave2.tempAvg}
          highlight={combined.favors === "wave2"}
        />
      </div>
    </div>
  );
}

function WaveBlock({
  label,
  name,
  wind,
  temp,
  highlight,
}: {
  label: string;
  name: string;
  wind: number;
  temp: number;
  highlight: boolean;
}) {
  return (
    <div
      className="rounded-[8px] px-3 py-2.5 border"
      style={{
        borderColor: highlight ? "#8ee68e66" : "#3a4a40",
        background: highlight ? "rgba(142,230,142,0.08)" : "rgba(0,0,0,0.12)",
      }}
    >
      <div className="flex items-baseline justify-between">
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 9.5, letterSpacing: 1, color: "#a8b3ac" }}
        >
          {name}
        </span>
        {highlight && (
          <span
            className="num font-semibold uppercase"
            style={{ fontSize: 9, letterSpacing: 0.8, color: "#8ee68e" }}
          >
            ▲ Edge
          </span>
        )}
      </div>
      <div
        className="num mt-0.5"
        style={{ fontSize: 11, color: "#a8b3ac", letterSpacing: 0.3 }}
      >
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-3 num">
        <span style={{ fontSize: 18, fontWeight: 600, color: "#f0ebe0" }}>
          {wind}
          <span
            style={{ fontSize: 11, color: "#6c7a72", marginLeft: 2 }}
          >
            mph
          </span>
        </span>
        <span style={{ fontSize: 13, color: "#a8b3ac" }}>
          {temp}°F
        </span>
      </div>
    </div>
  );
}

function HourlyGrid({
  rounds,
}: {
  rounds: WaveSplitSummary["rounds"];
}) {
  // Build a unified hour set (7..17). For each row (round) we show one
  // cell per hour with temp + wind stacked.
  const hours = Array.from({ length: 11 }, (_, i) => i + 7);

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
        <thead>
          <tr>
            <th
              className="num font-semibold uppercase text-left pl-1 pb-1.5"
              style={{ fontSize: 9.5, letterSpacing: 1, color: "#6c7a72" }}
            >
              Day
            </th>
            {hours.map((h) => (
              <th
                key={h}
                className="num font-semibold uppercase pb-1.5"
                style={{
                  fontSize: 9.5,
                  letterSpacing: 0.6,
                  color: "#6c7a72",
                  minWidth: 36,
                }}
              >
                {fmtHour(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rounds.map((r) => (
            <tr key={r.date}>
              <td
                className="num pl-1 pr-2"
                style={{ fontSize: 12, color: "#f0ebe0", fontWeight: 600 }}
              >
                {r.dayLabel}
              </td>
              {hours.map((hour) => {
                const cell = r.hourly.find((h) => h.hour === hour);
                if (!cell) {
                  return (
                    <td
                      key={hour}
                      className="num text-center py-1"
                      style={{ fontSize: 10, color: "#3a4a40" }}
                    >
                      —
                    </td>
                  );
                }
                const heavy = cell.windMph >= 15;
                return (
                  <td
                    key={hour}
                    className="text-center py-1"
                    style={{ minWidth: 36 }}
                  >
                    <div
                      className="num"
                      style={{
                        fontSize: 12,
                        color: heavy ? "#f5c558" : "#f0ebe0",
                        fontWeight: 600,
                        lineHeight: 1.05,
                      }}
                    >
                      {cell.windMph}
                    </div>
                    <div
                      className="num"
                      style={{
                        fontSize: 9.5,
                        color: "#6c7a72",
                        letterSpacing: 0.2,
                      }}
                    >
                      {cell.tempF}°
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div
        className="num text-text-muted mt-2 pl-1"
        style={{ fontSize: 10, letterSpacing: 0.4 }}
      >
        Top number = wind mph (yellow if ≥15). Bottom = temp °F.
      </div>
    </div>
  );
}

function RoundAggregates({
  rounds,
}: {
  rounds: WaveSplitSummary["rounds"];
}) {
  return (
    <ul className="space-y-2">
      {rounds.map((r) => {
        const color =
          r.favors === "am"
            ? "#8ee68e"
            : r.favors === "pm"
              ? "#f5c558"
              : "#a8b3ac";
        return (
          <li
            key={r.date}
            className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] border border-line"
            style={{ background: "rgba(0,0,0,0.12)" }}
          >
            <span
              className="num shrink-0 inline-flex items-center justify-center font-bold"
              style={{
                width: 34,
                height: 22,
                fontSize: 11,
                borderRadius: 6,
                background: "rgba(255,255,255,0.06)",
                color: "#d4dbd6",
              }}
            >
              {r.dayLabel}
            </span>
            <span className="num shrink-0" style={{ fontSize: 12 }}>
              <span style={{ color: "#7e8a83" }}>AM </span>
              <strong style={{ color: "#f0ebe0" }}>{r.am?.windAvg ?? "—"}</strong>
              {r.am ? <span style={{ color: "#7e8a83" }}>mph·{r.am.tempAvg}°</span> : null}
            </span>
            <span className="num shrink-0" style={{ fontSize: 12 }}>
              <span style={{ color: "#7e8a83" }}>PM </span>
              <strong style={{ color: "#f0ebe0" }}>{r.pm?.windAvg ?? "—"}</strong>
              {r.pm ? <span style={{ color: "#7e8a83" }}>mph·{r.pm.tempAvg}°</span> : null}
            </span>
            <span
              className="num shrink-0 ml-auto"
              style={{
                fontSize: 10.5,
                padding: "2px 8px",
                borderRadius: 5,
                color,
                background: `${color}1a`,
                border: `1px solid ${color}33`,
                letterSpacing: 0.4,
              }}
            >
              {r.favors === "am"
                ? "AM lighter"
                : r.favors === "pm"
                  ? "PM lighter"
                  : r.favors === "even"
                    ? "Even"
                    : "—"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function fmtHour(h: number): string {
  if (h === 12) return "12p";
  if (h === 0) return "12a";
  if (h < 12) return `${h}a`;
  return `${h - 12}p`;
}
