# Greenside Edge — Architecture

The intelligence layer for serious golf bettors and DFS players. Sub-product of Greenside Journeys.

## Product pillars

1. **Aggregation** — every bet from every book in one dashboard, via screenshot OCR + email forwarding
2. **Live conditions alerts** — when wind, precip, or gusts shift on-course, notify the user with the specific bets in their portfolio that just moved EV and by how much
3. **DFS optimizer** — DraftKings golf lineup builder that prices in tee-time wave, live weather, and course fit
4. **Live leaderboard with exposure overlay** — every leaderboard row shows the user's personal exposure to that player

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) + TypeScript | Web-first, PWA-capable for push, server components for live data |
| Styling | Tailwind CSS with Greenside brand tokens | Matches existing marketing site palette |
| Auth + DB + Storage | Supabase | One vendor for auth, Postgres, file storage (bet screenshots), realtime, edge functions |
| OCR | Anthropic Claude vision (`claude-sonnet-4-6`) | Best structured-extraction-from-image accuracy in our testing |
| Live golf data | DataGolf API | Live leaderboard + skill ratings + historical wave splits, ~$30/mo |
| Weather | Tomorrow.io | Course-level 15-min granularity, gust + wind direction |
| Odds | The Odds API | DK, FD, Caesars, BetMGM in one feed |
| Push | Web Push (VAPID) | No app-store dependency; PWA install path for mobile |
| Inbound email | Postmark Inbound (later) | Email-forward bet ingestion path |
| Hosting | Vercel | Cron, edge functions, push compatibility |

## Bet ingestion paths

Direct API integration with sportsbooks is not available — books don't expose consumer APIs for bet history. We use three legal paths, in order of UX preference:

1. **Screenshot upload (primary)** — user snaps a bet slip, Claude vision extracts structured fields with confidence scoring. Low-confidence parses prompt for one-tap confirmation. `app/api/bets/parse/route.ts` + `lib/parsers/screenshot.ts`.
2. **Email forwarding (secondary)** — user forwards bet confirmation emails to `bets@greensidejourneys.com`. Postmark Inbound webhook parses the HTML. Industry-standard approach (Pikkit, BettorEdge).
3. **Manual entry (fallback)** — for books that don't email and slips the user can't screenshot.

What we explicitly do NOT do: credential-based scraping. It violates every book's ToS, exposes users to account bans, and creates legal risk.

## Conditions alert engine

The defensible product surface. Lives at `lib/alerts/engine.ts`.

```
┌─────────────────────────────────────────────────────────────┐
│  Scheduler (Vercel cron, every 10 min during tourney hours) │
└──────────────────────────────┬──────────────────────────────┘
                               ▼
       For each tournament with status='live':
                               │
       ┌───────────────────────┴───────────────────────┐
       ▼                                               ▼
  Fetch latest weather                          Fetch latest leaderboard
  (Tomorrow.io)                                 (DataGolf in-play)
       │                                               │
       └───────────────────────┬───────────────────────┘
                               ▼
              Diff vs last snapshot in `conditions_snapshots`
                               │
                               ▼
          Threshold crossed? (wind ±6mph, precip start, gust >20)
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
              No                            Yes
              │                             │
              └─ store snapshot, exit       ▼
                                  Compute per-player EV delta
                                  using wind_sensitivity coefficients
                                  from our model
                                            │
                                            ▼
                                  For each user with affected bets:
                                  - aggregate personal EV delta
                                  - write to `user_alerts`
                                  - enqueue web push notification
```

The wind-sensitivity model is the moat. v0 uses a field-average coefficient (0.4 strokes/round per +10mph). v1 fits per-player coefficients from DataGolf historical rounds. v2 adds course-archetype × wind direction interaction (links courses behave differently from parkland).

## Data model

See `db/schema.sql`. Key tables:

- `bets` — every parsed bet, with provenance (screenshot path, parse confidence, user-confirmed flag)
- `conditions_snapshots` — rolling weather history per course, used for diff detection
- `alerts` — emitted alerts (one row per detected condition shift)
- `user_alerts` — per-user personalization of each alert (which of *their* bets moved, total EV delta, notified/read state)
- `dfs_lineups` — saved DK DFS lineups with player IDs and projected points

Row-level security: users only see their own `bets`, `user_alerts`, and `dfs_lineups`. `alerts` and `conditions_snapshots` are read-only public to authenticated users.

## Monetization tiers

| Tier | Price | What's included |
|---|---|---|
| Free | $0 | Bet tracking (up to 50 bets/mo), live leaderboard, basic conditions display |
| Pro | $19.99/mo | Unlimited bets, personalized EV-shift push alerts, DFS optimizer, email-forward ingestion |
| Sharp | $49/mo | Pro + custom alert thresholds, model API access, CSV export, priority support |

Affiliate revenue (DraftKings, PrizePicks, FanDuel referral commissions) layered on top of subscriptions, surfaced via "place this bet" deep links from the dashboard.

## Compliance

- 21+ gating on signup
- Responsible-gambling resources in footer + settings
- No bet placement on our platform (we are an analytics product; users place bets on licensed books)
- US-state geofencing for marketing copy where DFS/sports betting isn't legal

## What's NOT in v1

- Native mobile apps (PWA install is enough for push notifications)
- Cross-sport (golf-only — that's the wedge)
- Social / follow / copy-betting (post-PMF)
- Auto-hedging suggestions (interesting but liability-heavy; later)
- Direct DK DFS lineup submission (no API; deep-link to DK app instead)
