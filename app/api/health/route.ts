import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Operational health probe — reports which integrations are configured
// without leaking the secrets themselves. Useful for deploy-time smoke
// checks and for an admin dashboard.

function flag(name: string): boolean {
  return !!process.env[name] && process.env[name] !== "";
}

export async function GET() {
  const integrations = {
    supabase: flag("NEXT_PUBLIC_SUPABASE_URL") && flag("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    supabase_service_role: flag("SUPABASE_SERVICE_ROLE_KEY"),
    anthropic: flag("ANTHROPIC_API_KEY"),
    datagolf: flag("DATAGOLF_API_KEY"),
    weather_tomorrow_io: flag("TOMORROW_IO_API_KEY"),
    weather_open_meteo: true, // free, no key — always on
    odds_api: flag("THE_ODDS_API_KEY"),
    postmark_inbound: flag("POSTMARK_INBOUND_TOKEN"),
    push_vapid:
      flag("NEXT_PUBLIC_VAPID_PUBLIC_KEY") && flag("VAPID_PRIVATE_KEY"),
    webhook_discord: flag("DISCORD_WEBHOOK_URL"),
    webhook_slack: flag("SLACK_WEBHOOK_URL"),
    webhook_generic: flag("NEWSLETTER_WEBHOOK_URL"),
    cron_secret: flag("CRON_SECRET"),
  };
  const configured = Object.values(integrations).filter(Boolean).length;
  const total = Object.keys(integrations).length;
  return NextResponse.json(
    {
      status: "ok",
      time: new Date().toISOString(),
      configured,
      total,
      integrations,
      runtime: {
        node: process.version,
        platform: process.platform,
      },
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
