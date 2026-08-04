/**
 * staff-notify-email — email fan-out for staff notification INSERTs.
 *
 * Called by DB trigger (service role) with { notification_id }.
 * Sends staff_alert via send-email only when the recipient is a staff role.
 * Best-effort: never throws into the caller; missing prefs/URLs are non-fatal.
 *
 * Secrets:
 *   PORTAL_URL_ADMIN / PORTAL_URL_CREDIT / PORTAL_URL_FINANCE — CTA bases
 *   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — auto-injected
 *   RESEND_API_KEY — used by send-email
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/send-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const STAFF_ROLES = new Set([
  "admin",
  "super_admin",
  "credit_officer",
  "finance_officer",
]);

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
    .select("id, user_email, type, title, message, link, email_sent_at")
    .eq("id", notificationId)
    .maybeSingle();

  if (notifErr) {
    console.error("load notification failed", notifErr);
    return json({ error: "Failed to load notification" }, 500);
  }
  if (!notification) {
    return json({ skipped: true, reason: "not_found" }, 200);
  }
  if (notification.email_sent_at) {
    return json({ skipped: true, reason: "already_emailed" }, 200);
  }

  const email = String(notification.user_email || "").trim().toLowerCase();
  if (!email) {
    return json({ skipped: true, reason: "no_email" }, 200);
  }

  const { data: userRow, error: userErr } = await supabase
    .from("users")
    .select("role, email")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();

  if (userErr) {
    console.error("load user role failed", userErr);
    return json({ error: "Failed to load user" }, 500);
  }

  const role = String(userRow?.role || "").trim().toLowerCase();
  if (!STAFF_ROLES.has(role)) {
    return json({ skipped: true, reason: "not_staff", role }, 200);
  }

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("email_transactional")
    .eq("user_email", email)
    .maybeSingle();

  if (prefs && prefs.email_transactional === false) {
    return json({ skipped: true, reason: "user_opted_out" }, 200);
  }

  const { portalBase, portalName, portalPrefix } = resolvePortal(role);
  const portalLink = buildPortalLink(portalBase, portalPrefix, notification.link);

  const title = String(notification.title || "BLOX update");
  const message = String(notification.message || "");

  const sendResult = await sendEmail({
    to: email,
    templateId: "staff_alert",
    userEmail: email,
    idempotencyKey: `staff-email:${notificationId}`,
    data: {
      alertTitle: title,
      alertMessage: message,
      portalLink: portalLink || undefined,
      portalName,
      title,
      message,
    },
  });

  if (!sendResult.ok) {
    return json(
      {
        ok: false,
        error: sendResult.error || "send_failed",
        notification_id: notificationId,
      },
      200,
    );
  }

  if (!sendResult.skipped) {
    await supabase
      .from("notifications")
      .update({ email_sent_at: new Date().toISOString() })
      .eq("id", notificationId);
  }

  return json({
    ok: true,
    email,
    role,
    skipped: sendResult.skipped === true,
    reason: sendResult.reason,
    portalLink: portalLink || null,
  }, 200);
});

function resolvePortal(role: string): {
  portalBase: string;
  portalName: string;
  portalPrefix: string;
} {
  if (role === "credit_officer") {
    return {
      portalBase: (
        Deno.env.get("PORTAL_URL_CREDIT") ||
        "https://blox-credit.vercel.app"
      ).replace(/\/$/, ""),
      portalName: "credit portal",
      portalPrefix: "/credit",
    };
  }
  if (role === "finance_officer") {
    return {
      portalBase: (
        Deno.env.get("PORTAL_URL_FINANCE") ||
        "https://blox-finance.vercel.app"
      ).replace(/\/$/, ""),
      portalName: "finance portal",
      portalPrefix: "/finance",
    };
  }
  return {
    portalBase: (
      Deno.env.get("PORTAL_URL_ADMIN") ||
      "https://blox-admin.vercel.app"
    ).replace(/\/$/, ""),
    portalName: "admin portal",
    portalPrefix: "/admin",
  };
}

function buildPortalLink(
  portalBase: string,
  portalPrefix: string,
  rawLink: unknown,
): string {
  if (!portalBase) return "";
  const link = typeof rawLink === "string" ? rawLink.trim() : "";
  if (!link) return portalBase + portalPrefix;
  if (/^https?:\/\//i.test(link)) return link;
  if (link.startsWith(portalPrefix + "/") || link === portalPrefix) {
    return `${portalBase}${link}`;
  }
  if (link.startsWith("/")) return `${portalBase}${portalPrefix}${link}`;
  return `${portalBase}${portalPrefix}/${link}`;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
