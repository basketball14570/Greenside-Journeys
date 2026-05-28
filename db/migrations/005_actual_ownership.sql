-- Shared "actual DK ownership" for the current week. One row per event so
-- the Ownership Accuracy tool can persist the pasted %Drafted column for
-- everyone instead of only existing in the typer's browser.
--
-- Apply in the Supabase SQL editor (or your migration runner).

create table if not exists public.actual_ownership (
  event_key     text primary key,           -- e.g. "charles-schwab-challenge-2026"
  event_name    text not null,              -- pretty name we store alongside
  raw_text      text not null,              -- the pasted blob (preserved verbatim)
  entries       jsonb not null,             -- [{name, own}] parsed for fast read
  updated_at    timestamptz not null default now(),
  updated_by    text                        -- email of the saver, if signed in
);

-- Public can read (the page surfaces saved data to everyone); writes go
-- through the service role from our API route which gates on auth.
alter table public.actual_ownership enable row level security;

drop policy if exists "actual_ownership public read" on public.actual_ownership;
create policy "actual_ownership public read"
  on public.actual_ownership for select
  using (true);
