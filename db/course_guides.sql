-- Auto-published course guides. Hand-authored guides still live in code
-- (lib/course-guides/*.ts); this table holds guides the weekly cron
-- generates so a serverless job can publish without a redeploy. The guide
-- pages read static + DB merged (static wins on slug conflict).
--
-- Apply in the Supabase SQL editor (or your migration runner).

create table if not exists public.course_guides (
  slug          text primary key,
  tournament_id text,
  data          jsonb not null,            -- full CourseGuide object
  published_at  timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Guides are public content. Allow anyone to read; writes go through the
-- service role (cron), which bypasses RLS.
alter table public.course_guides enable row level security;

drop policy if exists "course_guides public read" on public.course_guides;
create policy "course_guides public read"
  on public.course_guides for select
  using (true);
