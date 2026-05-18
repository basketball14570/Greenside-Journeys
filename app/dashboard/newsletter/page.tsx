import { buildDailyDigest, renderMarkdown } from "@/lib/newsletter";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Daily Newsletter · Greenside",
};

export default async function NewsletterPage() {
  const nl = await buildDailyDigest();
  const markdown = renderMarkdown(nl);

  return (
    <div className="px-5 lg:px-8 py-6 space-y-6 max-w-4xl mx-auto">
      <header>
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
        >
          ● Daily Bulletin
        </span>
        <h1
          className="serif-italic mt-1.5"
          style={{ fontSize: 36, letterSpacing: -0.4 }}
        >
          <em>{nl.title}</em>
        </h1>
        <p className="text-text-dim mt-2 max-w-2xl" style={{ fontSize: 14 }}>
          {nl.intro} Wire the JSON / markdown / HTML endpoint into Beehiiv,
          Substack, Mailgun, or a Discord webhook to send daily.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <a
          href="/api/newsletter/daily?format=markdown"
          target="_blank"
          rel="noreferrer"
          className="rounded-[10px] border border-line px-3 py-1.5 hover:bg-surface-2"
          style={{ fontSize: 12 }}
        >
          View markdown
        </a>
        <a
          href="/api/newsletter/daily?format=html"
          target="_blank"
          rel="noreferrer"
          className="rounded-[10px] border border-line px-3 py-1.5 hover:bg-surface-2"
          style={{ fontSize: 12 }}
        >
          View HTML
        </a>
        <a
          href="/api/newsletter/daily?format=json"
          target="_blank"
          rel="noreferrer"
          className="rounded-[10px] border border-line px-3 py-1.5 hover:bg-surface-2"
          style={{ fontSize: 12 }}
        >
          View JSON
        </a>
        <a
          href="/api/newsletter/daily?format=markdown"
          download={`greenside-${nl.date}.md`}
          className="rounded-[10px] border border-line px-3 py-1.5 hover:bg-surface-2"
          style={{ fontSize: 12 }}
        >
          Download .md
        </a>
      </div>

      <article className="rounded-[14px] border border-line p-6 bg-surface-1">
        {nl.sections.map((s, i) => (
          <section key={i} className={i > 0 ? "mt-8 pt-8 border-t border-line" : ""}>
            <h2 className="serif-italic" style={{ fontSize: 24, letterSpacing: -0.3 }}>
              <em>{s.tournament}</em>
            </h2>
            <div className="text-text-dim mt-1" style={{ fontSize: 13 }}>
              <strong className="text-text">{s.course}</strong> — <em>{s.headline}</em>
            </div>
            <p className="mt-3" style={{ fontSize: 14 }}>
              <strong>Conditions: </strong>
              <span className="text-text-dim">{s.weather}</span>
            </p>
            <div className="mt-4">
              <div
                className="num uppercase text-text-dim mb-2"
                style={{ fontSize: 10, letterSpacing: 1.4 }}
              >
                Top fits
              </div>
              <ul className="space-y-1.5">
                {s.topFits.map((f, j) => (
                  <li key={j} style={{ fontSize: 14 }}>
                    <strong>{f.player}</strong>
                    <span
                      className="num ml-2"
                      style={{
                        color: f.edge >= 0 ? "#7fd49a" : "#e87c7c",
                        fontSize: 12,
                      }}
                    >
                      {f.edge >= 0 ? "+" : ""}
                      {f.edge.toFixed(2)}u
                    </span>
                    <div className="text-text-dim mt-0.5" style={{ fontSize: 12 }}>
                      {f.rationale}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            {s.primaryAngle && (
              <div className="mt-4">
                <div
                  className="num uppercase text-text-dim mb-1"
                  style={{ fontSize: 10, letterSpacing: 1.4 }}
                >
                  Angle
                </div>
                <div style={{ fontSize: 14 }}>
                  <strong>{s.primaryAngle.title}</strong>
                  <div className="text-text-dim mt-1" style={{ fontSize: 13 }}>
                    {s.primaryAngle.body}
                  </div>
                </div>
              </div>
            )}
          </section>
        ))}
      </article>

      <details className="rounded-[14px] border border-line p-4 bg-surface-1">
        <summary className="cursor-pointer text-text-dim" style={{ fontSize: 12 }}>
          Raw markdown ({markdown.length} chars)
        </summary>
        <pre
          className="mt-3 whitespace-pre-wrap text-text"
          style={{ fontSize: 12, fontFamily: "ui-monospace, monospace" }}
        >
          {markdown}
        </pre>
      </details>
    </div>
  );
}
