-- Stores Expo Push tokens for the native iOS / Android app, sibling to
-- the existing profiles.push_subscription column (web push). One row
-- per user; the column is a jsonb array of { token, platform, updated_at }
-- so a user can have multiple devices registered.
--
-- Populated by POST /api/push/expo from apps/mobile after the user
-- grants notification permission and Expo returns a push token.
-- Consumed by the grading cron's notification fan-out alongside web
-- push subscriptions.
--
-- Apply in the Supabase SQL editor (or your migration runner).

alter table public.profiles
  add column if not exists expo_push_tokens jsonb default '[]'::jsonb;

comment on column public.profiles.expo_push_tokens is
  'Expo Push tokens for native mobile devices. Array of { token, platform: "ios"|"android", updated_at }. Dedup happens on token.';
