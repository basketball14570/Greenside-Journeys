// Web Share Target landing — installed PWAs receive shared text from the
// OS share sheet here. The manifest declares this URL as the receiver;
// Android (Chrome / Edge / Samsung) and iOS 16.4+ (Safari) route shares
// in. We pre-fill the parser with what arrived and let the user confirm.

import Link from "next/link";

export const metadata = {
  title: "Share a bet · Greenside",
};

type SharePayload = {
  title?: string;
  text?: string;
  url?: string;
};

export default function ShareReceiverPage({
  searchParams,
}: {
  searchParams: SharePayload;
}) {
  const shared = [searchParams.title, searchParams.text, searchParams.url]
    .filter(Boolean)
    .join("\n")
    .trim();

  const hasContent = shared.length > 0;

  return (
    <div className="px-5 lg:px-8 py-6 space-y-5 max-w-3xl mx-auto">
      <header>
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
        >
          ● Share intake
        </span>
        <h1
          className="serif-italic mt-1.5"
          style={{ fontSize: 32, letterSpacing: -0.4 }}
        >
          <em>Got it — let&apos;s parse this.</em>
        </h1>
        <p className="text-text-dim mt-2 max-w-2xl" style={{ fontSize: 14 }}>
          You shared from another app. We&apos;ll run the text through the
          same parser that handles email forwards.
        </p>
      </header>

      {hasContent ? (
        <section className="rounded-[14px] border border-line p-5 bg-surface-1">
          <div
            className="num uppercase text-text-dim mb-2"
            style={{ fontSize: 10, letterSpacing: 1.4 }}
          >
            ● Shared content
          </div>
          <pre
            className="whitespace-pre-wrap text-text"
            style={{ fontSize: 13, fontFamily: "inherit" }}
          >
            {shared}
          </pre>
          <form
            method="post"
            action="/api/bets/parse"
            className="mt-5 flex flex-wrap gap-3"
          >
            <input type="hidden" name="raw" value={shared} />
            <button
              type="submit"
              className="rounded-[10px] px-4 py-2 font-medium"
              style={{ fontSize: 13, background: "#8ee68e", color: "#0a1f14" }}
            >
              Parse and stage
            </button>
            <Link
              href="/dashboard/upload"
              className="rounded-[10px] border border-line px-4 py-2 text-text-dim hover:text-text"
              style={{ fontSize: 13 }}
            >
              Pick a different method
            </Link>
          </form>
        </section>
      ) : (
        <section className="rounded-[14px] border border-line p-6 bg-surface-1 text-center">
          <div className="text-text-dim mb-3" style={{ fontSize: 14 }}>
            No share payload found.
          </div>
          <Link
            href="/dashboard/upload"
            className="inline-block rounded-[10px] border border-line px-4 py-2 text-text hover:bg-surface-2"
            style={{ fontSize: 13 }}
          >
            Go to upload page
          </Link>
        </section>
      )}

      <section
        className="rounded-[14px] p-5 border border-line"
        style={{ background: "rgba(124,192,232,0.05)" }}
      >
        <div className="flex items-baseline gap-2 mb-2">
          <span style={{ fontSize: 14, color: "#7cc0e8" }}>ℹ</span>
          <h3 className="font-medium" style={{ fontSize: 14 }}>
            How to share to Greenside
          </h3>
        </div>
        <ul
          className="text-text-dim space-y-1.5 ml-5 list-disc"
          style={{ fontSize: 13 }}
        >
          <li>
            Install Greenside as an app from your browser (Add to Home Screen on
            iOS, Install app on Android Chrome).
          </li>
          <li>
            From DraftKings, FanDuel, PrizePicks, or your screenshot album, tap
            <em> Share</em> → pick <em>Greenside</em>.
          </li>
          <li>
            The shared text lands here and feeds the same parser that handles
            email forwarding — no copy-paste.
          </li>
        </ul>
      </section>
    </div>
  );
}
