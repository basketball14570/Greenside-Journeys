import { NextResponse } from "next/server";
import { SCHEDULE } from "@/lib/data/pga-schedule";
import { getCourseProfile, fetchEspnCourseHoles } from "@/lib/data/course-profiles";
import { buildGuide, slugifyCourse } from "@/lib/course-guides/build";
import { guideExists, upsertGuide } from "@/lib/course-guides/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Weekly course-guide generator. Runs Sunday evening (vercel.json), finds
// the next event teeing off within ~a week that doesn't already have a
// guide, computes the approach math, has Claude write the prose, and
// publishes to Supabase. Never overwrites a hand-authored guide.
//
// Auth: Bearer ${CRON_SECRET} when set (matches the other crons).
function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

const DAY = 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  // Candidates: events starting within the next 7 days (or that just
  // started ≤4d ago), soonest first.
  const candidates = SCHEDULE.filter((e) => {
    const start = Date.parse(`${e.startDate}T00:00:00Z`);
    return start >= now - 4 * DAY && start <= now + 7 * DAY;
  }).sort((a, b) => a.startDate.localeCompare(b.startDate));

  // First candidate without an existing guide.
  let target = null as (typeof SCHEDULE)[number] | null;
  for (const e of candidates) {
    if (!(await guideExists(slugifyCourse(e.course)))) {
      target = e;
      break;
    }
  }
  if (!target) {
    return NextResponse.json({ ran_at: new Date().toISOString(), skipped: "no eligible event" });
  }

  const profile = getCourseProfile(target.course);
  if (!profile) {
    // No structural profile — we can't fabricate course meta. Surface so a
    // venue can be added to lib/data/course-profiles.ts.
    return NextResponse.json({
      ran_at: new Date().toISOString(),
      skipped: "no course profile",
      event: target.name,
      course: target.course,
    });
  }

  // Prefer live ESPN holes when complete; otherwise the repo profile.
  const espnHoles = await fetchEspnCourseHoles();
  const holes = espnHoles ?? profile.holes;

  const guide = await buildGuide(target, profile, holes);
  if (!guide) {
    return NextResponse.json(
      { ran_at: new Date().toISOString(), error: "prose generation failed", event: target.name },
      { status: 502 },
    );
  }

  const ok = await upsertGuide(guide, target.id);
  return NextResponse.json({
    ran_at: new Date().toISOString(),
    published: ok,
    slug: guide.slug,
    event: target.name,
    holesSource: espnHoles ? "espn" : "profile",
  });
}

export const POST = GET;
