# Greenside Mobile

Greenside ships first as a hosted PWA. The native iOS and Android apps are
thin Capacitor wrappers around that same web app — they live-load the
deployed URL rather than bundle a separate build. This way:

- Web push, parsers, and Ask Greenside go through the same code path on
  every platform.
- Native shipping is a once-a-quarter chore (App Store metadata, share
  extensions, icons) instead of every UI tweak.
- Updates land instantly without an App Store review.

## The three install paths

| Path | What you get | When to use |
|------|--------------|-------------|
| **PWA install** (Safari / Chrome “Add to Home Screen”) | Full-screen icon launcher, web push, share-target intake | Day-one rollout, beta testers, anything pre App Store |
| **Capacitor Android** | Play Store presence, share intents, native push, Play Billing if monetised | Once $49 paid tier launches |
| **Capacitor iOS** | App Store presence, iOS share extension, APNs push | Once App Store screenshots and TestFlight are ready |

## Web Share Target (works today)

`public/manifest.webmanifest` declares `share_target` pointing at
`/dashboard/upload/share`. On Android Chrome / Edge / Samsung Internet,
once a user installs the PWA, Greenside appears in the system share
sheet alongside Gmail, Drive, etc. Shared text routes to that page,
which feeds the existing parser at `/api/bets/parse`.

This is the single biggest win for bet ingestion on Android. No native
build, no app store, no review — just install the PWA and share works.

iOS Safari supports `share_target` from 17.4 onward, but coverage is
spottier; for full iOS share support, use the Capacitor iOS share
extension (below).

## Capacitor setup

The repo ships `capacitor.config.ts` at the root. To produce native
projects locally:

```bash
# 1. Install Capacitor tooling
npm i -D @capacitor/cli @capacitor/core @capacitor/ios @capacitor/android

# 2. Generate native projects (one-time)
npx cap add ios
npx cap add android

# 3. Sync — re-run after any capacitor.config.ts change or plugin install
npx cap sync

# 4. Open native IDEs
npx cap open ios       # Xcode (macOS only)
npx cap open android   # Android Studio
```

`capacitor.config.ts` points `server.url` at the production deployment so
the apps live-load. For local development:

1. Run `npm run dev` on your laptop.
2. Change `server.url` to `http://<your-laptop-LAN-IP>:3000`.
3. Set `cleartext: true` and `androidScheme: "http"` temporarily.
4. `npx cap sync && npx cap run android` (or iOS).

Revert before committing.

## iOS share extension (the prize)

The big native win on iOS is the share extension that lets users send a
DraftKings screenshot or a FanDuel bet-slip URL directly into Greenside
from any app. This requires:

1. `npx cap add ios` (creates `ios/App/App.xcodeproj`).
2. In Xcode: File → New → Target → Share Extension.
3. Name it `GreensideShare`. Activation rule: images + URLs + plain text.
4. In `ShareViewController.swift`, encode the payload as a URL like
   `greenside://share?text=...` and open it via
   `extensionContext?.open(_:completionHandler:)`.
5. Register the `greenside://` URL scheme in the main app target.
6. In `app/layout.tsx`, add a one-line deep-link handler that forwards to
   `/dashboard/upload/share?...`.

A reference implementation lives in `docs/ios-share-extension.swift` —
copy `ShareViewController` into the Xcode target after generation,
then add the AppDelegate / SceneDelegate snippet at the bottom of that
file to wire the `greenside://` deep link. The file also lists the
Info.plist + App Group entitlements you'll need.

## Android share intent

`npx cap add android` plus the manifest `share_target` block in step 1
gives Android share for free. Nothing else needed.

## Push notifications

The web build already registers a service worker (`public/sw.js`) and
handles VAPID push (`/api/push/subscribe` to be wired). On Capacitor:

- iOS: enable the Push Notifications capability in Xcode and add the
  APNs auth key to your Vercel env vars (`APNS_KEY_ID`, `APNS_TEAM_ID`,
  `APNS_PRIVATE_KEY`).
- Android: enable Firebase Cloud Messaging via `@capacitor/push-notifications`
  and drop `google-services.json` into `android/app/`.

## Build for distribution

| Target | Command | Output |
|--------|---------|--------|
| Android internal track | `cd android && ./gradlew bundleRelease` | `.aab` in `android/app/build/outputs/bundle/release/` |
| iOS TestFlight | Xcode → Product → Archive → Distribute App → App Store Connect | direct upload |
| PWA only | Vercel deploy on push to `main` | live within ~90s |

## What native gets us that the PWA doesn't

- iOS share extension (the bet-screenshot pipeline).
- Apple Pay / Google Pay (cleaner than Stripe Checkout for in-app).
- Native haptics on bet placement (cheap, but real retention signal).
- Background location for "course conditions, but for the course you're
  driving to" (deferred — not for v1).
- Tappable widget for live P&L (iOS 17 Live Activity, Android glanceable).

Everything in the PWA otherwise works the same in the wrapper.
