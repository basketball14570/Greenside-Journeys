import Constants from "expo-constants";
import { supabase } from "./supabase";

const WEB = (Constants.expoConfig?.extra?.webAppUrl as string) ?? "https://greensideedge.com";

export function webUrl(path: string): string {
  return `${WEB}${path.startsWith("/") ? path : `/${path}`}`;
}

// Authenticated fetch against the web app's API. The Supabase access
// token rides as a Bearer header so the API route can resolve the user
// the same way the SSR cookie flow does on the website.
async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers ?? {});
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(webUrl(path), { ...init, headers });
}

// Mobile equivalent of the website's screenshot uploader. Sends a
// base64-encoded image to /api/bets/parse and returns the parsed bets.
export type ParsedBet = Record<string, unknown>;
export type ParseResult = {
  bets: ParsedBet[];
  usage?: { used: number; limit: number; tier: string };
};

export async function parseBetSlip(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" = "image/jpeg",
): Promise<ParseResult> {
  const res = await authFetch("/api/bets/parse", {
    method: "POST",
    body: JSON.stringify({ imageBase64, mediaType }),
  });
  const json = await res.json();
  if (!res.ok) {
    const msg = typeof json?.error === "string" ? json.error : `parse failed (${res.status})`;
    throw new Error(msg);
  }
  return json as ParseResult;
}

// Persists an Expo push token for the signed-in user. The web app's
// grading cron / alert pipeline picks these up the same way it picks up
// web-push subscriptions and fans out notifications via Expo's push API.
export async function registerExpoPushToken(token: string, platform: "ios" | "android"): Promise<void> {
  const res = await authFetch("/api/push/expo", {
    method: "POST",
    body: JSON.stringify({ token, platform }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`push token registration failed (${res.status}) ${text}`);
  }
}
