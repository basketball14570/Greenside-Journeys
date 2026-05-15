# Greenside Edge

The intelligence layer for serious golf bettors and DFS players. A product of [Greenside Journeys](./public/legacy/marketing-index.html).

Track every bet across every book. Get live course-conditions alerts when wind shifts your EV. Build wave-aware DraftKings DFS lineups. All in one dashboard.

## Quick start

```bash
npm install
cp .env.example .env.local
# Fill in keys: Supabase, Anthropic, DataGolf, Tomorrow.io, The Odds API
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Setting up the database

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. In the SQL Editor, run `db/schema.sql`
3. Copy the project URL + anon key into `.env.local`
4. Create a storage bucket named `bet-slips` (private, signed-URL access)

## Project layout

```
app/                      Next.js App Router
  page.tsx                Marketing landing
  dashboard/              Authenticated app
  api/bets/parse/         Claude vision OCR endpoint
components/
  brand/                  Nav, Logo, brand primitives
  dashboard/              BetCard, ConditionsBanner, LeaderboardWidget
lib/
  claude.ts               Anthropic SDK client
  parsers/screenshot.ts   Bet-slip vision parser
  data/                   DataGolf, Tomorrow.io, Odds API clients
  alerts/engine.ts        Conditions diff + EV impact model
  supabase/               Browser + server Supabase clients
db/schema.sql             Postgres schema
docs/
  ARCHITECTURE.md         Design decisions, ingestion paths, alert engine
  ROADMAP.md              12-week build plan with exit criteria
public/brand/             Logo SVGs
public/legacy/            Original marketing site (preserved)
```

## What this is and isn't

- **Is:** an analytics + intelligence product. We help users understand and optimize bets they place on licensed sportsbooks.
- **Isn't:** a sportsbook. We don't accept wagers. We don't process payments for bets. 21+. For entertainment purposes only.

## Read next

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — stack rationale, ingestion paths, the conditions alert engine
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — week-by-week build plan
