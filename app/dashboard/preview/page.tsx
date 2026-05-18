import Link from "next/link";
import { listPreviewable } from "@/lib/preview";

export const metadata = {
  title: "Tournament Previews · Greenside",
};

export default function PreviewIndexPage() {
  const items = listPreviewable();
  return (
    <div className="px-5 lg:px-8 py-6 space-y-6 max-w-5xl mx-auto">
      <header>
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
        >
          ● Previews
        </span>
        <h1
          className="serif-italic mt-1.5"
          style={{ fontSize: 36, letterSpacing: -0.4 }}
        >
          <em>This week, decoded.</em>
        </h1>
        <p className="text-text-dim mt-2 max-w-2xl" style={{ fontSize: 14 }}>
          One-screen previews that join the course profile, the live
          conditions snapshot, and your player pool. Print one Tuesday night
          and bet from it Wednesday.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        {items.map((it) => (
          <Link
            key={it.slug}
            href={`/dashboard/preview/${it.slug}`}
            className="rounded-[14px] border border-line p-5 bg-surface-1 hover:bg-surface-2 transition-colors block"
          >
            <div
              className="num uppercase text-text-dim"
              style={{ fontSize: 10, letterSpacing: 1.4 }}
            >
              {it.round} · {it.status}
            </div>
            <div
              className="serif-italic mt-1.5"
              style={{ fontSize: 22, letterSpacing: -0.3 }}
            >
              <em>{it.tournament}</em>
            </div>
            <div className="text-text-dim mt-1.5" style={{ fontSize: 13 }}>
              {it.course} · {it.location}
            </div>
            <div className="mt-3" style={{ fontSize: 12, color: "#8ee68e" }}>
              Read the preview →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
