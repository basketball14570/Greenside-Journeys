import type { CombinedWaveEdge } from "@/lib/weather/forecast";
import type { FieldWaveAttribution, FieldWaveRow } from "@/lib/data/wave-tees";

// "Who benefits from the wave edge?" — the top-10 players (by DG SG
// rating) sitting in the wave the forecast favors. When the forecast
// shows no real edge (favors === "even" or |delta| < 2 mph) we render
// a neutral state instead of pretending an edge exists, because that's
// what makes this card honest — some weeks the waves are even.

const TOP_N = 10;

export function WaveWatchlist({
  combined,
  field,
}: {
  combined: CombinedWaveEdge;
  field: FieldWaveAttribution;
}) {
  // Determine which wave (if any) the forecast favors. Use 2 mph as the
  // threshold — same as the WaveSplitChip — so "even" stays even.
  const isWave1Favored = combined.favors === "wave1";
  const isWave2Favored = combined.favors === "wave2";
  const isEven = combined.favors === "even";

  // Top N by DG SG total for the favored wave; for the other side we
  // also show the top N so the user can see what they'd be passing on.
  const favored = isWave1Favored
    ? field.wave1
    : isWave2Favored
      ? field.wave2
      : null;
  const fadeSide = isWave1Favored
    ? field.wave2
    : isWave2Favored
      ? field.wave1
      : null;

  if (isEven) {
    return (
      <section className="rounded-[14px] border border-line bg-surface-1 p-4">
        <header className="mb-2">
          <span
            className="num font-semibold uppercase"
            style={{ fontSize: 10, letterSpacing: 1.2, color: "#a8b3ac" }}
          >
            ◐ Wave watchlist
          </span>
          <h3
            className="serif-italic mt-0.5"
            style={{ fontSize: 22, letterSpacing: -0.3, fontStyle: "normal" }}
          >
            <em>No meaningful edge this week.</em>
          </h3>
        </header>
        <p
          className="text-text-dim"
          style={{ fontSize: 13, lineHeight: 1.45 }}
        >
          Wind across Thu+Fri sits within {Math.abs(combined.deltaWave2MinusWave1)} mph
          between waves. Not large enough to bet on the split — pick on
          ball-striking and course fit instead.
        </p>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <WavePeek label="Wave 1 · Thu AM / Fri PM" rows={field.wave1.slice(0, 5)} />
          <WavePeek label="Wave 2 · Thu PM / Fri AM" rows={field.wave2.slice(0, 5)} />
        </div>
      </section>
    );
  }

  if (!favored) return null;

  const favoredLabel = isWave1Favored
    ? "Wave 1 · Thu AM / Fri PM"
    : "Wave 2 · Thu PM / Fri AM";
  const fadeLabel = isWave1Favored
    ? "Wave 2 · Thu PM / Fri AM"
    : "Wave 1 · Thu AM / Fri PM";

  return (
    <section className="rounded-[14px] border border-line bg-surface-1 p-4">
      <header className="mb-3">
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.2, color: "#8ee68e" }}
        >
          ◐ Wave watchlist
        </span>
        <h3
          className="serif-italic mt-0.5"
          style={{ fontSize: 22, letterSpacing: -0.3, fontStyle: "normal" }}
        >
          <em>{favoredLabel} has the edge.</em>
        </h3>
        <p
          className="text-text-dim mt-1.5"
          style={{ fontSize: 13, lineHeight: 1.45 }}
        >
          Top players in this wave, ranked by DataGolf SG/round. These are
          the names to look at first when shopping winners, top-finish, and
          matchup tickets this week.
          {field.eventName ? ` · ${field.eventName}` : ""}
        </p>
      </header>
      <PlayerList rows={favored.slice(0, TOP_N)} highlight />
      {fadeSide && fadeSide.length > 0 && (
        <details className="mt-4">
          <summary
            className="num font-semibold uppercase cursor-pointer"
            style={{
              fontSize: 10,
              letterSpacing: 1.1,
              color: "#a8b3ac",
              listStyle: "none",
            }}
          >
            ▸ Top players in {fadeLabel} (for the other side)
          </summary>
          <div className="mt-3">
            <PlayerList rows={fadeSide.slice(0, TOP_N)} highlight={false} />
          </div>
        </details>
      )}
    </section>
  );
}

function PlayerList({
  rows,
  highlight,
}: {
  rows: FieldWaveRow[];
  highlight: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-text-dim" style={{ fontSize: 13 }}>
        No tee-time data yet — typically published Tuesday afternoon.
      </p>
    );
  }
  return (
    <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
      {rows.map((r, i) => {
        const sg = r.sgTotal;
        const sgColor =
          sg == null
            ? "#6c7a72"
            : sg > 1.5
              ? "#7fd49a"
              : sg > 0
                ? "#a8b3ac"
                : "#e57373";
        return (
          <li
            key={r.dgName}
            className="flex items-baseline justify-between gap-2 num"
            style={{ fontSize: 13 }}
          >
            <span className="flex items-baseline gap-2 min-w-0">
              <span
                className="num"
                style={{
                  fontSize: 11,
                  color: "#6c7a72",
                  width: 18,
                  display: "inline-block",
                }}
              >
                {i + 1}
              </span>
              <span
                className="truncate"
                style={{
                  color: highlight ? "#f0ebe0" : "#a8b3ac",
                  fontWeight: highlight ? 600 : 400,
                }}
              >
                {r.name}
              </span>
              {r.r1Tee && (
                <span
                  className="num"
                  style={{ fontSize: 10.5, color: "#6c7a72" }}
                >
                  {fmtTee(r.r1Tee)}
                </span>
              )}
            </span>
            <span
              className="num font-semibold"
              style={{ fontSize: 12, color: sgColor }}
            >
              {sg == null ? "—" : sg >= 0 ? `+${sg.toFixed(2)}` : sg.toFixed(2)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function WavePeek({ label, rows }: { label: string; rows: FieldWaveRow[] }) {
  return (
    <div>
      <div
        className="num font-semibold uppercase mb-1.5"
        style={{ fontSize: 9.5, letterSpacing: 1, color: "#6c7a72" }}
      >
        {label}
      </div>
      <PlayerList rows={rows} highlight={false} />
    </div>
  );
}

function fmtTee(tee: string): string {
  // DataGolf returns "HH:MM" 24h; humanize to "7:50a" / "1:20p".
  const t = tee.trim();
  const colon = t.indexOf(":");
  if (colon < 0) return t;
  const hour = Number(t.slice(0, colon));
  const minute = t.slice(colon + 1, colon + 3);
  if (!Number.isFinite(hour)) return t;
  if (hour === 0) return `12:${minute}a`;
  if (hour === 12) return `12:${minute}p`;
  if (hour < 12) return `${hour}:${minute}a`;
  return `${hour - 12}:${minute}p`;
}
