import Link from "next/link";
import { currentWeekGuide } from "@/lib/course-guides";

// Surface the current week's course guide on the Today dashboard.
// Lives near the top because it's the highest-leverage briefing the
// user reads all week. Renders nothing when there's no current guide
// to avoid a half-baked card.
export function CourseGuideCard() {
  const guide = currentWeekGuide();
  if (!guide) return null;

  const now = Date.now();
  const teeoff = new Date(guide.tournamentStartsAt).getTime();
  const daysUntil = Math.ceil((teeoff - now) / (24 * 60 * 60 * 1000));
  const cadenceLabel =
    daysUntil <= 0
      ? "● Live this week"
      : daysUntil === 1
        ? "● Tees off tomorrow"
        : `● Tees off in ${daysUntil} days`;

  return (
    <Link
      href={`/dashboard/guide/${guide.slug}`}
      className="block rounded-[14px] border-2 mx-5 lg:mx-0 my-4 p-4 lg:p-5 transition hover:bg-surface-2/40"
      style={{
        borderColor: "rgba(245,197,88,0.4)",
        background:
          "radial-gradient(ellipse at 30% 0%, rgba(245,197,88,0.1), transparent 60%), #14110e",
      }}
    >
      <div className="flex items-baseline gap-2 flex-wrap">
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.3, color: "#f5c558" }}
        >
          {cadenceLabel}
        </span>
        <span
          className="num text-text-muted"
          style={{ fontSize: 10, letterSpacing: 0.5 }}
        >
          {guide.dates} · {guide.location}
        </span>
      </div>
      <div
        className="serif-italic mt-1.5"
        style={{
          fontSize: "clamp(20px, 4.5vw, 24px)",
          letterSpacing: -0.3,
          fontStyle: "normal",
          color: "#f0ebe0",
        }}
      >
        <em>{guide.tournament}</em>
      </div>
      <div className="text-text-dim mt-1" style={{ fontSize: 12.5 }}>
        {guide.courseName} · Par {guide.par} · {guide.yards.toLocaleString()} yds
      </div>
      <p
        className="serif-italic mt-2.5 max-w-2xl"
        style={{
          fontSize: 14,
          fontStyle: "italic",
          lineHeight: 1.45,
          color: "#f0ebe0",
          letterSpacing: -0.1,
        }}
      >
        &ldquo;{guide.headline}&rdquo;
      </p>
      <div
        className="mt-3 num font-semibold uppercase"
        style={{ fontSize: 10.5, letterSpacing: 1.2, color: "#8ee68e" }}
      >
        Read the full guide →
      </div>
    </Link>
  );
}
