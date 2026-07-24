/**
 * push-notify — FCM HTTP v1 fan-out for notifications INSERT.
 *
 * Called by DB trigger (service role) with { notification_id }.
 * Secrets:
 *   FIREBASE_SERVICE_ACCOUNT — full service account JSON string
 *   FIREBASE_PROJECT_ID — optional override (else from SA JSON)
 *   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — auto-injected
 *
 * Best-effort: missing tokens / FCM errors return 200 with details so
 * the trigger path does not retry aggressively.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ServiceAccount {
  project_id?: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
}

interface DeviceTokenRow {
  id: string;
  fcm_token: string;
  platform: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return json({ ok: true }, 200);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const token = authHeader.slice("Bearer ".length).trim();
  if (!serviceRoleKey || token !== serviceRoleKey) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let notificationId: string | undefined;
  try {
    const body = await req.json();
    notificationId = body?.notification_id ?? body?.notificationId;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!notificationId || typeof notificationId !== "string") {
    return json({ error: "Missing notification_id" }, 400);
  }

  const { data: notification, error: notifErr } = await supabase
    .from("notifications")
    .select("id, user_email, type, title, message, link")
    .eq("id", notificationId)
    .maybeSingle();

  if (notifErr) {
    console.error("load notification failed", notifErr);
    return json({ error: "Failed to load notification" }, 500);
  }
  if (!notification) {
    return json({ error: "Notification not found", skipped: true }, 200);
  }

  const email = String(notification.user_email || "").trim().toLowerCase();
  if (!email) {
    return json({ skipped: true, reason: "no_email" }, 200);
  }

  const { data: tokens, error: tokErr } = await supabase
    .from("device_tokens")
    .select("id, fcm_token, platform")
    .eq("user_email", email);

  if (tokErr) {
    console.error("load device_tokens failed", tokErr);
    return json({ error: "Failed to load device tokens" }, 500);
  }

  const rows = (tokens ?? []) as DeviceTokenRow[];
  if (rows.length === 0) {
    return json({ skipped: true, reason: "no_tokens", email }, 200);
  }

  let accessToken: string;
  let projectId: string;
  try {
    const sa = loadServiceAccount();
    projectId =
      Deno.env.get("FIREBASE_PROJECT_ID")?.trim() ||
      sa.project_id ||
      "";
    if (!projectId) throw new Error("FIREBASE_PROJECT_ID missing");
    accessToken = await getGoogleAccessToken(sa);
  } catch (e) {
    console.error("FCM auth failed", e);
    return json({ error: "FCM not configured", detail: String(e) }, 500);
  }

  const title = String(notification.title || "Blox");
  const bodyText = String(notification.message || "");
  const link = notification.link ? String(notification.link) : "";
  const type = notification.type ? String(notification.type) : "info";

  const results: Array<{ tokenId: string; ok: boolean; error?: string }> = [];

  for (const row of rows) {
    try {
      await sendFcmV1({
        accessToken,
        projectId,
        fcmToken: row.fcm_token,
        title,
        body: bodyText,
        data: {
          notification_id: String(notification.id),
          link,
          type,
        },
      });
      results.push({ tokenId: row.id, ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("FCM send failed", row.id, msg);
      results.push({ tokenId: row.id, ok: false, error: msg });

      // Drop invalid tokens so we do not keep failing.
      if (/UNREGISTERED|INVALID_ARGUMENT|NOT_FOUND/i.test(msg)) {
        await supabase.from("device_tokens").delete().eq("id", row.id);
      }
    }
  }

  const sent = results.filter((r) => r.ok).length;
  if (sent > 0) {
    await supabase
      .from("notifications")
      .update({ push_sent_at: new Date().toISOString() })
      .eq("id", notificationId);
  }

  return json({
    ok: true,
    email,
    attempted: results.length,
    sent,
    results,
  }, 200);
});

function loadServiceAccount(): ServiceAccount {
  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT secret missing");
  const parsed = JSON.parse(raw) as ServiceAccount;
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT missing client_email/private_key");
  }
  // Supabase secrets sometimes store escaped newlines.
  parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  return parsed;
}

async function getGoogleAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: sa.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: getNumericDate(60 * 60),
  };

  const key = await importPkcs8(sa.private_key);
  const jwt = await create({ alg: "RS256", typ: "JWT" }, claim, key);

  const res = await fetch(sa.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`token exchange failed: ${JSON.stringify(data)}`);
  }
  return data.access_token as string;
}

async function importPkcs8(pem: string): Promise<CryptoKey> {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function sendFcmV1(args: {
  accessToken: string;
  projectId: string;
  fcmToken: string;
  title: string;
  body: string;
  data: Record<string, string>;
}): Promise<void> {
  const url =
    `https://fcm.googleapis.com/v1/projects/${args.projectId}/messages:send`;

  // All data values must be strings for FCM.
  const data: Record<string, string> = {};
  for (const [k, v] of Object.entries(args.data)) {
    data[k] = v ?? "";
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token: args.fcmToken,
        notification: {
          title: args.title,
          body: args.body,
        },
        data,
        android: {
          priority: "HIGH",
          notification: {
            channel_id: "blox_default",
            click_action: "FLUTTER_NOTIFICATION_CLICK",
          },
        },
      },
    }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      payload?.error?.message ||
        payload?.error?.status ||
        `FCM HTTP ${res.status}`,
    );
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
