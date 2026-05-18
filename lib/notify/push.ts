// Web Push fan-out. Reads every stored PushSubscription out of
// profiles.push_subscription (jsonb), signs payloads with the configured
// VAPID keys, and sends. Dead subscriptions (410 Gone) are pruned so the
// list stays clean.

import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

let configured: boolean | null = null;

function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const sub = process.env.VAPID_SUBJECT || "mailto:alerts@greensideedge.com";
  if (!pub || !priv) {
    configured = false;
    return false;
  }
  webpush.setVapidDetails(sub, pub, priv);
  configured = true;
  return true;
}

export function pushEnabled(): boolean {
  return ensureConfigured();
}

export async function pushToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; pruned: number; error?: string }> {
  if (!ensureConfigured()) return { sent: 0, pruned: 0, error: "vapid not configured" };
  const admin = supabaseAdmin();
  if (!admin) return { sent: 0, pruned: 0, error: "supabase admin not configured" };

  const { data, error } = await admin
    .from("profiles")
    .select("push_subscription")
    .eq("id", userId)
    .maybeSingle();
  if (error) return { sent: 0, pruned: 0, error: error.message };
  const subs = normalizeSubs(data?.push_subscription);
  if (subs.length === 0) return { sent: 0, pruned: 0 };

  const results = await Promise.all(
    subs.map((s) => sendOne(s, payload)),
  );
  const alive = subs.filter((_, i) => results[i].ok);
  const pruned = subs.length - alive.length;
  if (pruned > 0) {
    await admin
      .from("profiles")
      .update({ push_subscription: alive })
      .eq("id", userId);
  }
  return { sent: alive.length, pruned };
}

export async function pushToAllUsers(
  payload: PushPayload,
): Promise<{ users: number; sent: number; pruned: number }> {
  if (!ensureConfigured()) return { users: 0, sent: 0, pruned: 0 };
  const admin = supabaseAdmin();
  if (!admin) return { users: 0, sent: 0, pruned: 0 };

  const { data } = await admin
    .from("profiles")
    .select("id, push_subscription")
    .not("push_subscription", "is", null);
  if (!data) return { users: 0, sent: 0, pruned: 0 };

  let users = 0;
  let sent = 0;
  let pruned = 0;
  for (const row of data) {
    const res = await pushToUser(row.id, payload);
    if (res.sent > 0 || res.pruned > 0) users++;
    sent += res.sent;
    pruned += res.pruned;
  }
  return { users, sent, pruned };
}

function normalizeSubs(raw: unknown): webpush.PushSubscription[] {
  if (!raw) return [];
  // We support both a single subscription object (legacy / phone) and an
  // array (multi-device, set when the user adds a second browser).
  const list = Array.isArray(raw) ? raw : [raw];
  return list.filter(
    (s): s is webpush.PushSubscription =>
      !!s &&
      typeof s === "object" &&
      typeof (s as { endpoint?: unknown }).endpoint === "string",
  );
}

async function sendOne(
  sub: webpush.PushSubscription,
  payload: PushPayload,
): Promise<{ ok: boolean }> {
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload), {
      TTL: 60 * 60, // 1h
    });
    return { ok: true };
  } catch (e: unknown) {
    const status = (e as { statusCode?: number })?.statusCode;
    // 404 / 410 = the endpoint is gone for good; prune. Anything else
    // (transient 5xx, network) — keep, retry next tick.
    if (status === 404 || status === 410) return { ok: false };
    return { ok: true }; // keep so we try again later
  }
}
