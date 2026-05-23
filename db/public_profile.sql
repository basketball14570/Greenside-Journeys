-- Public, opt-in track-record profiles. A user can claim a handle and flip
-- their profile public; the /u/<handle> page then shows their settled
-- record + ROI (no PII). Reads happen server-side via the service role, so
-- no extra RLS policy is needed.
--
-- Apply in the Supabase SQL editor.

alter table public.profiles
  add column if not exists public_handle text unique,
  add column if not exists public_profile boolean not null default false;

-- Handle format guard: 3-20 chars, lowercase alphanumeric + dashes.
alter table public.profiles
  drop constraint if exists profiles_public_handle_format;
alter table public.profiles
  add constraint profiles_public_handle_format
  check (public_handle is null or public_handle ~ '^[a-z0-9-]{3,20}$');
