-- ─────────────────────────────────────────────────────────────────────────────
-- BLOX Payment Reminders Cron Job
-- Schedules payment-reminders edge function to run daily at 07:00 UTC
-- (10:00 AM Qatar Standard Time, UTC+3).
--
-- Requires: pg_cron and pg_net extensions (enabled by default on Supabase).
-- The service role key and project URL must be set as GUC settings if you
-- want this to call the edge function directly from pg_cron.
--
-- Alternative: use a GitHub Actions workflow on schedule: [cron: '0 7 * * *']
-- to POST to $SUPABASE_URL/functions/v1/payment-reminders.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable required extensions (no-op if already enabled).
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove old schedule if it exists (idempotent).
SELECT cron.unschedule('blox-payment-reminders-daily') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'blox-payment-reminders-daily'
);

-- Schedule daily at 07:00 UTC.
-- The edge function URL is built from the SUPABASE_URL GUC; set it via:
--   ALTER DATABASE postgres SET app.supabase_url = 'https://<ref>.supabase.co';
--   ALTER DATABASE postgres SET app.service_role_key = '<key>';
-- These are write-once ops via Supabase dashboard SQL editor.
DO $$
BEGIN
  PERFORM cron.schedule(
    'blox-payment-reminders-daily',
    '0 7 * * *',
    $job$
    SELECT net.http_post(
      url        := current_setting('app.supabase_url', true) || '/functions/v1/payment-reminders',
      headers    := jsonb_build_object(
                      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true),
                      'Content-Type',  'application/json'
                    ),
      body       := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
    $job$
  );
EXCEPTION WHEN OTHERS THEN
  -- cron.schedule raises if job already exists with same name; ignore.
  NULL;
END
$$;
