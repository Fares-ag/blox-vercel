-- Performance indexes migration
-- These indexes exist in ad-hoc SQL scripts (supabase-optimization.sql etc.)
-- but were never applied via the migration pipeline. This migration makes them
-- official and ensures they are present in any fresh DB restore.
--
-- Apply: supabase db push (from blox-production/)
-- Verify:
--   SELECT indexname, tablename FROM pg_indexes
--   WHERE schemaname = 'public'
--   AND indexname IN (
--     'idx_perf_payment_schedules_application_id',
--     'idx_perf_payment_schedules_status',
--     'idx_perf_payment_transactions_schedule_id',
--     'idx_perf_payment_transactions_status_created',
--     'idx_perf_ledgers_application_id',
--     'idx_perf_applications_lower_email'
--   );

-- ── payment_schedules ────────────────────────────────────────────────────────

-- Used by RLS EXISTS on payment_schedules and loadScheduleRows in skipcash-payment.
CREATE INDEX IF NOT EXISTS idx_perf_payment_schedules_application_id
  ON public.payment_schedules (application_id);

-- Used by payment-monitor stuck-query and any filter by status (paid/pending/upcoming).
CREATE INDEX IF NOT EXISTS idx_perf_payment_schedules_status
  ON public.payment_schedules (status);

-- ── payment_transactions ─────────────────────────────────────────────────────

-- Used by skipcash-payment idempotency check:
--   .eq('payment_schedule_id', scheduleId).eq('status', 'pending')
CREATE INDEX IF NOT EXISTS idx_perf_payment_transactions_schedule_id
  ON public.payment_transactions (payment_schedule_id);

-- Used by payment-monitor CHECK 1 stuck-pending query:
--   .eq('status', 'pending').lt('created_at', twoHoursAgo)
CREATE INDEX IF NOT EXISTS idx_perf_payment_transactions_status_created
  ON public.payment_transactions (status, created_at DESC);

-- ── ledgers ──────────────────────────────────────────────────────────────────

-- Used after payments to look up ledger rows by application.
CREATE INDEX IF NOT EXISTS idx_perf_ledgers_application_id
  ON public.ledgers (application_id);

-- ── applications ─────────────────────────────────────────────────────────────

-- Used by RLS USING (applications.customer_email = current_user_email())
-- and by customer-scoped application queries (.eq('customer_email', ...)).
-- LOWER() expression index matches the LOWER() used in policies.
CREATE INDEX IF NOT EXISTS idx_perf_applications_lower_email
  ON public.applications (lower(customer_email));
