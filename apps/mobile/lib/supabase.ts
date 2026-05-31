import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

// Supabase env reads. `app.json` -> `extra` is the canonical place for
// these on a mobile build because EAS bakes them into the binary at
// build time. For local dev `npx expo start` reads the same `extra`
// values straight from app.json — no .env juggling needed.
const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const SUPABASE_URL = extra.supabaseUrl;
const SUPABASE_ANON_KEY = extra.supabaseAnonKey;

if (
  !SUPABASE_URL ||
  !SUPABASE_ANON_KEY ||
  SUPABASE_URL.startsWith("REPLACE_") ||
  SUPABASE_ANON_KEY.startsWith("REPLACE_")
) {
  // Loud failure beats a silent "stuck on sign-in" screen. Logged once
  // at import time so it's obvious during first-time setup.
  console.error(
    "[supabase] Missing supabaseUrl / supabaseAnonKey in app.json `extra`. " +
      "Copy the values from the Next.js .env (NEXT_PUBLIC_SUPABASE_URL / " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY) into apps/mobile/app.json.",
  );
}

export const supabase = createClient(SUPABASE_URL ?? "", SUPABASE_ANON_KEY ?? "", {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // RN doesn't expose URL session fragments the way browsers do, so
    // we never want supabase-js to try to parse one on boot.
    detectSessionInUrl: false,
  },
});
