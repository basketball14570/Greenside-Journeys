import Link from "next/link";
import { notFound } from "next/navigation";
import { buildPreview, listPreviewable } from "@/lib/preview";
import PreviewShareActions from "@/components/edge/PreviewShareActions";

export async function generateStaticParams() {
  return listPreviewable().map((p) => ({ slug: p.slug }));
}

export default function PreviewDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const preview = buildPreview(params.slug);
  if (!preview) notFound();

  return (
    <div className="px-5 lg:px-8 py-6 space-y-6 max-w-4xl mx-auto print:max-w-none print:px-0">
      <div className="print:hidden flex items-baseline gap-3 text-text-dim" style={{ fontSize: 12 }}>
        <Link href="/dashboard/preview" className="hover:text-text">
          ← All previews
        </Link>
        <span>·</span>
        <Link href={`/courses/${preview.slug}`} className="hover:text-text">
          Full course profile
        </Link>
      </div>

      <header>
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
        >
          ● {preview.snapshot.round} · {preview.course.archetype}
        </span>
        <h1
          className="serif-italic mt-1.5"
          style={{ fontSize: 36, letterSpacing: -0.4 }}
        >
          <em>{preview.tournament}</em>
        </h1>
        <div className="text-text-dim mt-1.5" style={{ fontSize: 14 }}>
          {preview.snapshot.name} · {preview.snapshot.location} ·{" "}
          {preview.course.yards.toLocaleString()} yards, par {preview.course.par}
        </div>
        <p className="mt-4 max-w-2xl" style={{ fontSize: 18, fontStyle: "italic" }}>
          {preview.headline}
        </p>
      </header>

      <section className="rounded-[14px] border border-line p-5 bg-surface-1">
        <div
          className="num uppercase text-text-dim mb-2"
          style={{ fontSize: 10, letterSpacing: 1.4 }}
        >
          ● Conditions
        </div>
        <div style={{ fontSize: 15 }}>{preview.weather}</div>
      </section>

      <section>
        <h2 className="font-medium mb-3" style={{ fontSize: 18 }}>
          Top fits
        </h2>
        <div className="rounded-[14px] border border-line overflow-hidden">
          {preview.fitPlayers.map((f, i) => (
            <Link
              key={f.player.slug}
              href={`/players/${f.player.slug}`}
              className="flex items-baseline gap-4 px-4 py-3 border-b border-line/50 last:border-b-0 hover:bg-surface-1 transition-colors"
            >
              <div
                className="num text-text-dim"
                style={{ fontSize: 12, width: 18 }}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium" style={{ fontSize: 14 }}>
                  {f.player.countryFlag} {f.player.name}
                </div>
                <div className="text-text-dim mt-0.5" style={{ fontSize: 12 }}>
                  {f.rationale}
                </div>
              </div>
              <div
                className="num text-right"
                style={{
                  fontSize: 14,
                  color: f.windAdjusted > 0 ? "#7fd49a" : "#e87c7c",
                  minWidth: 64,
                }}
              >
                {f.windAdjusted >= 0 ? "+" : ""}
                {f.windAdjusted.toFixed(2)}u
              </div>
            </Link>
          ))}
        </div>
        <div className="text-text-dim mt-2" style={{ fontSize: 11 }}>
          Score = archetype sg/round × 4 rounds − expected wind-drag penalty
          from this week&apos;s forecast.
        </div>
      </section>

      <section>
        <h2 className="font-medium mb-3" style={{ fontSize: 18 }}>
          Betting angles
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {preview.angles.map((a, i) => (
            <div
              key={i}
              className="rounded-[14px] border border-line p-4 bg-surface-1"
            >
              <div
                className="num uppercase mb-1"
                style={{
                  fontSize: 10,
                  letterSpacing: 1.4,
                  color:
                    a.kind === "wind"
                      ? "#f5c558"
                      : a.kind === "wave"
                        ? "#7cc0e8"
                        : a.kind === "history"
                          ? "#a8b3ac"
                          : "#8ee68e",
                }}
              >
                ● {a.kind}
              </div>
              <div className="font-medium" style={{ fontSize: 14 }}>
                {a.title}
              </div>
              <div className="text-text-dim mt-1" style={{ fontSize: 13 }}>
                {a.body}
              </div>
            </div>
          ))}
        </div>
      </section>

      {preview.hedgeCandidates.length > 0 && (
        <section>
          <h2 className="font-medium mb-3" style={{ fontSize: 18 }}>
            Open positions to watch
          </h2>
          <div className="rounded-[14px] border border-line overflow-hidden">
            {preview.hedgeCandidates.map((h, i) => (
              <div
                key={i}
                className="px-4 py-3 border-b border-line/50 last:border-b-0"
              >
                <div className="font-medium" style={{ fontSize: 14 }}>
                  {h.player}
                </div>
                <div className="text-text-dim mt-0.5" style={{ fontSize: 12 }}>
                  {h.rationale}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-medium mb-3" style={{ fontSize: 18 }}>
          Fade list
        </h2>
        <div className="rounded-[14px] border border-line overflow-hidden">
          {preview.fades.map((f) => (
            <div
              key={f.player.slug}
              className="flex items-baseline gap-4 px-4 py-3 border-b border-line/50 last:border-b-0"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium" style={{ fontSize: 14 }}>
                  {f.player.countryFlag} {f.player.name}
                </div>
                <div className="text-text-dim mt-0.5" style={{ fontSize: 12 }}>
                  {f.rationale}
                </div>
              </div>
              <div
                className="num text-right"
                style={{ fontSize: 14, color: "#e87c7c", minWidth: 64 }}
              >
                {f.windAdjusted.toFixed(2)}u
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-medium mb-3" style={{ fontSize: 18 }}>
          History &amp; design
        </h2>
        <ul className="space-y-2 text-text-dim" style={{ fontSize: 13 }}>
          {preview.historyNotes.map((n, i) => (
            <li key={i} className="flex gap-2">
              <span style={{ color: "#8ee68e" }}>•</span>
              <span>{n}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="print:hidden pt-4 border-t border-line space-y-2">
        <PreviewShareActions slug={preview.slug} />
        <div className="text-text-dim" style={{ fontSize: 11 }}>
          Cmd/Ctrl-P prints a clean one-page version. JSON endpoint is{" "}
          <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: 4 }}>
            GET /api/preview/{preview.slug}
          </code>{" "}
          with a 5-minute edge cache — safe to syndicate.
        </div>
      </div>
    </div>
  );
}
