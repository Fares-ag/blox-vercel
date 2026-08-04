/**
 * Internal helper for edge functions to invoke the send-email function.
 *
 * Usage (from another edge function):
 *
 *   import { sendEmail } from "../_shared/send-email.ts";
 *   await sendEmail({
 *     to: customerEmail,
 *     templateId: "payment_receipt",
 *     data: { customerName, applicationId, amount, dueDate },
 *     idempotencyKey: `receipt:${transactionId}`,
 *   });
 */

import type { EmailTemplate, EmailPayload } from "./email-templates.ts";

interface SendEmailArgs {
  to: string;
  templateId: EmailTemplate;
  data?: EmailPayload;
  userEmail?: string;
  idempotencyKey?: string;
}

export interface SendEmailResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
}

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("sendEmail: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return { ok: false, error: "missing_supabase_env" };
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(args),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = body?.error ?? `send-email HTTP ${res.status}`;
      console.error(`sendEmail failed (${res.status}):`, body);
      return { ok: false, error: String(error) };
    }

    return {
      ok: true,
      skipped: body?.skipped === true,
      reason: body?.reason ? String(body.reason) : undefined,
    };
  } catch (err) {
    // Never throw — email failures must not break the calling flow.
    console.error("sendEmail network error:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
