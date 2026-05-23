-- Per-course wind baseline for revision alerts. The wind-watch cron stores
-- the last-alerted average wind here and pushes subscribers when the live
-- forecast drifts past the threshold. Server-only (service role); RLS on
-- with no policies keeps it inaccessible to clients.
--
-- Apply in the Supabase SQL editor.

create table if not exists public.forecast_baselines (
  course_slug text primary key,
  wind_avg numeric not null,
  captured_at timestamptz not null default now()
);

alter table public.forecast_baselines enable row level security;
