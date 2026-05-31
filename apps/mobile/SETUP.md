# Getting the app running — step by step

No prior mobile experience needed. You'll run the app on your own phone
in about 15 minutes using **Expo Go** (a free app that runs the project
without any App Store account).

## 1. Install the tools (one time, on your computer)

1. Install **Node.js** (LTS) from https://nodejs.org if you don't have it.
2. Open a terminal in the project and run:

   ```bash
   cd apps/mobile
   npm install
   ```

## 2. Get your Supabase keys (the part you weren't sure about)

These two values let the betting tabs sign you in. They are **public**
keys (safe to put in the app — the anon key is designed to be shipped).

1. Go to **https://supabase.com** and sign in to the Greenside project
   (the same account/project the website uses).
2. In the left sidebar click the **gear icon (Project Settings)**.
3. Click **API**.
4. You'll see two things to copy:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **Project API keys → `anon` `public`** — a long string starting
     with `eyJ...`
5. Open `apps/mobile/app.json` and paste them into the `extra` block:

   ```json
   "supabaseUrl": "https://abcdefgh.supabase.co",
   "supabaseAnonKey": "eyJhbGciOi...your long anon key..."
   ```

   Replace the `REPLACE_WITH_...` placeholders. Save the file.

> Tip: these are the exact same values as the website's
> `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. If you
> can find those in the website's environment settings, you can copy
> them straight over.

## 3. Run it

```bash
npm run start
```

A QR code appears in the terminal.

- **iPhone:** install **Expo Go** from the App Store, open the Camera,
  point it at the QR code, tap the banner.
- **Android:** install **Expo Go** from Play Store, open it, tap "Scan
  QR code."

The app loads on your phone. Edits you make refresh live.

## What works without any further setup

- **Play (GPS rangefinder)** — works immediately on the bundled sample
  course. Allow location when asked.
- **Tee Times** — loads the booking site.
- **Home / Bets** — work once the Supabase keys (step 2) are in and you
  sign in.

## Things that need accounts/money later (not now)

- **Push notifications** need an Expo project id (`npx eas init`) — free.
- **TestFlight / App Store** needs an Apple Developer account ($99/yr).
- **Play Store** needs a Google Play account ($25 one-time).
- **App icon / splash** — swap the placeholders in `assets/` (see
  `assets/README.md`); a concept icon is in `docs/design/icon.svg`.

Stuck on any step? Tell me which number and what you see.
