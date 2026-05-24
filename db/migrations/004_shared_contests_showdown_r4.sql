-- Migration 004 — allow the Showdown R4 scoring format in shared contests.
-- The original table (migration 003) restricted format to ('classic',
-- 'showdown'); Showdown R4 is a distinct format (Showdown per-hole scoring plus
-- finishing-position points), so publishing an R4 contest failed the CHECK.
-- Run this in the Supabase SQL editor. Safe to re-run.

alter table dfs_shared_contests
  drop constraint if exists dfs_shared_contests_format_check;

alter table dfs_shared_contests
  add constraint dfs_shared_contests_format_check
  check (format in ('classic', 'showdown', 'showdown_r4'));
