-- Migration 002 — DataGolf DFS Points & Salaries archive.
-- Mirrors the data structure of feeds.datagolf.com/historical-dfs-data/points
-- so we can pull salary + ownership + DFS points for every PGA event
-- DataGolf has on file and serve them out of our own DB. Refreshes via
-- /api/cron/dfs-refresh weekly + /api/admin/dfs-refresh for backfills.
-- Run this in the Supabase SQL editor. Safe to re-run.

create table if not exists dfs_events (
  id text primary key,             -- "pga-2026-33"
  tour text not null,
  year integer not null,
  event_id integer not null,
  event_name text not null,
  event_date date,
  course text,
  created_at timestamptz not null default now(),
  unique (tour, year, event_id)
);
create index if not exists dfs_events_year_idx on dfs_events (year desc);

create table if not exists dfs_player_points (
  event_id text not null references dfs_events(id) on delete cascade,
  site text not null check (site in ('draftkings', 'fanduel', 'yahoo')),
  player_name text not null,
  dg_id integer,
  salary integer,
  ownership_pct numeric(5,2),
  dfs_points numeric(6,2),
  fin_text text,
  primary key (event_id, site, player_name)
);
create index if not exists dfs_pp_player_idx on dfs_player_points (player_name);
create index if not exists dfs_pp_site_idx on dfs_player_points (site);

-- Read access for any signed-in user (DFS data is non-sensitive). Writes
-- happen via service role from the cron / admin endpoints.
alter table dfs_events enable row level security;
alter table dfs_player_points enable row level security;

drop policy if exists "dfs events read" on dfs_events;
create policy "dfs events read" on dfs_events
  for select using (auth.role() = 'authenticated');

drop policy if exists "dfs points read" on dfs_player_points;
create policy "dfs points read" on dfs_player_points
  for select using (auth.role() = 'authenticated');
