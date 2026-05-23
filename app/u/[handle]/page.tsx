import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  settledTickets,
  summarize,
  breakdownBy,
  cumulativeSeries,
  type RawBetRow,
} from "@/lib/bets/performance";
import { clvSummary } from "@/lib/bets/clv";
import { BrandMark } from "@/components/edge/primitives";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public, read-only season track record for an opted-in handle. No PII —
// just the handle and aggregate settled performance. Served via the
// service role (RLS-bypassing) since it reads another user's rows.

async function loadProfile(handle: string) {
  const admin = supabaseAdmin();
  if (!admin) return null;
  const { data: profile } = await admin
    .from("profiles")
    .select("id, public_handle, public_profile")
    .eq("public_handle", handle.toLowerCase())
    .eq("public_profile", true)
    .maybeSingle();
  if (!profile) return null;

  const { data: bets } = await admin
    .from("bets")
    .select(
      "id, player, market, book, line, stake, to_win, status, american_odds, closing_odds, placed_at, resolved_at, created_at",
    )
    .eq("user_id", profile.id)
    .in("status", ["won", "lost", "void", "push"]);

  const rows = (bets ?? []) as (RawBetRow & {
    american_odds: number;
    closing_odds: number | null;
  })[];
  const tickets = settledTickets(rows);
  return {
    handle: profile.public_handle as string,
    tickets,
    summary: summarize(tickets),
    byBook: breakdownBy(tickets, "book"),
    series: cumulativeSeries(tickets),
    clv: clvSummary(rows),
  };
}

export async function generateMetadata({ params }: { params: { handle: string } }) {
  const p = await loadProfile(params.handle);
  if (!p) return { title: "Profile · Greenside" };
  const net = p.summary.netUnits;
  return {
    title: `@${p.handle} · ${net >= 0 ? "+" : ""}${net.toFixed(1)}u · Greenside`,
    description: `${p.handle}'s verified golf-betting record on Greenside: ${p.summary.count} settled, ${(p.summary.roi * 100).toFixed(0)}% ROI.`,
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: { handle: string };
}) {
  const p = await loadProfile(params.handle);
  if (!p) return notFound();
  const { summary: s } = p;
  const pos = s.netUnits >= 0;

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-line">
        <div className="max-w-3xl mx-auto px-5 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark size={24} />
            <span
              className="serif-italic"
              style={{ fontSize: 18, letterSpacing: -0.3, fontStyle: "normal", color: "#f0ebe0" }}
            >
              Greenside
            </span>
          </Link>
          <span className="num text-text-muted" style={{ fontSize: 11, letterSpacing: 0.5 }}>
            Verified record
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="serif-italic" style={{ fontSize: 32, letterSpacing: -0.4 }}>
            <em>@{p.handle}</em>
          </h1>
          {s.count === 0 ? (
            <p className="text-text-dim mt-2" style={{ fontSize: 14 }}>
              No settled bets yet.
            </p>
          ) : null}
        </div>

        {s.count > 0 && (
          <>
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Net units" value={`${pos ? "+" : ""}${s.netUnits.toFixed(2)}u`} tone={pos ? "pos" : "neg"} />
              <Stat label="ROI" value={`${s.roi > 0 ? "+" : ""}${(s.roi * 100).toFixed(0)}%`} tone={s.roi >= 0 ? "pos" : "neg"} />
              <Stat label="Record" value={`${s.wins}-${s.losses}`} />
              <Stat label="Win rate" value={`${(s.winRate * 100).toFixed(0)}%`} />
            </section>

            <Sparkline series={p.series} pos={pos} />

            {p.clv.graded > 0 && (
              <section className="grid grid-cols-2 gap-3">
                <Stat
                  label="Beat the close"
                  value={`${(p.clv.beatRate * 100).toFixed(0)}%`}
                  tone={p.clv.beatRate >= 0.5 ? "pos" : "neg"}
                />
                <Stat
                  label={`Avg CLV (${p.clv.graded} futures)`}
                  value={`${p.clv.avgClvPct >= 0 ? "+" : ""}${(p.clv.avgClvPct * 100).toFixed(1)}%`}
                  tone={p.clv.avgClvPct >= 0 ? "pos" : "neg"}
                />
              </section>
            )}

            <section>
              <div className="num font-semibold uppercase text-text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.4 }}>
                ● By book
              </div>
              <div className="space-y-1.5">
                {p.byBook.map((b) => (
                  <div key={b.key} className="flex items-center justify-between rounded-[10px] border border-line px-3 py-2 bg-surface-1">
                    <span className="num" style={{ fontSize: 12.5 }}>{b.key}</span>
                    <span className="num text-text-dim" style={{ fontSize: 11.5 }}>
                      {b.count} bets · {(b.roi * 100).toFixed(0)}% ROI
                    </span>
                    <span className="num font-semibold" style={{ fontSize: 12.5, color: b.net >= 0 ? "#7fd49a" : "#e57373" }}>
                      {b.net >= 0 ? "+" : ""}{b.net.toFixed(2)}u
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        <p className="text-text-muted" style={{ fontSize: 11, marginTop: 24 }}>
          Settled bets only. Track your own at{" "}
          <Link href="/" style={{ color: "#8ee68e" }}>greensideedge.com</Link>.
        </p>
      </main>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  const color = tone === "pos" ? "#7fd49a" : tone === "neg" ? "#e57373" : "#f0ebe0";
  return (
    <div className="rounded-[12px] border border-line p-3 bg-surface-1">
      <div className="num uppercase text-text-muted" style={{ fontSize: 9.5, letterSpacing: 1.2 }}>{label}</div>
      <div className="num font-semibold mt-1" style={{ fontSize: 20, color }}>{value}</div>
    </div>
  );
}

function Sparkline({ series, pos }: { series: number[]; pos: boolean }) {
  if (series.length < 2) return null;
  const w = 680;
  const h = 120;
  const min = Math.min(0, ...series);
  const max = Math.max(0, ...series);
  const range = max - min || 1;
  const pts = series
    .map((v, i) => {
      const x = (i / (series.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const zeroY = h - ((0 - min) / range) * h;
  const color = pos ? "#7fd49a" : "#e57373";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 120 }} preserveAspectRatio="none">
      <line x1="0" y1={zeroY} x2={w} y2={zeroY} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}
