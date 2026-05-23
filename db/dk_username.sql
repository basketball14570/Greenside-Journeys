-- Store a user's DraftKings username so the DFS cut-sweat / ROI tools can
-- auto-match their entries out of an uploaded contest-standings file. This is
-- a convenience for matching only — DraftKings has no public API, so contests
-- and standings are still exported manually by the user.
--
-- Apply in the Supabase SQL editor.

alter table public.profiles
  add column if not exists dk_username text;
