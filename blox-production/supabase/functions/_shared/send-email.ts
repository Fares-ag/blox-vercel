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

export async function sendEmail(args: SendEmailArgs): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("sendEmail: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return;
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

    if (!res.ok) {
      const body = await res.text();
      console.error(`sendEmail failed (${res.status}):`, body);
    }
  } catch (err) {
    // Never throw — email failures must not break the calling flow.
    console.error("sendEmail network error:", err);
  }
}
