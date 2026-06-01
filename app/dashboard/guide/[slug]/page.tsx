import { notFound } from "next/navigation";
import Link from "next/link";
import {
  type CourseGuide,
  type DriverTier,
  type HoleGuide,
  type BettingAngle,
} from "@/lib/course-guides";
import { getGuide } from "@/lib/course-guides/store";
import { getCourseHistoryForField, type FieldHistoryResult } from "@/lib/course-guides/field-history";
import type { CourseHistoryRow } from "@/lib/data/datagolf";

// DataGolf event_id for each guide. The historical-rounds endpoint
// requires this — substring-matching event_name doesn't work because
// tour+year alone 400s. IDs are verified against
// /historical-raw-data/event-list (see datagolf-debug route).
// Add a new guide's ID here when probing the event-list for that year.
function eventIdForGuide(g: CourseGuide): number | null {
  switch (g.slug) {
    case "muirfield-village":
      return 23; // the Memorial Tournament presented by Workday
    default:
      return null;
  }
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const g = await getGuide(params.slug);
  if (!g) return { title: "Course Guide · Greenside" };
  return {
    title: `${g.courseName} · ${g.tournament} · Greenside`,
    description: g.headline,
  };
}

export default async function CourseGuidePage({ params }: { params: { slug: string } }) {
  const guide = await getGuide(params.slug);
  if (!guide) return notFound();

  // Course history × current field. Best-effort: a missing DG key or a
  // bad upstream returns an empty result and the section renders an
  // honest empty state instead of breaking the page.
  const eventId = eventIdForGuide(guide);
  const history: FieldHistoryResult = eventId != null
    ? await getCourseHistoryForField(eventId, 12)
    : { rows: [], fieldSize: 0, source: "unavailable" };

  return (
    <div className="px-5 lg:px-8 py-6 space-y-6 max-w-5xl mx-auto">
      <Hero guide={guide} />
      <TLDR guide={guide} />
      <SkillStack guide={guide} />
      {eventId != null ? <FieldHistory tournament={guide.tournament} history={history} /> : null}
      <TierCards tiers={guide.tiers} />
      <HoleTable guide={guide} />
      <PenaltyOpportunity guide={guide} />
      <BettingAngles angles={guide.bettingAngles} />
      <Verdict guide={guide} />
      <CTA guide={guide} />
    </div>
  );
}

function FieldHistory({
  tournament,
  history,
}: {
  tournament: string;
  history: FieldHistoryResult;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface-1 p-5 lg:p-6">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h2 className="serif text-text" style={{ fontSize: 20, letterSpacing: -0.2 }}>
          Course history · your field
        </h2>
        <span
          className="num uppercase text-text-muted"
          style={{ fontSize: 10, letterSpacing: 1 }}
        >
          DataGolf · last 5 yrs
        </span>
      </div>
      <p className="text-text-dim mb-4" style={{ fontSize: 13, lineHeight: 1.5 }}>
        Players in this week&apos;s field ranked by average Strokes Gained: Total in their
        prior {tournament} starts. Repeat performers — not single-week heroics — surface to
        the top.
      </p>
      {history.rows.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: 13 }}>
              <thead>
                <tr className="text-left text-text-muted" style={{ fontSize: 10, letterSpacing: 1 }}>
                  <FhTh>#</FhTh>
                  <FhTh>Player</FhTh>
                  <FhTh align="right">Avg SG</FhTh>
                  <FhTh align="right">Rounds</FhTh>
                  <FhTh align="right">Best</FhTh>
                  <FhTh align="right" hideOnMobile>
                    Years
                  </FhTh>
                </tr>
              </thead>
              <tbody>
                {history.rows.map((row, i) => (
                  <FieldHistoryRow key={row.player_name} rank={i + 1} row={row} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-text-muted mt-3" style={{ fontSize: 11 }}>
            Aggregated from DataGolf historical rounds. Players with fewer than 4 rounds at the
            event are shown but ranked the same way — read low-sample lines accordingly.
          </p>
        </>
      ) : (
        <FieldHistoryEmpty source={history.source} fieldSize={history.fieldSize} />
      )}
    </section>
  );
}

