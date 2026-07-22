/**
 * payment-reminders — daily cron job for installment payment reminders.
 *
 * Sends emails for:
 *   T-3  days  → "reminder_3_days"
 *   T-0  (today) → "reminder_due_today"
 *   T+1  day   → "overdue_gentle"
 *   T+7  days  → "overdue_firm"
 *
 * Idempotency key: `reminder:{schedule_id}:{window}` prevents duplicate sends
 * even if the cron fires multiple times in a day.
 *
 * Trigger this function daily via Supabase cron (pg_cron):
 *   SELECT cron.schedule(
 *     'payment-reminders-daily',
 *     '0 7 * * *',
 *     $$SELECT net.http_post(
 *       url := 'https://<project>.supabase.co/functions/v1/payment-reminders',
 *       headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>", "Content-Type": "application/json"}'::jsonb,
 *       body := '{}'::jsonb
 *     )$$
 *   );
 *
 * Or via GitHub Actions workflow calling:
 *   curl -X POST "$SUPABASE_URL/functions/v1/payment-reminders" \
 *        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/send-email.ts";
import type { EmailTemplate } from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScheduleRow {
  id: string;
  due_date: string;
  amount: number;
  application_id: string;
  customer_email: string;
  customer_name: string | null;
  vehicle_name: string | null;
}

type ReminderWindow = "3_days" | "due_today" | "overdue_1" | "overdue_7";

function windowsForDate(today: Date): Array<{ window: ReminderWindow; templateId: EmailTemplate; daysOffset: number }> {
  return [
    { window: "3_days",    templateId: "reminder_3_days",    daysOffset: 3  },
    { window: "due_today", templateId: "reminder_due_today", daysOffset: 0  },
    { window: "overdue_1", templateId: "overdue_gentle",     daysOffset: -1 },
    { window: "overdue_7", templateId: "overdue_firm",       daysOffset: -7 },
  ];
}

function dateFor(today: Date, daysOffset: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const windows = windowsForDate(today);
  const results: Record<string, { sent: number; skipped: number; failed: number }> = {};

  for (const { window, templateId, daysOffset } of windows) {
    const targetDate = dateFor(today, daysOffset);
    results[window] = { sent: 0, skipped: 0, failed: 0 };

    // Fetch unpaid schedules due on targetDate, joined to application and customer info.
    const { data: schedules, error } = await supabase
      .from("payment_schedules")
      .select(`
        id,
        due_date,
        amount,
        application_id,
        applications!inner (
          customer_email,
          customer_name,
          product_id,
          products ( name )
        )
      `)
      .eq("status", "pending")
      .eq("due_date", targetDate)
      .not("applications.customer_email", "is", null);

    if (error) {
      console.error(`[payment-reminders] Query failed for window=${window}:`, error);
      continue;
    }

    for (const row of (schedules ?? []) as any[]) {
      const app = row.applications;
      const customerEmail: string = app?.customer_email;
      if (!customerEmail) continue;

      const idempotencyKey = `reminder:${row.id}:${window}`;

      try {
        await sendEmail({
          to: customerEmail.toLowerCase(),
          templateId,
          data: {
            applicationId: row.application_id,
            customerName: app?.customer_name ?? undefined,
            vehicleName: app?.products?.name ?? undefined,
            amount: row.amount,
            dueDate: row.due_date,
          },
          userEmail: customerEmail.toLowerCase(),
          idempotencyKey,
        });
        results[window].sent++;
      } catch (err) {
        console.error(`[payment-reminders] sendEmail failed for schedule=${row.id}:`, err);
        results[window].failed++;
      }
    }
  }

  return new Response(
    JSON.stringify({ ok: true, date: today.toISOString().split("T")[0], results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  );
});
