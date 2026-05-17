# Deploy to Vercel

Step-by-step for getting Greenside live on a real URL. Assumes the
Supabase project is already set up locally (which it is — `db/schema.sql`
is the source of truth).

## 1. Push to GitHub

The Vercel integration deploys from a GitHub branch. Either:

- Merge the feature branch into `main` and deploy from `main` (recommended
  long-term), **or**
- Configure Vercel to deploy directly from `claude/betting-app-monetization-cPve7`
  (fine for the first deploy).

## 2. Import the repo into Vercel

1. https://vercel.com → New Project → Import Git Repository
2. Pick `basketball14570/greenside-journeys`
3. Framework preset: Next.js (auto-detected)
4. Root directory: `./`
5. Don't click Deploy yet — add env vars first (step 3).

## 3. Environment variables

Paste each row into Vercel → Settings → Environment Variables. The
"Scope" column shows which environments need it.

| Variable | Required | Scope | Source |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Prod + Preview + Dev | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Prod + Preview + Dev | same |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | **Prod only** | same — keep server-side |
| `CRON_SECRET` | yes | Prod | generate: `openssl rand -hex 32` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | optional | Prod + Preview | enables web-push |
| `VAPID_PRIVATE_KEY` | optional | **Prod only** | pair with public key |
| `VAPID_SUBJECT` | optional | Prod | `mailto:you@yourdomain.com` |
| `DATAGOLF_API_KEY` | optional | Prod | flips "this week's edge" + FIR/GIR grading from demo to live |
| `ANTHROPIC_API_KEY` | optional | Prod | enables Ask Greenside |
| `THE_ODDS_API_KEY` | optional | Prod | live cross-book odds |
| `TOMORROW_IO_API_KEY` | optional | Prod | live weather hero |
| `POSTMARK_INBOUND_DOMAIN` | optional | Prod | bet-slip forwarding inbox |
| `POSTMARK_INBOUND_TOKEN` | optional | Prod | pair with the domain |
| `SLACK_WEBHOOK_URL` | optional | Prod | grading alerts → Slack |
| `DISCORD_WEBHOOK_URL` | optional | Prod | grading alerts → Discord |
| `NEWSLETTER_WEBHOOK_URL` | optional | Prod | daily newsletter destination |

Anything missing falls back to demo data or no-ops gracefully — the
site still loads.

## 4. Deploy

Click Deploy. ~2 minute build. Vercel returns a URL like
`greenside-journeys.vercel.app`.

## 5. Wire up Supabase redirects

In Supabase → Authentication → URL Configuration:

- **Site URL**: `https://greenside-journeys.vercel.app` (or your custom domain)
- **Redirect URLs**: add both
  - `https://greenside-journeys.vercel.app/auth/callback`
  - `https://your-custom-domain.com/auth/callback` (if applicable)
  - `https://*.vercel.app/auth/callback` (for preview deploys — Supabase supports wildcards in this field)

Without this, magic links and OAuth callbacks land on `localhost`.

## 6. (Optional) Custom domain

Vercel → Project → Settings → Domains → add `greensideedge.com`. Vercel
gives you two DNS records (A or CNAME) to paste into your registrar.
HTTPS is auto-provisioned in ~5 minutes.

Re-run step 5 with the custom domain added.

## 7. Verify the deploy

Hit these URLs on the new domain:

- `/` — marketing home
- `/dashboard` — full app (auth-gated; sign in via your existing Supabase user)
- `/dashboard/parlay` — live grading should render
- `/api/projections/this-week` — JSON; `source: "demo"` if no DataGolf key, `source: "datagolf"` if set

Cron sanity check after the next scheduled tick:

- Vercel → Deployments → Functions → `/api/cron/grade` should show a
  recent invocation with 200.

## Cron tier note

Vercel **Hobby (free)** caps cron frequency at once per day. The current
`*/15 * * * *` grade schedule needs **Pro ($20/mo)**. Either:

- Stay on Hobby, change `vercel.json` to `0 */6 * * *` (every 6h), or
- Upgrade to Pro for proper 15-min live grading during tournament windows.

## What to keep an eye on after launch

- **Supabase free tier**: 500MB DB, 2GB egress, 50MB file storage. Plenty
  of headroom until you have ~1k active users.
- **Vercel bandwidth**: 100GB/mo on Hobby. ESPN snapshots are cached so
  this is rarely the bottleneck.
- **Web push subjects**: VAPID `subject` must match the production
  domain or browsers reject the subscription.
