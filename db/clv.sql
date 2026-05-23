-- Closing-line value capture. Stores the market's closing price for a bet
-- so we can compute CLV (did you beat the close?). Populated by the
-- clv-capture cron, scoped to win-futures (the market our odds source
-- closes). Apply in the Supabase SQL editor.

alter table public.bets
  add column if not exists closing_odds integer,
  add column if not exists closing_captured_at timestamptz;
