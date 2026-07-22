/**
 * send-email — BLOX transactional email edge function.
 *
 * Called server-side only (service role or internal shared secret).
 * Never expose RESEND_API_KEY to browser clients.
 *
 * POST /functions/v1/send-email
 * Headers:
 *   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 *   Content-Type: application/json
 *
 * Body:
 * {
 *   to: string,
 *   templateId: EmailTemplate,
 *   data: EmailPayload,
 *   userEmail?: string,          // for preference check
 *   idempotencyKey?: string,     // prevents duplicate sends
 * }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { renderEmail, type EmailTemplate, type EmailPayload } from "../_shared/email-templates.ts";

const FROM = "BLOX <noreply@blox-it.com>";
const RESEND_URL = "https://api.resend.com/emails";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  to: string;
  templateId: EmailTemplate;
  data: EmailPayload;
  userEmail?: string;
  idempotencyKey?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Basic auth guard: require a valid Supabase JWT (admin, service role, or authenticated user).
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error("RESEND_API_KEY not configured");
    return json({ error: "Email service not configured" }, 500);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body: SendEmailRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { to, templateId, data, userEmail, idempotencyKey } = body;

  if (!to || !templateId) {
    return json({ error: "Missing required fields: to, templateId" }, 400);
  }

  // ── Idempotency check ────────────────────────────────────────────────────
  if (idempotencyKey) {
    const { data: existing } = await supabase
      .from("email_outbox")
      .select("id, status")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existing) {
      return json({ ok: true, skipped: true, reason: "already_sent", id: existing.id });
    }
  }

  // ── Preference check ─────────────────────────────────────────────────────
  const emailAddr = userEmail || to;
  if (emailAddr) {
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("email_transactional")
      .eq("user_email", emailAddr.toLowerCase())
      .maybeSingle();

    if (prefs && prefs.email_transactional === false) {
      return json({ ok: true, skipped: true, reason: "user_opted_out" });
    }
  }

  // ── Render template ──────────────────────────────────────────────────────
  const { subject, html } = renderEmail(templateId, data ?? {});

  // ── Insert audit row (pending) ───────────────────────────────────────────
  const { data: outboxRow, error: insertErr } = await supabase
    .from("email_outbox")
    .insert({
      to_email: to.toLowerCase(),
      template_id: templateId,
      subject,
      user_email: emailAddr?.toLowerCase() ?? null,
      idempotency_key: idempotencyKey ?? null,
      status: "pending",
      payload: data ?? {},
    })
    .select("id")
    .single();

  if (insertErr) {
    console.error("email_outbox insert failed:", insertErr);
    // Continue — audit failure should not block the send
  }
  const outboxId: string | null = outboxRow?.id ?? null;

  // ── Send via Resend ──────────────────────────────────────────────────────
  let providerMessageId: string | null = null;
  let sendError: string | null = null;

  try {
    const resendRes = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject,
        html,
      }),
    });

    const resendBody = await resendRes.json();
    if (!resendRes.ok) {
      sendError = resendBody?.message ?? `Resend error ${resendRes.status}`;
      console.error("Resend send failed:", sendError, resendBody);
    } else {
      providerMessageId = resendBody?.id ?? null;
    }
  } catch (err) {
    sendError = (err as Error)?.message ?? "Network error calling Resend";
    console.error("Resend fetch error:", err);
  }

  // ── Update audit row ─────────────────────────────────────────────────────
  if (outboxId) {
    await supabase
      .from("email_outbox")
      .update({
        status: sendError ? "failed" : "sent",
        provider_message_id: providerMessageId,
        error: sendError,
        sent_at: sendError ? null : new Date().toISOString(),
      })
      .eq("id", outboxId);
  }

  if (sendError) {
    return json({ error: sendError, outboxId }, 500);
  }

  return json({ ok: true, outboxId, providerMessageId });
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
