-- Migration 001 — add usage_counters table for free-tier Claude quota.
-- Run this in the Supabase SQL editor against your live DB.
-- Safe to re-run (uses IF NOT EXISTS).

create table if not exists usage_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  kind text not null,
  count integer not null default 0,
  primary key (user_id, day, kind)
);

alter table usage_counters enable row level security;

drop policy if exists "own usage read" on usage_counters;
create policy "own usage read" on usage_counters
  for select using (auth.uid() = user_id);
