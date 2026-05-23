import Link from "next/link";
import { listGuides, currentGuide } from "@/lib/course-guides/store";

export const metadata = {
  title: "Course Guides · Greenside",
};

export const dynamic = "force-dynamic";

export default async function GuideIndex() {
  const [current, guideList] = await Promise.all([currentGuide(), listGuides()]);
  return (
    <div className="px-5 lg:px-8 py-6 space-y-6 max-w-5xl mx-auto">
      <header>
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
        >
          ● Course guides
        </span>
        <h1
          className="serif-italic mt-1.5"
          style={{ fontSize: "clamp(28px, 6vw, 38px)", letterSpacing: -0.4 }}
        >
          <em>This week, decoded.</em>
        </h1>
        <p className="text-text-dim mt-2 max-w-2xl" style={{ fontSize: 14, lineHeight: 1.5 }}>
          Long-form course breakdowns published Sunday evening, 4 days before
          tee-off. Hole-by-hole approach distances by driver tier, penalty /
          opportunity callouts, and betting angles you can act on.
        </p>
      </header>

      {current && (
        <section
          className="rounded-[18px] border-2 p-5 lg:p-6"
          style={{
            borderColor: "rgba(245,197,88,0.5)",
            background:
              "radial-gradient(ellipse at 30% 0%, rgba(245,197,88,0.1), transparent 60%), #14110e",
          }}
        >
          <div className="flex items-baseline gap-2 mb-2 flex-wrap">
            <span
              className="num font-semibold uppercase"
              style={{ fontSize: 10.5, letterSpacing: 1.4, color: "#f5c558" }}
            >
              ● This week
            </span>
            <span
              className="num text-text-muted"
              style={{ fontSize: 10.5, letterSpacing: 0.5 }}
            >
              {current.dates} · {current.location}
            </span>
          </div>
          <Link href={`/dashboard/guide/${current.slug}`} className="block">
            <h2
              className="serif-italic text-text"
              style={{ fontSize: 28, letterSpacing: -0.4, fontStyle: "normal" }}
            >
              <em>{current.tournament}</em>
            </h2>
            <div className="text-text-dim mt-1" style={{ fontSize: 14 }}>
              {current.courseName} · Par {current.par} · {current.yards.toLocaleString()} yds
            </div>
            <p
              className="serif-italic mt-3"
              style={{
                fontSize: 17,
                fontStyle: "italic",
                lineHeight: 1.45,
                color: "#f0ebe0",
                letterSpacing: -0.2,
              }}
            >
              &ldquo;{current.headline}&rdquo;
            </p>
            <div
              className="mt-4 num font-semibold uppercase"
              style={{ fontSize: 11, letterSpacing: 1.2, color: "#8ee68e" }}
            >
              Read the full guide →
            </div>
          </Link>
        </section>
      )}

      {guideList.length > 1 && (
        <section>
          <div
            className="num font-semibold uppercase text-text-muted mb-3"
            style={{ fontSize: 10, letterSpacing: 1.4 }}
          >
            ● Archive
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {guideList.filter((g) => g.slug !== current?.slug).map((g) => (
              <Link
                key={g.slug}
                href={`/dashboard/guide/${g.slug}`}
                className="rounded-[12px] border border-line p-4 bg-surface-1 hover:bg-surface-2 transition-colors block"
              >
                <div
                  className="num uppercase text-text-dim"
                  style={{ fontSize: 10, letterSpacing: 1.3 }}
                >
                  {g.dates}
                </div>
                <div
                  className="serif-italic mt-1.5"
                  style={{ fontSize: 18, letterSpacing: -0.2, fontStyle: "normal" }}
                >
                  <em>{g.tournament}</em>
                </div>
                <div className="text-text-dim mt-1" style={{ fontSize: 12.5 }}>
                  {g.courseName} · {g.location}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
