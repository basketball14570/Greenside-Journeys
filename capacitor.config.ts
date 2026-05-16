// When `@capacitor/cli` is installed (see docs/mobile.md) replace this
// stub type with `import type { CapacitorConfig } from "@capacitor/cli";`.
// We define it locally so the project type-checks without the optional
// native-mobile dev dependency present.
type CapacitorConfig = {
  appId: string;
  appName: string;
  webDir?: string;
  server?: {
    url?: string;
    cleartext?: boolean;
    androidScheme?: string;
  };
  ios?: Record<string, unknown>;
  android?: Record<string, unknown>;
};

// Greenside ships first as a hosted PWA; the native iOS/Android shells
// wrap that same web app via Capacitor and live-load against the
// deployed URL. This avoids the App Store review tax on every web push
// and keeps a single code path.
//
// To run locally:
//   npm i -D @capacitor/cli @capacitor/core @capacitor/ios @capacitor/android
//   npx cap init   (skip — already done by this file)
//   npx cap add ios
//   npx cap add android
//   npx cap sync
//   npx cap open ios       # opens Xcode
//   npx cap open android   # opens Android Studio
//
// See docs/mobile.md for the full build flow including the iOS share
// extension that sends DraftKings / FanDuel screenshots into the parser.

const config: CapacitorConfig = {
  appId: "com.greensidejourneys.app",
  appName: "Greenside",
  // No `webDir` because we live-load from a hosted URL instead of bundling
  // a static export. The Next.js server-rendered routes (Ask AI, parse,
  // email ingest) work over the network the same as in a browser.
  webDir: "public",
  server: {
    // Point at your production URL. For local dev, swap to the LAN IP of
    // your laptop running `npm run dev`, e.g. http://192.168.1.42:3000.
    url: "https://greenside-journeys.vercel.app",
    cleartext: false,
    androidScheme: "https",
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#0a1f14",
    limitsNavigationsToAppBoundDomains: true,
  },
  android: {
    backgroundColor: "#0a1f14",
    allowMixedContent: false,
  },
};

export default config;
