import { NextResponse } from "next/server";
import { SCHEDULE } from "@/lib/data/pga-schedule";
import { getCourseProfile, fetchEspnCourseHoles } from "@/lib/data/course-profiles";
import { buildGuide, slugifyCourse } from "@/lib/course-guides/build";
import { generateCourseProfile } from "@/lib/course-guides/profile-gen";
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

  // Prefer live ESPN holes when complete; needed by both the repo profile
  // path and the generated-profile fallback below.
  const espnHoles = await fetchEspnCourseHoles();

  // Hand-authored profile wins. When a venue isn't in the repo, have the
  // model build the structural profile (metadata + holes when ESPN lacks
  // them) so the guide still generates instead of the cron skipping.
  let profile = getCourseProfile(target.course);
  let profileSource: "repo" | "model" = "repo";
  let genHolesSource: "espn" | "model" | null = null;
  if (!profile) {
    const generated = await generateCourseProfile(target, espnHoles);
    if (!generated) {
      return NextResponse.json({
        ran_at: new Date().toISOString(),
        skipped: "no course profile and generation failed",
        event: target.name,
        course: target.course,
      });
    }
    profile = generated.profile;
    profileSource = "model";
    genHolesSource = generated.holesSource;
  }

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
    profileSource,
    holesSource: espnHoles ? "espn" : genHolesSource ?? "profile",
  });
}

export const POST = GET;