// Honest empty state instead of silently hiding the section. Each branch
// tells the reader specifically why no rows came back so the box doesn't
// look broken when the cause is configuration or a slow first cache fill.
function FieldHistoryEmpty({
  source,
  fieldSize,
}: {
  source: FieldHistoryResult["source"];
  fieldSize: number;
}) {
  let line: string;
  if (source === "unavailable") {
    line =
      "DataGolf historical-rounds access isn't configured for this environment yet — once the API key is in place this list will populate automatically.";
  } else if (fieldSize === 0) {
    line =
      "Couldn't read this week's field from DataGolf. Refresh in a minute — the field-updates feed publishes pairings Tuesday afternoon.";
  } else {
    line =
      "No historical rounds matched the current field yet. The first load fetches 4 seasons of data and can take ~30-60 seconds — refresh to retry. If it stays empty, the event name in DataGolf may not match our filter; tell us and we'll fix the lookup.";
  }
  return (
    <div
      className="rounded-xl border border-line bg-bg p-4"
      style={{ fontSize: 13, color: "#9aa6a0", lineHeight: 1.5 }}
    >
      {line}
    </div>
  );
}

function FhTh({
  children,
  align,
  hideOnMobile,
}: {
  children: React.ReactNode;
  align?: "right";
  hideOnMobile?: boolean;
}) {
  return (
    <th
      className={[
        "py-2 pr-3 font-semibold uppercase",
        align === "right" ? "text-right" : "",
        hideOnMobile ? "hidden md:table-cell" : "",
      ].join(" ")}
    >
      {children}
    </th>
  );
}

function FieldHistoryRow({ rank, row }: { rank: number; row: CourseHistoryRow }) {
  const sg = row.avgSgTotal;
  const sgColor = sg >= 1.5 ? "#7fd49a" : sg >= 0.5 ? "#cdb47a" : "#e8efe9";
  return (
    <tr className="border-t border-line">
      <td className="py-2.5 pr-3 num text-text-muted" style={{ width: 32 }}>
        {rank}
      </td>
      <td className="py-2.5 pr-3 text-text" style={{ fontWeight: 600 }}>
        {row.player_name}
      </td>
      <td className="py-2.5 pr-3 num text-right" style={{ color: sgColor, fontWeight: 700 }}>
        {sg >= 0 ? "+" : ""}
        {sg.toFixed(2)}
      </td>
      <td className="py-2.5 pr-3 num text-right text-text-dim">{row.rounds}</td>
      <td className="py-2.5 pr-3 num text-right text-text-dim">
        {row.bestFinish ?? "—"}
      </td>
      <td className="py-2.5 pr-3 num text-right text-text-muted hidden md:table-cell">
        {row.years.length}
      </td>
    </tr>
  );
}

// ─── Hero ─────────────────────────────────────────────────────

function Hero({ guide }: { guide: CourseGuide }) {
  const heroBg = guide.heroImage
    ? `linear-gradient(180deg, rgba(10,31,20,0.35) 0%, rgba(10,31,20,0.92) 100%), url(${guide.heroImage}) center/cover`
    : `radial-gradient(ellipse at 30% 0%, rgba(127,212,154,0.18), transparent 60%), linear-gradient(160deg, #14110e 0%, #0a1f14 100%)`;
  return (
    <header
      className="relative rounded-[18px] overflow-hidden border border-line"
      style={{ background: heroBg, minHeight: 280 }}
    >
      <div className="p-6 lg:p-8 flex flex-col gap-3 lg:gap-4 min-h-[280px]">
        <div className="flex flex-wrap items-baseline gap-2">
          <span
            className="num font-semibold uppercase"
            style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
          >
            ● This week
          </span>
          <span
            className="num text-text-dim"
            style={{ fontSize: 10.5, letterSpacing: 1 }}
          >
            {guide.dates} · {guide.location}
          </span>
        </div>
        <h1
          className="serif-italic"
          style={{
            fontSize: "clamp(28px, 6vw, 44px)",
            letterSpacing: -0.5,
            lineHeight: 1.05,
            color: "#f0ebe0",
          }}
        >
          <em>{guide.tournament}</em>
        </h1>
        <div
          className="text-text-dim"
          style={{ fontSize: 14.5, letterSpacing: -0.1 }}
        >
          {guide.courseName} · Par {guide.par} · {guide.yards.toLocaleString()} yds · {guide.designer} ({guide.established})
        </div>
        <p
          className="serif-italic text-text mt-1 lg:mt-2 max-w-3xl"
          style={{
            fontSize: "clamp(16px, 2.4vw, 19px)",
            letterSpacing: -0.2,
            fontStyle: "italic",
            color: "#f0ebe0",
            lineHeight: 1.4,
          }}
        >
          &ldquo;{guide.headline}&rdquo;
        </p>
        <div className="flex-1" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mt-3">
          <HeroStat label="Course rating" value={guide.courseRating.toString()} />
          <HeroStat label="Slope" value={guide.slope.toString()} />
          <HeroStat label="Greens" value={guide.greens} />
          <HeroStat label="Water" value={`${guide.waterOnHoles} holes`} />
        </div>
      </div>
    </header>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-[10px] px-3 py-2 border border-line"
      style={{ background: "rgba(10,31,20,0.6)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="num font-semibold uppercase text-text-muted"
        style={{ fontSize: 9, letterSpacing: 1.1 }}
      >
        {label}
      </div>
      <div className="num text-text mt-0.5" style={{ fontSize: 14, fontWeight: 600 }}>
        {value}
      </div>
    </div>
  );
}

// ─── TL;DR card ────────────────────────────────────────────────

function TLDR({ guide }: { guide: CourseGuide }) {
  return (
    <section
      className="rounded-[14px] border-2 p-5 lg:p-6"
      style={{
        borderColor: "rgba(245,197,88,0.3)",
        background:
          "radial-gradient(ellipse at 0% 0%, rgba(245,197,88,0.08), transparent 60%), #14110e",
      }}
    >
      <div className="flex items-baseline gap-3 mb-2.5 flex-wrap">
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10.5, letterSpacing: 1.4, color: "#f5c558" }}
        >
          ● The quick read
        </span>
        <span
          className="num text-text-muted"
          style={{ fontSize: 10, letterSpacing: 0.6 }}
        >
          30-second briefing
        </span>
      </div>
      <p
        className="text-text"
        style={{ fontSize: 15.5, lineHeight: 1.6, letterSpacing: -0.05 }}
      >
        {guide.tldr}
      </p>
    </section>
  );
}

