-- Migration 001 — add usage_counters table + atomic bump function for
-- free-tier Claude quota. Run this in the Supabase SQL editor against
-- your live DB. Safe to re-run (uses IF NOT EXISTS / OR REPLACE).

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

-- Atomic increment so concurrent calls can't double-spend the cap.
-- Returns the new count; caller compares against the per-tier limit
-- after the fact (since the limit lives in app code, not in the DB).
create or replace function bump_usage_counter(
  p_user_id uuid,
  p_kind text,
  p_day date default current_date
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  insert into usage_counters (user_id, day, kind, count)
  values (p_user_id, p_day, p_kind, 1)
  on conflict (user_id, day, kind) do update
    set count = usage_counters.count + 1
  returning count into new_count;
  return new_count;
end;
$$;
