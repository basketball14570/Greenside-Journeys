# Greenside Edge — Build Roadmap

Approximate effort assumes one focused builder. Compress with parallel work.

## Week 1–2 — Foundation + Ingestion vertical slice

- [x] Project scaffold (Next.js, Tailwind, brand tokens)
- [x] Bet-slip parsing via Claude vision (`/api/bets/parse`)
- [x] Upload page (`/dashboard/upload`)
- [x] Dashboard skeleton with mock data
- [x] Postgres schema (`db/schema.sql`)
- [ ] Supabase project provisioned, schema applied
- [ ] Auth flow (email magic link → profile creation)
- [ ] Bet persistence: upload screenshot → store to Supabase Storage → parse → write to `bets` table → display on dashboard
- [ ] Confirmation flow for low-confidence parses

**Exit criteria:** A real user can sign up, upload a PrizePicks screenshot, see the parsed bet in their dashboard, confirm or edit it, and have it persist across sessions.

## Week 3–4 — Live data layer

- [ ] DataGolf wire-up: live leaderboard endpoint + nightly skills sync to a `players` table
- [ ] Tomorrow.io wire-up: conditions snapshot cron (every 10 min during tourney hours)
- [ ] Course catalog seeded (top 30 PGA Tour venues with lat/lon/archetype)
- [ ] Tournament catalog auto-imported weekly from DataGolf schedule
- [ ] Live leaderboard widget pulls real data, exposure overlay computed against user's `bets`

**Exit criteria:** Dashboard shows live, real-time leaderboard during an active PGA tournament with the user's actual exposure highlighted per player.

## Week 5–6 — Conditions alert MVP (static thresholds)

- [ ] Conditions diff engine running on cron, writing to `alerts` table
- [ ] Per-user alert personalization (which of *their* bets are affected) → `user_alerts`
- [ ] Web Push (VAPID) subscription flow + service worker
- [ ] Push notification delivery on new `user_alerts` rows (via Supabase realtime → edge function)
- [ ] In-app alert feed
- [ ] Alert detail view (which bets, total EV delta, recommended action)

**Exit criteria:** User receives a push notification within 10 min of a meaningful wind shift at a course where they have active bets, deep-linking to the affected bets in their dashboard.

## Week 7–10 — Per-player sensitivity model + DFS

- [ ] Backfill 5 years of DataGolf round-by-round data
- [ ] Fit wind-sensitivity coefficient per player (rounds with wind data; strokes-gained vs field, regressed on wind speed)
- [ ] Add course-archetype × wind direction interaction term
- [ ] Replace static `windEvDelta` with personalized model
- [ ] DK DFS salaries scrape (or partner data feed)
- [ ] DFS optimizer: simple greedy + Monte Carlo on top of DataGolf projections
- [ ] DK deep-link export

**Exit criteria:** Personalized EV deltas in alerts. DFS optimizer produces lineups that beat naive salary-cap optimizers in backtest.

## Week 11–12 — Monetization + polish

- [ ] Stripe subscription tiers (Free / Pro / Sharp)
- [ ] Affiliate links to DK / PrizePicks / FanDuel from dashboard
- [ ] Settings: alert preferences (which severity, which courses)
- [ ] Email-forward bet ingestion (Postmark Inbound)
- [ ] Onboarding flow + first-bet wizard
- [ ] Privacy policy, terms, 21+ gating, responsible-gambling resources

**Exit criteria:** Charging real money. End-to-end product loop closes (signup → upload → alert → action → renew).

## Post-v1 ideas (not committed)

- Public bettor leaderboards / verified ROI badges (community pillar from initial ideation)
- Auto-hedging suggestions across books
- Tournament preview reports (auto-generated Sunday night via Claude)
- API for syndicate/sharp customers
- White-label for sportsbook partners
- Cross-sport expansion (start with adjacent: tennis, golf-adjacent prop markets)
