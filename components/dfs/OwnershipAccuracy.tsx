"use client";

import { useEffect, useMemo, useState } from "react";
import { DK_EVENT, DK_SALARIES } from "@/lib/data/dfs-salaries";
import { projectOwnership } from "@/lib/dfs/project-ownership";

type ProjRow = { name: string; projOwn: number };

// Token-set name key: lowercase, strip punctuation, sort the words. Robust to
// "Last, First" vs "First Last" and stray punctuation in "A.J. Ewart".
function nameKey(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

// Pull every "<name> <number>%" pair out of arbitrary pasted text. Tolerates
// single-column lists and the multi-column tab/space layout DK exports come
// in (several name+pct pairs per line).
function parseActuals(text: string): { name: string; own: number }[] {
  const out: { name: string; own: number }[] = [];
  const re = /([A-Za-z][A-Za-z.'\- ]*?[A-Za-z.])\s+(\d{1,3}(?:\.\d+)?)\s*%/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const name = m[1].trim();
    const own = Number(m[2]);
    if (!name || own > 100) continue;
    if (/^(player|drafted|name|own|ownership)$/i.test(name)) continue;
    out.push({ name, own });
  }
  return out;
}

function ownColor(own: number): string {
  if (own >= 20) return "#e87c7c";
  if (own >= 15) return "#f5c558";
  if (own >= 7) return "#f0ebe0";
  return "#7fd49a";
}

function deltaColor(d: number): string {
  const a = Math.abs(d);
  if (a < 2) return "#7fd49a";
  if (a < 5) return "#f5c558";
  return "#e87c7c";
}

type Joined = {
  name: string;
  projected: number;
  actual: number;
  delta: number; // projected - actual
};

export function OwnershipAccuracy() {
  const [actualText, setActualText] = useState("");
  const [sort, setSort] = useState<"actual" | "miss" | "over" | "under">("actual");

  // Same projection the "This week's projection" page shows. Render instantly
  // with the synchronous v1.1 model, then upgrade to the shared v2 numbers
  // (salary + value + DataGolf form signal) once the endpoint resolves.
  const [projection, setProjection] = useState<ProjRow[]>(() =>
    projectOwnership(DK_SALARIES).map((p) => ({ name: p.name, projOwn: p.projOwn })),
  );
  useEffect(() => {
    fetch("/api/dfs/heuristic-ownership")
      .then((r) => r.json())
      .then((j: { projections?: ProjRow[] }) => {
        if (Array.isArray(j.projections) && j.projections.length) {
          setProjection(j.projections.map((p) => ({ name: p.name, projOwn: p.projOwn })));
        }
      })
      .catch(() => {});
  }, []);
  const actuals = useMemo(() => parseActuals(actualText), [actualText]);

  const { joined, unmatchedActual, metrics } = useMemo(() => {
    const projByKey = new Map<string, number>();
    for (const p of projection) projByKey.set(nameKey(p.name), p.projOwn);

    const joined: Joined[] = [];
    for (const a of actuals) {
      const proj = projByKey.get(nameKey(a.name));
      if (proj !== undefined) {
        joined.push({ name: a.name, projected: proj, actual: a.own, delta: proj - a.own });
      }
    }

    const unmatchedActual = actuals.filter((a) => !projByKey.has(nameKey(a.name)));

    let metrics: { n: number; mae: number; bias: number; rmse: number; corr: number } | null = null;
    if (joined.length >= 2) {
      const n = joined.length;
      const absErr = joined.reduce((s, j) => s + Math.abs(j.delta), 0);
      const signErr = joined.reduce((s, j) => s + j.delta, 0);
      const sqErr = joined.reduce((s, j) => s + j.delta * j.delta, 0);
      const mp = joined.reduce((s, j) => s + j.projected, 0) / n;
      const ma = joined.reduce((s, j) => s + j.actual, 0) / n;
      let cov = 0, vp = 0, va = 0;
      for (const j of joined) {
        cov += (j.projected - mp) * (j.actual - ma);
        vp += (j.projected - mp) ** 2;
        va += (j.actual - ma) ** 2;
      }
      const corr = vp > 0 && va > 0 ? cov / Math.sqrt(vp * va) : 0;
      metrics = { n, mae: absErr / n, bias: signErr / n, rmse: Math.sqrt(sqErr / n), corr };
    }

    return { joined, unmatchedActual, metrics };
  }, [projection, actuals]);

  const sortedRows = useMemo(() => {
    const r = joined.slice();
    if (sort === "actual") r.sort((a, b) => b.actual - a.actual);
    else if (sort === "miss") r.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    else if (sort === "over") r.sort((a, b) => b.delta - a.delta);
    else r.sort((a, b) => a.delta - b.delta);
    return r;
  }, [joined, sort]);

  return (
    <div className="space-y-3">
      <div className="rounded-[14px] border border-line p-5 bg-surface-1 space-y-3">
        <div className="serif-italic" style={{ fontSize: 24, fontStyle: "normal" }}>
          <em>Projected vs actual.</em>
        </div>
        <div className="text-text-dim" style={{ fontSize: 13 }}>
          <span className="text-text">{DK_EVENT}</span> · {projection.length} golfers projected
        </div>
        <p className="text-text-dim" style={{ fontSize: 12 }}>
          Paste the actual ownership (the %Drafted column — copy straight out of
          the spreadsheet). We match each name to this week&apos;s projection and
          score the model. Everything runs in your browser.
        </p>
      </div>

      <div className="rounded-[14px] border border-line p-4 bg-surface-1 space-y-2">
        <div className="num font-semibold uppercase text-text-muted" style={{ fontSize: 10, letterSpacing: 1.1 }}>
          Paste actual %Drafted
        </div>
        <textarea
          value={actualText}
          onChange={(e) => setActualText(e.target.value)}
          rows={5}
          placeholder={"Si Woo Kim\t34.36%\nScottie Scheffler\t27.11%\nJordan Spieth\t26.94%\n…"}
          className="w-full rounded-[8px] border border-line bg-surface-2 px-3 py-2 text-text font-mono"
          style={{ fontSize: 12 }}
        />
        {actuals.length > 0 && (
          <div className="text-text-muted num uppercase" style={{ fontSize: 10, letterSpacing: 1 }}>
            Parsed {actuals.length} players · {joined.length} matched to projection
            {unmatchedActual.length > 0 ? ` · ${unmatchedActual.length} unmatched` : ""}
          </div>
        )}
      </div>

      {metrics && (
        <div className="rounded-[14px] border border-line p-5 bg-surface-1">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Metric
              label="Mean abs error"
              value={`${metrics.mae.toFixed(2)} pts`}
              tone={metrics.mae < 3 ? "good" : metrics.mae < 6 ? undefined : "bad"}
            />
            <Metric
              label="Bias (proj − actual)"
              value={`${metrics.bias >= 0 ? "+" : ""}${metrics.bias.toFixed(2)}`}
              tone={Math.abs(metrics.bias) < 1 ? "good" : undefined}
            />
            <Metric label="RMSE" value={`${metrics.rmse.toFixed(2)}`} />
            <Metric
              label="Correlation"
              value={metrics.corr.toFixed(3)}
              tone={metrics.corr > 0.8 ? "good" : metrics.corr > 0.5 ? undefined : "bad"}
            />
          </div>
          <div className="text-text-muted mt-3" style={{ fontSize: 11 }}>
            Scored on {metrics.n} matched players.{" "}
            {metrics.bias > 1
              ? "Model is running hot — projecting more ownership than the field actually drafted."
              : metrics.bias < -1
                ? "Model is running cold — the field was chalkier than projected."
                : "Bias is well-centered."}
          </div>
        </div>
      )}

      {joined.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <SortChip current={sort} value="actual" onPick={setSort}>Sort: Actual</SortChip>
            <SortChip current={sort} value="miss" onPick={setSort}>Biggest miss</SortChip>
            <SortChip current={sort} value="over" onPick={setSort}>Over-projected</SortChip>
            <SortChip current={sort} value="under" onPick={setSort}>Under-projected</SortChip>
          </div>
          <div className="rounded-[14px] border border-line overflow-hidden">
            <div
              className="grid gap-2 px-4 py-2.5 num font-semibold uppercase text-text-muted border-b border-line"
              style={{ gridTemplateColumns: "2fr 90px 90px 90px", fontSize: 10, letterSpacing: 1.1, background: "rgba(0,0,0,0.18)" }}
            >
              <span>Player</span>
              <span className="text-right">Projected</span>
              <span className="text-right">Actual</span>
              <span className="text-right">Δ</span>
            </div>
            {sortedRows.map((r) => (
              <div
                key={r.name}
                className="grid gap-2 px-4 py-3 border-b border-line/50 last:border-b-0"
                style={{ gridTemplateColumns: "2fr 90px 90px 90px", fontSize: 13 }}
              >
                <span className="text-text">{r.name}</span>
                <span className="num text-right" style={{ color: ownColor(r.projected) }}>{r.projected.toFixed(1)}%</span>
                <span className="num text-right" style={{ color: ownColor(r.actual) }}>{r.actual.toFixed(1)}%</span>
                <span className="num text-right font-semibold" style={{ color: deltaColor(r.delta) }}>
                  {r.delta >= 0 ? "+" : ""}{r.delta.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {unmatchedActual.length > 0 && (
        <div className="rounded-[14px] border border-line p-4 bg-surface-1">
          <div className="num font-semibold uppercase text-text-muted mb-1" style={{ fontSize: 10, letterSpacing: 1.1 }}>
            In your paste, no projection found ({unmatchedActual.length})
          </div>
          <div className="text-text-dim" style={{ fontSize: 12 }}>
            {unmatchedActual.map((a) => `${a.name} (${a.own}%)`).join(" · ")}
          </div>
          <div className="text-text-muted mt-2" style={{ fontSize: 11 }}>
            Usually players not in this week&apos;s DK salary file, or a name-spelling mismatch.
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "#7fd49a" : tone === "bad" ? "#e87c7c" : "#f0ebe0";
  return (
    <div>
      <div className="num font-semibold uppercase text-text-muted" style={{ fontSize: 10, letterSpacing: 1.2 }}>
        {label}
      </div>
      <div className="num mt-1" style={{ fontSize: 18, color }}>{value}</div>
    </div>
  );
}

function SortChip<T extends string>({
  current,
  value,
  onPick,
  children,
}: {
  current: T;
  value: T;
  onPick: (v: T) => void;
  children: React.ReactNode;
}) {
  const active = current === value;
  return (
    <button
      onClick={() => onPick(value)}
      className="num font-semibold uppercase transition"
      style={{
        padding: "5px 10px",
        borderRadius: 5,
        fontSize: 10.5,
        letterSpacing: 0.6,
        color: active ? "#f0ebe0" : "#a8b3ac",
        background: active ? "#1e4030" : "transparent",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {children}
    </button>
  );
}
