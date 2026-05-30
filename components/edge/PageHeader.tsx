"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Editorial page masthead — the "designed by a person" header that replaces
// the plain kicker + serif-h1 every page shared. A colored category tag, a
// big brand-serif headline, an optional course photo wash, and an accent
// underline rule give each page a confident, sports-media identity.

type Accent = "green" | "gold";

const ACCENT: Record<Accent, string> = {
  green: "#7fd49a",
  gold: "#f5c558",
};

export function PageHeader({
  kicker,
  title,
  subtitle,
  right,
  accent = "gold",
  live = false,
  imageSlug,
}: {
  kicker: string;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  accent?: Accent;
  live?: boolean;
  // Optional course slug — renders that course photo faintly behind the
  // masthead (public/courses/<slug>.{jpg,png,…}). Falls back to no image.
  imageSlug?: string | null;
}) {
  const c = ACCENT[accent];
  const img = useCoursePhoto(imageSlug ?? null);
  // Condense the masthead into a sticky title bar once it scrolls out of
  // view so the user keeps page context as they go down a long list.
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [condensed, setCondensed] = useState(false);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setCondensed(!entry.isIntersecting),
      { rootMargin: "-60px 0px 0px 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const titleText = typeof title === "string" ? title : kicker;

  return (
    <>
      {condensed && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Scroll to top"
          className="fixed left-0 right-0 z-20 flex items-center gap-2 px-4 lg:px-8 py-2 border-b border-line lg:hidden"
          style={{
            top: 58, // sit just below the sticky tab nav
            background: "linear-gradient(180deg, rgba(10,19,14,0.95), rgba(10,19,14,0.82))",
            backdropFilter: "blur(8px)",
          }}
        >
          <span
            className={`inline-block rounded-full ${live ? "gs-status-pulse" : ""}`}
            style={{ width: 5, height: 5, background: c }}
          />
          <span
            className="num font-bold uppercase truncate"
            style={{ fontSize: 11, letterSpacing: 0.9, color: "#cfead4" }}
          >
            {kicker}
          </span>
          <span
            className="serif-italic truncate text-text-dim"
            style={{ fontSize: 13, fontStyle: "normal" }}
          >
            · {titleText}
          </span>
          <span className="num ml-auto" style={{ fontSize: 11, color: "#7e8a83" }}>
            ↑ Top
          </span>
        </button>
      )}
      <div ref={sentinelRef} aria-hidden style={{ height: 1 }} />
    <header className="relative overflow-hidden rounded-[16px] mb-6">
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: "center 55%", opacity: 0.5 }}
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background: img
            ? "linear-gradient(100deg, rgba(7,18,11,0.96) 0%, rgba(7,18,11,0.82) 48%, rgba(7,18,11,0.5) 100%)"
            : "linear-gradient(120deg, rgba(127,212,154,0.06), rgba(0,0,0,0) 55%)",
        }}
      />
      <div className="relative flex items-end justify-between gap-4 flex-wrap px-1 py-1">
        <div className="min-w-0">
          {/* Category tag */}
          <span
            className="num font-bold uppercase inline-flex items-center gap-1.5"
            style={{
              fontSize: 10,
              letterSpacing: 1.3,
              color: c,
              background: `${c}1c`,
              border: `1px solid ${c}40`,
              padding: "3px 9px",
              borderRadius: 5,
            }}
          >
            <span
              className={`inline-block rounded-full ${live ? "gs-status-pulse" : ""}`}
              style={{ width: 6, height: 6, background: c, boxShadow: live ? `0 0 6px ${c}` : "none" }}
            />
            {kicker}
          </span>
          <h1
            className="serif-italic mt-2.5"
            style={{
              fontSize: "clamp(30px, 5vw, 44px)",
              lineHeight: 1.02,
              letterSpacing: -0.6,
              fontStyle: "normal",
              color: "#f4efe4",
            }}
          >
            <em>{title}</em>
          </h1>
          {subtitle && (
            <p className="text-text-dim mt-2 max-w-2xl" style={{ fontSize: 14, lineHeight: 1.45 }}>
              {subtitle}
            </p>
          )}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
      {/* Accent underline rule — bright segment on the left fading to a hairline */}
      <div className="relative mt-4" style={{ height: 2 }}>
        <div className="absolute inset-0" style={{ background: "rgba(255,255,255,0.07)" }} />
        <div
          className="absolute left-0 top-0 h-full"
          style={{ width: 72, background: `linear-gradient(90deg, ${c}, ${c}00)` }}
        />
      </div>
    </header>
    </>
  );
}

// In-page module header — accent rail + serif title, with an optional right
// slot. The card-level counterpart to the page masthead, so every section
// reads with the same editorial identity instead of a plain label.
export function SectionHeader({
  title,
  right,
  accent = "green",
}: {
  title: ReactNode;
  right?: ReactNode;
  accent?: Accent;
}) {
  const c = ACCENT[accent];
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <span className="flex items-center gap-2.5 min-w-0">
        <span className="inline-block rounded-full shrink-0" style={{ width: 3, height: 18, background: c }} />
        <span
          className="serif-italic text-text truncate"
          style={{ fontSize: 18, letterSpacing: -0.2, fontStyle: "normal" }}
        >
          {title}
        </span>
      </span>
      {right && <span className="shrink-0">{right}</span>}
    </div>
  );
}

// Resolve a course photo by slug, walking the same extensions the event
// strap does. Returns the working URL or null.
function useCoursePhoto(slug: string | null): string | null {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!slug) {
      setSrc(null);
      return;
    }
    let cancelled = false;
    const exts = ["jpg", "png", "jpeg", "webp"];
    (async () => {
      for (const ext of exts) {
        const url = `/courses/${slug}.${ext}`;
        const ok = await new Promise<boolean>((resolve) => {
          const im = new Image();
          im.onload = () => resolve(true);
          im.onerror = () => resolve(false);
          im.src = url;
        });
        if (cancelled) return;
        if (ok) {
          setSrc(url);
          return;
        }
      }
      if (!cancelled) setSrc(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);
  return src;
}
