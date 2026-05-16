# Greenside Changelog

Reverse-chronological, one entry per push. Surfaced at `/changelog`.

## 2026-05-16 — Real PnL on Tickets page

- **`/dashboard/bets`** PnL chart, summary stats (settled / win-rate
  / net units / ROI), by-book and by-market breakdowns now compute
  from the signed-in user's actual graded bets when ≥1 exists.
  Demo data still renders for first-time visitors and signed-out.
- Header badge flags **Your data** vs **Demo data** so it's
  obvious which view you're looking at.
- Conversion mapper handles `bets.resolved_payout` (or derives it
  from stake + status when the column is null).

## 2026-05-16 — Onboarding actually onboards

- **`/onboarding`** Done step now (1) persists the user's selected
  alert types to `profiles.alert_prefs`, (2) fetches and displays
  the real `bets+<token>@<domain>` forwarding address with copy,
  and (3) replaces the static recap with three next-step cards
  (build slip / watch leaderboard / find leverage).
- **`/auth/callback`** first-time sign-ins (no `profiles` row yet)
  now auto-create the row and route to `/onboarding` instead of
  `/dashboard`. Returning users still go straight in.

## 2026-05-16 — Course-level ownership view

- **`/dashboard/ownership`** gained a **Courses** tab. Each venue
  rolls up all its 2026 events into one view with stats: events
  on file, unique players, repeat field, most-chalked player.
- Click a course → see repeat-field players sorted by avg
  ownership, plus a separate one-off list. Range column shows
  min–max ownership across appearances so you can spot the
  inconsistency.
- `lib/data/ownership.ts` gained `listCourses` / `getCourseHistory`
  helpers (groups tournaments that share a venue).
- Ask Greenside: `get_course_ownership_history` tool —
  "who's chalk at Quail Hollow", "leverage plays at Riviera".

## 2026-05-16 — DFS leverage cards + ownership upload helper

- **`/dashboard/dfs`** gained side-by-side **Leverage plays** and
  **Chalk warning** cards: for each pool player with ≥2 historical
  appearances, computes `projected − historical_avg` ownership and
  surfaces the five biggest gaps in each direction.
- **`/dashboard/ownership/upload`** + **`/api/ownership/upload`** —
  paste a JSON blob in the same shape as the standalone HTML viewer;
  the validator checks structure and returns a ready-to-paste
  TypeScript snippet for `OWNERSHIP_DATA`. No server-side mutation —
  the dataset stays in the repo where every change is reviewable.
- Ownership browser nav gained a **+ Add tournament** chip.

## 2026-05-16 — DK ownership database (696 records, 14 events)

- **`lib/data/ownership.ts`** — typed dataset of every PGA tournament so
  far in 2026: course, type, par, yards plus per-player salary +
  finishing ownership %. Helpers: `getPlayerHistory`, `getTournament`,
  `listPlayers`, `leverage` (salary-band median delta).
- **`/dashboard/ownership`** — browse view mirroring the standalone
  HTML viewer: tournaments grid → tournament detail with chalk recap
  and full board; players list (sortable by avg / peak / apps) →
  player detail with sparkline-style history.
- **Player profile** (`/players/[slug]`) gained an Ownership History
  card on the right rail with a horizontal-bar mini-chart of the
  last six events.
- **Ask Greenside** picked up `get_player_ownership` and
  `get_tournament_ownership` tools.
- Nav: added **Ownership** tab to the desktop bar.

## 2026-05-16 — Supabase realtime on Tickets

- **`/dashboard/bets`** ImportedBets section now subscribes to a
  realtime channel filtered by `user_id`, so email imports, OCR
  saves, and cron-driven status transitions flow in without a
  refresh. Pulsing green dot in the header signals the live link.
- **`db/schema.sql`** adds `bets` to the `supabase_realtime`
  publication (idempotent — safe to re-run).

## 2026-05-16 — Upload page wired to real ingestion

- **`/dashboard/upload`** email card now shows the real
  `bets+<token>@<domain>` forwarding address (signed-in) or a
  placeholder with "Sign in to claim" copy.
- **`/api/bets/save`** — POST persists ParsedBet rows from the
  screenshot OCR path into Supabase as pending bets.
- Screenshot card gained a **Save N to my bets** button that
  pushes the OCR result into the same pending-confirmation queue
  the email pipeline uses.

## 2026-05-16 — Web Push end-to-end

- **`lib/notify/push.ts`** — VAPID-signed web push via the `web-push`
  package; pushes to one user or broadcasts to all, auto-prunes
  410/404 dead subscriptions.
- **`/api/push/subscribe`** — POST registers a PushSubscription (multi-
  device dedup by endpoint), DELETE removes it. Persists to
  `profiles.push_subscription` (jsonb array).
- **`/api/push/test`** — fires a test push to the signed-in user.
- **`/dashboard/account`** push card now actually registers the
  service worker, subscribes, and stores the subscription. Adds a
  Send-test button and inline status banner.
- **`/api/cron/grade`** gained a second phase: pulls live/pending
  bets from `bets` table, grades per user, and pushes when legs
  transition. Demo webhook fan-out still runs alongside.

## 2026-05-16 — Tickets page reads real bets, email-confirm flow

- **`/api/bets/mine`** GET returns the signed-in user's bets, PATCH
  flips `user_confirmed` (pending → live) or deletes on dismiss.
  RLS-scoped to own rows.
- **`/dashboard/bets`** gained a "Pending confirmation" section that
  surfaces bets imported from Postmark inbound with Confirm / Dismiss
  controls, plus a "Your bets" section showing all real bets — the
  demo data renders below for first-time visitors.

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
