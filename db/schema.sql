-- Greenside Edge — Postgres schema (Supabase)
-- Run this in the Supabase SQL editor on a fresh project.

create extension if not exists "pgcrypto";

-- ============================================================================
-- Users (Supabase auth.users is the source of truth; we extend with profile)
-- ============================================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  tier text not null default 'free' check (tier in ('free', 'pro', 'sharp')),
  push_subscription jsonb,
  -- Per-user token surfaced as bets+<token>@greensidejourneys.com for the
  -- Postmark inbound email parser. Random by default; the user can rotate
  -- it from /dashboard/account.
  bets_token text unique default replace(gen_random_uuid()::text, '-', ''),
  -- Alert + threshold preferences. Schema is freeform JSON so the UI can
  -- add toggles without a migration; the only contract is that keys
  -- match the IDs in app/dashboard/account/page.tsx.
  alert_prefs jsonb not null default '{}'::jsonb,
  wind_cutoff_mph integer not null default 15,
  ev_cutoff_pct integer not null default 5,
  created_at timestamptz not null default now()
);
create index if not exists profiles_bets_token_idx on profiles (bets_token);

-- ============================================================================
-- Tournaments + courses (seeded weekly from DataGolf)
-- ============================================================================
create table if not exists courses (
  id text primary key,                -- e.g. "quail-hollow"
  name text not null,
  lat double precision not null,
  lon double precision not null,
  par integer not null default 72,
  archetype text                       -- "links" | "parkland" | "desert" | "coastal"
);

create table if not exists tournaments (
  id text primary key,                -- e.g. "2026-wells-fargo"
  name text not null,
  tour text not null default 'pga',
  course_id text references courses(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'upcoming' check (status in ('upcoming', 'live', 'final'))
);

-- ============================================================================
-- Bets (extracted from screenshots or email forwards)
-- ============================================================================
create type bet_book as enum (
  'draftkings', 'fanduel', 'prizepicks', 'underdog',
  'caesars', 'betmgm', 'other'
);

create type bet_status as enum ('pending', 'live', 'won', 'lost', 'void', 'cashed_out');

create table if not exists bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tournament_id text references tournaments(id),
  book bet_book not null,
  player text not null,
  market text not null,                 -- "Fairways Hit Over 8.5", "Top 10", etc.
  line numeric,
  american_odds integer not null,
  stake numeric(10,2) not null,
  to_win numeric(10,2) not null,
  status bet_status not null default 'pending',
  -- audit / provenance
  source text not null default 'screenshot' check (source in ('screenshot', 'email', 'manual')),
  source_image_path text,               -- supabase storage path
  parse_confidence numeric(3,2),
  user_confirmed boolean not null default false,
  -- live state
  live_ev_delta numeric(5,2),           -- percent
  placed_at timestamptz,
  resolved_at timestamptz,
  resolved_payout numeric(10,2),
  created_at timestamptz not null default now()
);
create index if not exists bets_user_status_idx on bets (user_id, status);
create index if not exists bets_tournament_idx on bets (tournament_id);
create index if not exists bets_player_idx on bets (player);

-- ============================================================================
-- Conditions snapshots + alerts
-- ============================================================================
create table if not exists conditions_snapshots (
  id bigserial primary key,
  course_id text not null references courses(id),
  taken_at timestamptz not null default now(),
  wind_speed numeric(5,2),
  wind_gust numeric(5,2),
  wind_direction integer,
  precip_intensity numeric(5,2),
  temperature numeric(5,2),
  humidity numeric(5,2),
  raw jsonb
);
create index if not exists conditions_course_time_idx on conditions_snapshots (course_id, taken_at desc);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  tournament_id text references tournaments(id),
  course_id text references courses(id),
  severity text not null check (severity in ('info', 'warning', 'critical')),
  kind text not null,                   -- 'wind_shift' | 'precip_start' | 'wave_advantage' | ...
  headline text not null,
  detail text not null,
  payload jsonb,                        -- structured: wind_delta, affected_players, etc.
  created_at timestamptz not null default now()
);
create index if not exists alerts_tournament_idx on alerts (tournament_id, created_at desc);

-- Per-user, per-alert personalization (which of the user's bets shifted)
create table if not exists user_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  alert_id uuid not null references alerts(id) on delete cascade,
  affected_bet_ids uuid[] not null default '{}',
  ev_delta numeric(5,2) not null,
  notified_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, alert_id)
);
create index if not exists user_alerts_user_idx on user_alerts (user_id, created_at desc);

-- ============================================================================
-- DFS lineups (DraftKings golf)
-- ============================================================================
create table if not exists dfs_lineups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tournament_id text references tournaments(id),
  site text not null default 'draftkings',
  contest_type text,                    -- 'classic' | 'showdown' | 'tiers'
  total_salary integer,
  projected_points numeric(6,2),
  player_ids text[] not null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table profiles enable row level security;
alter table bets enable row level security;
alter table user_alerts enable row level security;
alter table dfs_lineups enable row level security;

create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own bets" on bets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own alerts" on user_alerts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own lineups" on dfs_lineups
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- Bet slips — lightweight, per-user "current open slip" used by the
-- /dashboard/slip and /dashboard/leaderboard views. One row per user.
-- The full structured `bets` table above is the post-import canonical form;
-- bet_slips is what the UI reads/writes during a live session.
-- ============================================================================
create table if not exists bet_slips (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- Array of slip legs. Each leg is freeform JSON to keep the UI moving;
  -- a server-side validator coerces to the canonical bet shape on grade.
  bets jsonb not null default '[]',
  tournament_id text references tournaments(id),
  updated_at timestamptz not null default now()
);
alter table bet_slips enable row level security;
create policy "own slip" on bet_slips
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
