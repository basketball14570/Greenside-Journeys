# Greenside Changelog

Reverse-chronological, one entry per push. Surfaced at `/changelog`.

## 2026-05-16 — Persisted alert preferences

- **`/api/account/preferences`** GET/PUT — backed by new
  `profiles.alert_prefs` (jsonb) + `wind_cutoff_mph` / `ev_cutoff_pct`
  columns. RLS lets users only read/write their own row.
- **`/dashboard/account`** toggles, wind and EV sliders now auto-save
  on change; "✓ Saved" / "Sign in to sync" indicator at the bottom.
  Preferences hydrate on page load.

## 2026-05-16 — Postmark inbound persistence, per-user forwarding address

- **`/api/email/inbound`** now writes parsed legs into the `bets` table
  via a service-role admin client. The `bets+<token>@…` address routes
  to the right user by looking up `profiles.bets_token`.
- **`lib/supabase/admin.ts`** — service-role client factory; returns
  null when not configured so callers can no-op in local / demo envs.
- **`profiles.bets_token`** added in `db/schema.sql` with a default
  random value, so every signup auto-gets an inbound address.
- **`/api/account/forwarding`** — GET returns the signed-in user's
  forwarding address (creating the profile row on first hit), POST
  rotates the token. The `/dashboard/account` page surfaces the
  address with copy + rotate controls.
- `POSTMARK_INBOUND_DOMAIN` added to `.env.example`.

## 2026-05-16 — Shareable slips, admin integrations panel

- **Public slip view** at `/slip/[token]` — anyone with the link can see
  the lineup live-graded against the leaderboard. The token is the slip
  itself, base64url-encoded; no DB row, no expiry. The slip editor
  gained a **Generate share link** button that mints the URL and offers
  copy / open-preview / regenerate.
- **/dashboard/admin** integrations panel — consumes `/api/health` and
  paints a green/red dot for every external service (Supabase,
  Anthropic, DataGolf, weather, odds, Postmark, push, webhooks, cron).
  Re-check button re-probes on demand; never returns the secrets
  themselves.
- `lib/slip-share.ts` handles encode/decode with a one-byte version
  prefix so future schema bumps can coexist with older links.

## 2026-05-16 — Slip paste, alert dispatch, bookmarklet

- **Slip-paste import** on `/dashboard/slip` — heuristic parser
  (`lib/slip-parser.ts`) recognizes top-N, outright, matchup, 3-ball,
  round prop over/unders, and make-cut from free-form text dumps of
  DK / FD / PrizePicks / Underdog slips. Parsed legs slot straight
  into the slip; rejected lines are reported.
- **Change-only alert dispatch** — `/api/cron/grade` now diffs each
  decision against the prior run and only fans out webhooks when a
  bet actually transitions (live → won, etc.). No more cron spam.
- **Bookmarklet** at `/bookmarklet` — drag the button to your
  bookmarks bar; on any sportsbook tab, highlight the bet text and
  click the bookmark to hand off to `/dashboard/slip#import=…` with
  the selection pre-filled.

## 2026-05-16 — Full leaderboard, unified slip editor, health

- **/dashboard/leaderboard** — every player in the live ESPN field with
  search / filter (All, Mine, Made cut, Top 30) / sort. Rows the user
  has a bet on glow with a colored pill per leg showing live grading.
- **/dashboard/slip** — full slip editor: top-N, outright, matchup,
  3-ball, round prop O/U (strokes/birdies/bogeys/eagles), make-cut.
  Player inputs autocomplete from the live field. Persists to
  localStorage instantly; syncs to Supabase `bet_slips` when signed in.
- **lib/bet-slip.ts** — discriminated union covering every market,
  with `legToOpenBet` adapter feeding the existing grader.
- **db/schema.sql** adds the `bet_slips` table with own-row RLS.
- **/api/health** — 13-integration status probe.
- Ask Greenside picked up `get_full_leaderboard`.

## 2026-05-16 — Settlement, syndication, exports

- **Bet-grading engine** (`lib/grading.ts`) — generic settler that takes
  any open bet + a live ESPN snapshot and decides won / lost / live /
  push. Handles top-N, to-win, matchup, and round-prop markets. Live
  smoke test at `/api/bets/grade`.
- **Cron jobs** wired in `vercel.json` — daily newsletter dispatch at
  13:00 UTC (`/api/cron/newsletter`) and a 15-minute settlement check
  (`/api/cron/grade`). Both gated by `CRON_SECRET` when set.
- **Webhook dispatcher** — push the daily digest into Discord / Slack /
  generic JSON sinks via `DISCORD_WEBHOOK_URL`, `SLACK_WEBHOOK_URL`,
  `NEWSLETTER_WEBHOOK_URL`. Multi-target fan-out with per-target
  status reporting.
- **CSV / JSON bet history export** at `/api/bets/export` — Export CSV
  and Export JSON buttons live on the Tickets page.
- **Changelog page** at `/changelog`.

## 2026-05-16 — Live odds, newsletter, iOS share, auth chip

- The Odds API wired with fallback-aware client + `/api/odds/[player]`.
- Daily newsletter generator with markdown / HTML / JSON renderers,
  admin preview at `/dashboard/newsletter`, public API at
  `/api/newsletter/daily`.
- iOS share extension reference (`docs/ios-share-extension.swift`)
  paired with the existing Web Share Target landing page.
- Real Supabase auth chip in the desktop chrome — initials, dropdown,
  sign-out — with graceful "Sign in" fallback when env vars are absent.

## 2026-05-16 — Wind-model calibration, preview JSON, DataGolf profiles

- `/dashboard/model` page validating windSensitivity coefficients
  against actual recent rounds — bias, MAE, R², per-bucket calibration,
  per-player drift with suggested coefficients, predicted-vs-actual
  scatter.
- Preview JSON export at `/api/preview/[slug]` with a stable
  schema_version and Share / Open JSON / Download JSON buttons on the
  preview detail page.
- DataGolf wiring (`lib/data/datagolf.ts`) with `getPlayerProfile(slug)`
  returning live data when `DATAGOLF_API_KEY` is set, demo fixtures
  otherwise. Exposed at `/api/players/[slug]`.
- Ask Greenside gained `get_player_profile`, `model_calibration`, and
  `get_live_odds` tools.

## 2026-05-16 — Weather API, AI backtest tools, multi-tournament matrix

- Pluggable forecast provider (`lib/weather/forecast.ts`) — Open-Meteo
  default, Tomorrow.io behind `TOMORROW_IO_API_KEY`, 5-minute cache,
  graceful demo fallback.
- Backtest engine now slices by tournament; matrix on
  `/dashboard/backtest`.
- Ask Greenside picked up `run_backtest`, `build_preview`,
  `get_forecast`.

## 2026-05-16 — Showdown leaderboard

- `/dashboard/showdown` — six-player ESPN-backed live tracker with
  Nicolai / Rasmus disambiguation, strict round-period matching, and
  auto-detection of the active round.

## 2026-05-16 — Backtest, previews, mobile shell

- `/dashboard/backtest` with six selection strategies and equity curve.
- `/dashboard/preview/[slug]` joining course profile + conditions +
  player pool into a structured tournament read.
- Capacitor mobile shell + Web Share Target wired into the manifest.
