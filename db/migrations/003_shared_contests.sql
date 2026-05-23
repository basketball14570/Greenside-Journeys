-- Migration 003 — Shared DFS contests for the Cut Sweat tool.
-- One uploader posts a contest's standings CSV + payout structure once; any
-- visitor then opens the share link and just types their DK username to see
-- their ROI. The raw standings CSV is stored verbatim and re-parsed in the
-- browser (parseStandingsCsv), so the parser stays in one place.
-- Run this in the Supabase SQL editor. Safe to re-run.

create table if not exists dfs_shared_contests (
  id text primary key,                       -- short share code, e.g. "k3f9qz"
  name text not null,
  entry_fee numeric,
  format text not null check (format in ('classic', 'showdown')),
  round integer,
  payout_ladder text not null,               -- pasted payout text
  event_name text,
  standings_csv text not null,               -- raw CSV, parsed client-side
  field_size integer,                        -- entry count, for display
  created_by uuid,                           -- uploader (nullable)
  created_at timestamptz not null default now()
);
create index if not exists dfs_shared_contests_created_idx
  on dfs_shared_contests (created_at desc);

-- Writes go through the service-role key in the API route (which checks the
-- caller is signed in). Reads are served by the same role, so the share link
-- works for any visitor. The authenticated read policy below also allows
-- direct client reads if ever needed.
alter table dfs_shared_contests enable row level security;

drop policy if exists "shared contests read" on dfs_shared_contests;
create policy "shared contests read" on dfs_shared_contests
  for select using (auth.role() = 'authenticated');
