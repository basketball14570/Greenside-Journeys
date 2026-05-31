# Greenside Edge — Mobile

Native iOS + Android app (Expo / React Native) for greensideedge.com.
Lives in this monorepo alongside the Next.js web app so the parser API,
grader, and Supabase schema can be shared without duplication.

## Phase 1 (today)

What works in the scaffold:

- **Supabase auth** — email + magic link or password, persisted across launches via AsyncStorage.
- **Tabbed nav** — Dashboard / Bets / Leaderboard / Settings.
- **WebView-backed pages** (Phase 1) — the three dashboard tabs render greensideedge.com inside an in-app webview with the user's native session handed off at `/auth/mobile-handoff` so they're already signed in.
- **Scan bet slip** — camera capture → existing `/api/bets/parse` endpoint.
- **Push notifications** — Expo Push token registration on first launch after sign-in; tokens persisted to `profiles.expo_push_tokens`.
- **Sign out** in Settings.

Native screens for Dashboard / Bets / Leaderboard, plus iOS Widget and
Live Activity, are Phase 2+.

## First-time setup

```bash
cd apps/mobile
npm install
```

Open `app.json` and fill in `extra.supabaseUrl` and
`extra.supabaseAnonKey` from the website's `.env`
(`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`). These
are baked into the binary at build time.

Then drop the three image assets into `assets/` — see
`assets/README.md` for sizes.

## Running locally

```bash
# Expo dev server
npm run start

# iOS simulator (requires Xcode)
npm run ios

# Android emulator (requires Android Studio)
npm run android
```

To run on a physical device: install **Expo Go** from the App Store /
Play Store and scan the QR code from `npm run start`. Note that push
notifications only work on physical devices, not simulators.

## EAS build (TestFlight / Play Store internal)

One-time:

```bash
npm install -g eas-cli
eas login
eas init                       # generates the projectId, paste into app.json
```

Then:

```bash
npm run build:ios              # internal distribution build
npm run build:android          # APK
npm run build:production       # store-ready builds
```

## Backend pieces this app talks to

Wired up as part of the Phase 1 scaffold:

- `POST /api/bets/parse` — already existed; called from the scan flow.
- `POST /api/push/expo` — **new**, registers an Expo push token on the
  signed-in user's profile. Source: `app/api/push/expo/route.ts`.
- `GET /auth/mobile-handoff` — **new**, accepts a Supabase access +
  refresh token from URL params and calls `setSession` so the webview
  inherits the native app's auth. Source: `app/auth/mobile-handoff/page.tsx`.
- `db/migrations/006_expo_push_tokens.sql` — adds the
  `expo_push_tokens` jsonb column on `profiles`. Apply in Supabase SQL
  editor before push notifications will register.

## Architecture notes

**Why webview for dashboard pages in Phase 1?** The Next.js dashboard
is a sprawling app — reimplementing every screen native on day one is a
multi-month rewrite. Webviews let us ship something useful immediately
and replace each page natively over time (Phase 2) without blocking
release.

**Session handoff.** The Supabase JS client on RN uses AsyncStorage;
the website uses SSR cookies. They don't share a cookie jar, so without
the `/auth/mobile-handoff` page the webview would render the login
screen. The handoff page calls `supabase.auth.setSession()` with the
tokens passed via URL params, which writes the SSR cookies, then
`router.replace()`s to the target path. Tokens travel over HTTPS only
and are scrubbed from history by the replace.

**Auth deep-link callback.** Magic-link emails come back to
`greensideedge://sign-in-callback` (set in `signInWithOtp`). The
scheme is registered in `app.json`. Supabase project settings need
`greensideedge://*` in the allowed redirect URLs.
