"use client";

import { useEffect, useMemo, useState } from "react";

// "Add to Greenside slip" bookmarklet generator. The bookmarklet, when
// clicked on any sportsbook tab, grabs the current selection (or the
// page title as a fallback), pipes it through the slip parser via the
// /api/slip/import endpoint, and pops the result into a new tab with
// the slip page pre-loaded.

const BOOKMARKLET_SRC = (origin: string) => `
javascript:(function(){
  var s=(window.getSelection&&window.getSelection().toString())||document.title||'';
  if(!s.trim()){alert('Greenside: select the bet details first.');return;}
  var u='${origin}/dashboard/slip#import='+encodeURIComponent(s);
  window.open(u,'_blank');
})();
`.replace(/\s+/g, " ").trim();

export default function BookmarkletPage() {
  const [origin, setOrigin] = useState("https://greenside-journeys.vercel.app");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const href = useMemo(() => BOOKMARKLET_SRC(origin), [origin]);

  return (
    <article className="max-w-3xl mx-auto px-5 lg:px-8 py-12 space-y-6">
      <header>
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
        >
          ● Bookmarklet
        </span>
        <h1
          className="serif-italic mt-1.5"
          style={{ fontSize: 36, letterSpacing: -0.4 }}
        >
          <em>One click from any sportsbook.</em>
        </h1>
        <p className="text-text-dim mt-2 max-w-2xl" style={{ fontSize: 14 }}>
          Drag the green button below to your browser&apos;s bookmarks bar.
          On any sportsbook tab, select the bet text (player + market +
          odds), click the bookmark, and Greenside pops open with the leg
          parsed and ready to confirm.
        </p>
      </header>

      <section className="rounded-[14px] border border-line p-6 bg-surface-1 text-center">
        <p className="text-text-dim mb-4" style={{ fontSize: 13 }}>
          ↓ Drag this to your bookmarks bar ↓
        </p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href={href}
          onClick={(e) => e.preventDefault()}
          className="inline-block rounded-[10px] px-5 py-2.5"
          style={{ background: "#8ee68e", color: "#0a1f14", fontSize: 14, fontWeight: 700 }}
        >
          + Add to Greenside
        </a>
        <p className="text-text-dim mt-4" style={{ fontSize: 11 }}>
          Pinned to <code>{origin}</code>
        </p>
      </section>

      <section className="rounded-[14px] border border-line p-5 bg-surface-1">
        <h2 className="font-medium mb-2" style={{ fontSize: 16 }}>
          Or copy the source
        </h2>
        <p className="text-text-dim mb-3" style={{ fontSize: 12 }}>
          If your browser strips javascript: URLs from drag-and-drop
          (Firefox sometimes does), create a new bookmark manually and
          paste this into the URL field:
        </p>
        <pre
          className="rounded-[8px] border border-line bg-bg p-3 whitespace-pre-wrap break-all text-text"
          style={{ fontSize: 11, fontFamily: "ui-monospace, monospace" }}
        >
          {href}
        </pre>
      </section>

      <section className="rounded-[14px] border border-line p-5 bg-surface-1 text-text-dim space-y-2" style={{ fontSize: 13 }}>
        <h2 className="font-medium text-text" style={{ fontSize: 16 }}>
          How it works
        </h2>
        <ol className="space-y-1.5 ml-5 list-decimal">
          <li>
            On a sportsbook page, highlight the bet you want — player, market,
            line, odds.
          </li>
          <li>
            Click <strong>+ Add to Greenside</strong> in your bookmarks bar.
          </li>
          <li>
            A new tab opens at <code>/dashboard/slip</code> with the selection
            in the paste box. Hit <strong>Parse and add</strong> — the
            permissive parser handles top-N, matchups, over/unders, and
            make-cut formats from DK, FD, PrizePicks, and Underdog.
          </li>
          <li>
            The leg lives in your local slip; the leaderboard decorates the
            matching player rows live.
          </li>
        </ol>
      </section>
    </article>
  );
}