// ─── Skill stack ───────────────────────────────────────────────

function SkillStack({ guide }: { guide: CourseGuide }) {
  return (
    <section className="rounded-[14px] border border-line p-5 lg:p-6 bg-surface-1">
      <div
        className="num font-semibold uppercase text-text-muted mb-3"
        style={{ fontSize: 10, letterSpacing: 1.4 }}
      >
        ● What wins here
      </div>
      <ol className="space-y-2">
        {guide.skillStack.map((s, i) => (
          <li key={i} className="flex items-baseline gap-3">
            <span
              className="num font-semibold shrink-0"
              style={{
                fontSize: 11,
                color: i === 0 ? "#7fd49a" : "#a8b3ac",
                width: 22,
                height: 22,
                borderRadius: 99,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: i === 0 ? "rgba(127,212,154,0.13)" : "rgba(255,255,255,0.04)",
                border: i === 0 ? "1px solid rgba(127,212,154,0.3)" : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {i + 1}
            </span>
            <span
              className={i === 0 ? "text-text font-semibold" : "text-text-dim"}
              style={{ fontSize: 14.5 }}
            >
              {s}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ─── Driver tier cards ─────────────────────────────────────────

function TierCards({ tiers }: { tiers: DriverTier[] }) {
  return (
    <section>
      <div
        className="num font-semibold uppercase text-text-muted mb-3"
        style={{ fontSize: 10, letterSpacing: 1.4 }}
      >
        ● Driving distance tiers
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        {tiers.map((t) => (
          <TierCard key={t.id} tier={t} />
        ))}
      </div>
    </section>
  );
}

function TierCard({ tier }: { tier: DriverTier }) {
  const accent =
    tier.id === "elite"
      ? "#7fd49a"
      : tier.id === "mid"
        ? "#f5c558"
        : "#e87c7c";
  return (
    <article
      className="rounded-[14px] border-2 p-4 lg:p-5 flex flex-col gap-2.5"
      style={{
        borderColor: `${accent}55`,
        background: `linear-gradient(180deg, ${accent}0d 0%, rgba(0,0,0,0) 70%), #14110e`,
      }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 10.5, letterSpacing: 1.3, color: accent }}
        >
          {tier.label}
        </span>
        <span
          className="num text-text-muted"
          style={{ fontSize: 11, letterSpacing: 0.5 }}
        >
          {tier.range}
        </span>
      </div>
      <p className="text-text-dim" style={{ fontSize: 13, lineHeight: 1.5 }}>
        {tier.description}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {tier.examples.map((ex) => (
          <span
            key={ex}
            className="num"
            style={{
              fontSize: 10.5,
              padding: "3px 7px",
              borderRadius: 4,
              color: "#a8b3ac",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {ex}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-1 pt-2.5 border-t border-line">
        <Mini label="Avg approach" value={`${tier.avgApproachYds.toFixed(1)} yds`} />
        <Mini label="Per round" value={`${tier.totalApproachYds.toLocaleString()} yds`} />
      </div>
      <div
        className="num font-semibold mt-1"
        style={{ fontSize: 13, color: accent, letterSpacing: -0.1 }}
      >
        {tier.expectedScore}
      </div>
      <p
        className="text-text-dim mt-0.5"
        style={{ fontSize: 12, lineHeight: 1.45, fontStyle: "italic" }}
      >
        {tier.keyToSuccess}
      </p>
    </article>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span
        className="num uppercase text-text-muted"
        style={{ fontSize: 9, letterSpacing: 1 }}
      >
        {label}
      </span>
      <span className="num text-text" style={{ fontSize: 12.5 }}>
        {value}
      </span>
    </div>
  );
}

// ─── Hole table ────────────────────────────────────────────────

function HoleTable({ guide }: { guide: CourseGuide }) {
  return (
    <section className="rounded-[14px] border border-line overflow-hidden bg-surface-1">
      <div className="px-5 py-4 border-b border-line flex items-baseline justify-between gap-3 flex-wrap">
        <div
          className="num font-semibold uppercase"
          style={{ fontSize: 11, letterSpacing: 1.4, color: "#f0ebe0" }}
        >
          ● Hole-by-hole approach distances
        </div>
        <div
          className="num text-text-muted"
          style={{ fontSize: 10, letterSpacing: 0.5 }}
        >
          18 holes · 3 driver tiers · marked penalty / opportunity
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full" style={{ fontSize: 13 }}>
          <thead>
            <tr style={{ background: "rgba(0,0,0,0.18)" }}>
              <Th>Hole</Th>
              <Th>Par</Th>
              <Th>Yds</Th>
              <Th color="#7fd49a">Elite</Th>
              <Th color="#f5c558">Mid</Th>
              <Th color="#e87c7c">Bottom</Th>
              <Th>Notes</Th>
            </tr>
          </thead>
          <tbody>
            {guide.holes.map((h) => (
              <HoleRow key={h.hole} hole={h} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-line/40">
        {guide.holes.map((h) => (
          <MobileHoleCard key={h.hole} hole={h} />
        ))}
      </div>
    </section>
  );
}

function Th({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <th
      className="num font-semibold uppercase text-text-muted text-left px-3 py-2.5"
      style={{
        fontSize: 9.5,
        letterSpacing: 1.1,
        color: color ?? undefined,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {children}
    </th>
  );
}

function flagStyles(flag?: HoleGuide["flag"]): { bg: string; accent: string | null } {
  if (flag === "penalty") return { bg: "rgba(232,124,124,0.05)", accent: "#e87c7c" };
  if (flag === "opportunity") return { bg: "rgba(127,212,154,0.05)", accent: "#7fd49a" };
  return { bg: "transparent", accent: null };
}

function HoleRow({ hole }: { hole: HoleGuide }) {
  const { bg, accent } = flagStyles(hole.flag);
  return (
    <tr style={{ background: bg, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <td className="px-3 py-2.5 flex items-center gap-2">
        {accent && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 99,
              background: accent,
              display: "inline-block",
            }}
          />
        )}
        <span className="num font-semibold text-text">#{hole.hole}</span>
      </td>
      <td className="num text-text-dim px-3 py-2.5">{hole.par}</td>
      <td className="num text-text-dim px-3 py-2.5">{hole.yards}</td>
      <td className="num px-3 py-2.5">
        <ApproachCell yds={hole.approachYds.elite} club={hole.approachClubs.elite} />
      </td>
      <td className="num px-3 py-2.5">
        <ApproachCell yds={hole.approachYds.mid} club={hole.approachClubs.mid} />
      </td>
      <td className="num px-3 py-2.5">
        <ApproachCell yds={hole.approachYds.bottom} club={hole.approachClubs.bottom} />
      </td>
      <td className="px-3 py-2.5 text-text-dim" style={{ fontSize: 12, lineHeight: 1.4 }}>
        {hole.keyInsight ?? hole.strategy}
      </td>
    </tr>
  );
}

function ApproachCell({ yds, club }: { yds: number; club: string }) {
  return (
    <div className="flex flex-col">
      <span className="num text-text" style={{ fontSize: 13 }}>
        {yds}
      </span>
      <span
        className="num text-text-muted"
        style={{ fontSize: 10.5, letterSpacing: 0.3 }}
      >
        {club}
      </span>
    </div>
  );
}

function MobileHoleCard({ hole }: { hole: HoleGuide }) {
  const { bg, accent } = flagStyles(hole.flag);
  return (
    <div className="px-4 py-3 space-y-2" style={{ background: bg }}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          {accent && (
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 99,
                background: accent,
                display: "inline-block",
                position: "relative",
                top: -1,
              }}
            />
          )}
          <span className="num font-semibold text-text" style={{ fontSize: 15 }}>
            #{hole.hole}
          </span>
          <span className="num text-text-muted" style={{ fontSize: 11.5 }}>
            Par {hole.par} · {hole.yards}y
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <TierCell label="Elite" color="#7fd49a" yds={hole.approachYds.elite} club={hole.approachClubs.elite} />
        <TierCell label="Mid" color="#f5c558" yds={hole.approachYds.mid} club={hole.approachClubs.mid} />
        <TierCell label="Bottom" color="#e87c7c" yds={hole.approachYds.bottom} club={hole.approachClubs.bottom} />
      </div>
      <div className="text-text-dim" style={{ fontSize: 12.5, lineHeight: 1.45 }}>
        {hole.keyInsight ? <strong className="text-text">{hole.keyInsight}</strong> : null}
        {hole.keyInsight ? <> · </> : null}
        {hole.strategy}
      </div>
    </div>
  );
}

function TierCell({
  label,
  color,
  yds,
  club,
}: {
  label: string;
  color: string;
  yds: number;
  club: string;
}) {
  return (
    <div
      className="rounded-[8px] px-2.5 py-1.5"
      style={{
        background: `${color}0d`,
        border: `1px solid ${color}33`,
      }}
    >
      <div
        className="num uppercase"
        style={{ fontSize: 8.5, letterSpacing: 1, color }}
      >
        {label}
      </div>
      <div className="num text-text" style={{ fontSize: 13, fontWeight: 600 }}>
        {yds}
      </div>
      <div className="num text-text-muted" style={{ fontSize: 10 }}>
        {club}
      </div>
    </div>
  );
}

// ─── Penalty / opportunity callout ────────────────────────────

function PenaltyOpportunity({ guide }: { guide: CourseGuide }) {
  return (
    <section className="grid md:grid-cols-2 gap-3">
      <Callout
        title="Penalty holes"
        subtitle="Long par 4s — 200+ yard approaches for shorter hitters"
        holes={guide.penaltyHoles}
        guide={guide}
        accent="#e87c7c"
        bg="rgba(232,124,124,0.06)"
      />
      <Callout
        title="Opportunity holes"
        subtitle="Wedge approaches + par 5s — birdie targets across all tiers"
        holes={guide.opportunityHoles}
        guide={guide}
        accent="#7fd49a"
        bg="rgba(127,212,154,0.06)"
      />
    </section>
  );
}

function Callout({
  title,
  subtitle,
  holes,
  guide,
  accent,
  bg,
}: {
  title: string;
  subtitle: string;
  holes: number[];
  guide: CourseGuide;
  accent: string;
  bg: string;
}) {
  return (
    <div
      className="rounded-[14px] border p-4 lg:p-5"
      style={{ borderColor: `${accent}55`, background: bg }}
    >
      <div className="flex items-baseline gap-2 mb-1.5">
        <span style={{ color: accent, fontSize: 12 }}>●</span>
        <span
          className="num font-semibold uppercase"
          style={{ fontSize: 11, letterSpacing: 1.3, color: accent }}
        >
          {title}
        </span>
      </div>
      <p className="text-text-dim mb-3" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
        {subtitle}
      </p>
      <div className="flex flex-wrap gap-2">
        {holes.map((n) => {
          const h = guide.holes.find((x) => x.hole === n);
          if (!h) return null;
          return (
            <div
              key={n}
              className="rounded-[8px] px-3 py-2"
              style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div
                className="num font-semibold"
                style={{ fontSize: 13, color: accent }}
              >
                #{h.hole}
              </div>
              <div className="num text-text-muted" style={{ fontSize: 10 }}>
                Par {h.par} · {h.yards}y
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Betting angles ───────────────────────────────────────────

function BettingAngles({ angles }: { angles: BettingAngle[] }) {
  return (
    <section>
      <div
        className="num font-semibold uppercase text-text-muted mb-3"
        style={{ fontSize: 10, letterSpacing: 1.4 }}
      >
        ● Betting angles
      </div>
      <div className="space-y-2.5">
        {angles.map((a, i) => (
          <AngleCard key={i} angle={a} />
        ))}
      </div>
    </section>
  );
}

function AngleCard({ angle }: { angle: BettingAngle }) {
  const accent =
    angle.tone === "fit"
      ? "#7fd49a"
      : angle.tone === "fade"
        ? "#e87c7c"
        : angle.tone === "prop"
          ? "#f5c558"
          : "#a8b3ac";
  const toneLabel =
    angle.tone === "fit"
      ? "Fit"
      : angle.tone === "fade"
        ? "Fade"
        : angle.tone === "prop"
          ? "Prop"
          : "General";
  return (
    <article
      className="rounded-[12px] border p-4 lg:p-5"
      style={{ borderColor: `${accent}33`, background: `${accent}0a` }}
    >
      <div className="flex items-baseline gap-2.5 mb-1.5">
        <span
          className="num font-semibold uppercase"
          style={{
            fontSize: 9.5,
            letterSpacing: 0.9,
            color: accent,
            background: `${accent}1a`,
            border: `1px solid ${accent}33`,
            padding: "3px 8px",
            borderRadius: 4,
          }}
        >
          {toneLabel}
        </span>
        <h3
          className="serif-italic text-text"
          style={{ fontSize: 17, letterSpacing: -0.2, fontStyle: "normal" }}
        >
          {angle.title}
        </h3>
      </div>
      <p className="text-text-dim" style={{ fontSize: 13.5, lineHeight: 1.55 }}>
        {angle.body}
      </p>
    </article>
  );
}

// ─── Verdict + CTA ────────────────────────────────────────────

function Verdict({ guide }: { guide: CourseGuide }) {
  return (
    <section
      className="rounded-[14px] border border-line p-5 lg:p-6"
      style={{
        background:
          "radial-gradient(ellipse at 100% 0%, rgba(127,212,154,0.05), transparent 65%), #14110e",
      }}
    >
      <div
        className="num font-semibold uppercase mb-2"
        style={{ fontSize: 10.5, letterSpacing: 1.4, color: "#7fd49a" }}
      >
        ● Verdict
      </div>
      <p
        className="serif-italic text-text"
        style={{ fontSize: 17, lineHeight: 1.55, fontStyle: "italic", letterSpacing: -0.2 }}
      >
        {guide.verdict}
      </p>
    </section>
  );
}

function CTA({ guide }: { guide: CourseGuide }) {
  return (
    <section className="grid sm:grid-cols-2 gap-3">
      <Link
        href="/dashboard/upload"
        className="rounded-[14px] border-2 p-5 transition hover:bg-surface-2"
        style={{
          borderColor: "rgba(127,212,154,0.45)",
          background: "rgba(127,212,154,0.06)",
        }}
      >
        <div
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.4, color: "#7fd49a" }}
        >
          → Action
        </div>
        <div
          className="serif-italic text-text mt-1"
          style={{ fontSize: 22, letterSpacing: -0.3, fontStyle: "normal" }}
        >
          <em>Upload your {guide.tournament} slip</em>
        </div>
        <p className="text-text-dim mt-2" style={{ fontSize: 13, lineHeight: 1.5 }}>
          Drop a screenshot — we parse the legs, classify the markets, and
          start grading them live the moment the tournament tees off Thursday.
        </p>
      </Link>
      <Link
        href="/dashboard/parlay"
        className="rounded-[14px] border border-line p-5 hover:bg-surface-2 transition"
      >
        <div
          className="num font-semibold uppercase"
          style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
        >
          → Live tracker
        </div>
        <div
          className="serif-italic text-text mt-1"
          style={{ fontSize: 22, letterSpacing: -0.3, fontStyle: "normal" }}
        >
          <em>Watch the ticket move</em>
        </div>
        <p className="text-text-dim mt-2" style={{ fontSize: 13, lineHeight: 1.5 }}>
          Round-narrowed matchups, 3-ball standings, top-N cutoff, hole trails —
          all wired to the live ESPN scoreboard.
        </p>
      </Link>
    </section>
  );
}
