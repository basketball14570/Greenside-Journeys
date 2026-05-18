import { readFileSync } from "fs";
import { join } from "path";

export const metadata = {
  title: "Changelog · Greenside",
  description: "Every shipped feature, reverse-chronological.",
};

// Minimal markdown renderer — just headings + lists + bold + inline code.
// Avoids pulling in a full markdown library for a single page.
function renderMarkdown(md: string): JSX.Element[] {
  const lines = md.split("\n");
  const out: JSX.Element[] = [];
  let listBuf: JSX.Element[] = [];

  function flushList() {
    if (listBuf.length) {
      out.push(
        <ul
          key={`l-${out.length}`}
          className="space-y-1.5 ml-5 list-disc text-text-dim mb-4"
          style={{ fontSize: 14 }}
        >
          {listBuf}
        </ul>,
      );
      listBuf = [];
    }
  }

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (line.startsWith("# ")) {
      flushList();
      out.push(
        <h1
          key={i}
          className="serif-italic"
          style={{ fontSize: 36, letterSpacing: -0.4, marginBottom: 16 }}
        >
          <em>{line.slice(2)}</em>
        </h1>,
      );
    } else if (line.startsWith("## ")) {
      flushList();
      out.push(
        <h2
          key={i}
          className="font-medium mt-8 mb-3"
          style={{ fontSize: 20 }}
        >
          {line.slice(3)}
        </h2>,
      );
    } else if (line.startsWith("- ")) {
      listBuf.push(<li key={i}>{inline(line.slice(2))}</li>);
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      out.push(
        <p key={i} className="text-text-dim mb-3" style={{ fontSize: 14 }}>
          {inline(line)}
        </p>,
      );
    }
  });
  flushList();
  return out;
}

function inline(s: string): React.ReactNode {
  // Split on **bold**, `code`, and leave the rest as text.
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(s)) !== null) {
    if (m.index > last) parts.push(s.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={`b${key++}`} className="text-text">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      parts.push(
        <code
          key={`c${key++}`}
          style={{
            background: "rgba(255,255,255,0.06)",
            padding: "1px 6px",
            borderRadius: 4,
            fontSize: "0.92em",
          }}
        >
          {token.slice(1, -1)}
        </code>,
      );
    }
    last = m.index + token.length;
  }
  if (last < s.length) parts.push(s.slice(last));
  return parts;
}

export default function ChangelogPage() {
  let md = "# Greenside Changelog\n\n(no entries yet)";
  try {
    md = readFileSync(join(process.cwd(), "CHANGELOG.md"), "utf8");
  } catch {
    // CHANGELOG.md missing — keep the placeholder.
  }
  return (
    <article className="max-w-3xl mx-auto px-5 lg:px-8 py-12">
      {renderMarkdown(md)}
    </article>
  );
}
