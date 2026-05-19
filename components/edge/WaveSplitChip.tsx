import Link from "next/link";
import type { WaveSplitSummary } from "@/lib/weather/forecast";

// Compact AM/PM wave chip for the mobile Today screen. Shows the bigger
// of Thu/Fri's expected wind delta and which wave it favors, then taps
// through to the full conditions view for tee-time-level detail.
export function WaveSplitChip({
  summary,
  href = "/dashboard/conditions",
}: {
  summary: WaveSplitSummary | null;
  href?: string;
}) {
  if (!summary || summary.rounds.length === 0) return null;

  // Surface the round with the larger absolute split — that's the one
  // that actually moves the bet.
  const sorted = [...summary.rounds].sort(
    (a, b) =>
      Math.abs(b.deltaPmMinusAm ?? 0) - Math.abs(a.deltaPmMinusAm ?? 0),
  );
  const hero = sorted[0];
  if (!hero || hero.am == null || hero.pm == null) return null;

  const delta = hero.deltaPmMinusAm ?? 0;
  const favor = hero.favors;
  const headline =
    favor === "am"
      ? `${hero.dayLabel} AM wave catches it`
      : favor === "pm"
        ? `${hero.dayLabel} PM wave catches it`
        : `${hero.dayLabel} waves play even`;
  const color =
    favor === "am"
      ? "#8ee68e"
      : favor === "pm"
        ? "#f5c558"
        : "#a8b3ac";

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
            style={{
              fontSize: 9.5,
              letterSpacing: 1.1,
              color,
            }}
          >
            ◐ Wave split
          </span>
          <span
            className="block mt-0.5"
            style={{ fontSize: 14, fontWeight: 600, color: "#f0ebe0" }}
          >
            {headline}
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
            {delta} mph
          </span>
        </div>
      </div>
    </Link>
  );
}

// Full detail variant for the Course conditions tab. Lists every
// populated round with both waves and a brief takeaway.
export function WaveSplitDetail({ summary }: { summary: WaveSplitSummary | null }) {
  if (!summary || summary.rounds.length === 0) return null;
  return (
    <section className="rounded-[14px] border border-line bg-surface-1 p-4 space-y-3">
      <header className="flex items-baseline justify-between">
        <div>
          <span
            className="num font-semibold uppercase"
            style={{ fontSize: 10, letterSpacing: 1.2, color: "#8ee68e" }}
          >
            ◐ Wave split — Thu/Fri
          </span>
          <h3
            className="serif-italic mt-0.5"
            style={{ fontSize: 22, letterSpacing: -0.3, fontStyle: "normal" }}
          >
            <em>AM vs PM wind, by round.</em>
          </h3>
        </div>
      </header>
      <p className="text-text-dim" style={{ fontSize: 12.5, lineHeight: 1.45 }}>
        Forecast averages over the morning (7-11am) and afternoon (1-5pm) tee
        windows. ≥3 mph delta starts to skew scoring.
      </p>
      <ul className="space-y-2">
        {summary.rounds.map((r) => {
          const color =
            r.favors === "am"
              ? "#8ee68e"
              : r.favors === "pm"
                ? "#f5c558"
                : "#a8b3ac";
          return (
            <li
              key={r.date}
              className="grid items-center gap-3 px-3 py-2.5 rounded-[10px] border border-line"
              style={{
                gridTemplateColumns: "70px 1fr 80px",
                background: "rgba(0,0,0,0.12)",
              }}
            >
              <span className="num" style={{ fontSize: 13, fontWeight: 600 }}>
                {r.dayLabel}
              </span>
              <div className="flex items-baseline gap-3 num" style={{ fontSize: 13 }}>
                <span style={{ color: "#a8b3ac" }}>
                  AM{" "}
                  <strong style={{ color: "#f0ebe0" }}>
                    {r.am?.windAvg ?? "—"}
                  </strong>
                  {r.am ? "mph" : ""}
                </span>
                <span style={{ color: "#6c7a72" }}>·</span>
                <span style={{ color: "#a8b3ac" }}>
                  PM{" "}
                  <strong style={{ color: "#f0ebe0" }}>
                    {r.pm?.windAvg ?? "—"}
                  </strong>
                  {r.pm ? "mph" : ""}
                </span>
              </div>
              <span
                className="num text-right"
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 4,
                  color,
                  background: `${color}1a`,
                  border: `1px solid ${color}33`,
                  letterSpacing: 0.4,
                }}
              >
                {r.favors === "am"
                  ? "Favors AM"
                  : r.favors === "pm"
                    ? "Favors PM"
                    : r.favors === "even"
                      ? "Even"
                      : "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
