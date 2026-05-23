import { NextResponse } from "next/server";
import { listPreviewable, buildPreviewAsync } from "@/lib/preview";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { pushToAllUsers, pushEnabled } from "@/lib/notify/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Wind-revision alerts. Each run compares every active event's live average
// wind against the last-alerted baseline (forecast_baselines). When the
// forecast drifts past THRESHOLD_MPH we push subscribers and re-baseline,
// so small drifts accumulate until they matter and each material move
// alerts once. First sighting of a course just seeds the baseline silently.

const THRESHOLD_MPH = 4;

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!pushEnabled()) return NextResponse.json({ skipped: "push not configured" });
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ skipped: "supabase admin not configured" });

  const now = new Date().toISOString();
  const alerts: string[] = [];

  for (const item of listPreviewable()) {
    const preview = await buildPreviewAsync(item.slug).catch(() => null);
    const fc = preview?.forecast;
    if (!fc) continue;
    const key = fc.courseId;
    const newAvg = fc.next24.windMphAvg;

    const { data: base } = await admin
      .from("forecast_baselines")
      .select("wind_avg")
      .eq("course_slug", key)
      .maybeSingle();

    if (!base) {
      await admin
        .from("forecast_baselines")
        .upsert({ course_slug: key, wind_avg: newAvg, captured_at: now }, { onConflict: "course_slug" });
      continue;
    }

    const delta = newAvg - Number(base.wind_avg);
    if (Math.abs(delta) < THRESHOLD_MPH) continue;

    const dir = delta > 0 ? "up" : "down";
    const body = `${preview!.tournament}: average wind revised ${dir} ${Math.abs(delta).toFixed(0)} mph — now ${newAvg.toFixed(0)} mph, gusts to ${fc.next24.gustMphMax.toFixed(0)}.`;
    await pushToAllUsers({
      title: "🌬️ Wind forecast update",
      body,
      url: "/dashboard/weather",
      tag: `wind-${key}`,
    });
    await admin
      .from("forecast_baselines")
      .upsert({ course_slug: key, wind_avg: newAvg, captured_at: now }, { onConflict: "course_slug" });
    alerts.push(body);
  }

  return NextResponse.json({ ran_at: now, alerts: alerts.length, detail: alerts });
}

export const POST = GET;
