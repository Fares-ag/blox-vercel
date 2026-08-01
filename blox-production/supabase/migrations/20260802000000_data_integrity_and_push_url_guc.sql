-- Production data integrity + push trigger URL GUC (2026-08-02)
--
-- Fixes:
--   1. applications.company_id NULL → inherit from products.company_id (vehicle partner)
--   2. paid payment_schedules missing payment_transactions → idempotent backfill
--   3. abandoned pending card initiations (>2h, no SkipCash id) → cancelled
--   4. app.supabase_url GUC for push-notify / payment-reminders triggers
--
-- Push GUCs require Dashboard SQL Editor (postgres role) — see scripts/setup-push-production.sql:
--   ALTER DATABASE postgres SET app.supabase_url = 'https://zqwsxewuppexvjyakuqf.supabase.co';
--   ALTER DATABASE postgres SET app.service_role_key = '<SERVICE_ROLE_KEY>';

-- ── 1) Stamp company on INSERT *and* UPDATE when vehicle set but company null ─
CREATE OR REPLACE FUNCTION public.stamp_application_company_from_vehicle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.company_id IS NULL AND NEW.vehicle_id IS NOT NULL THEN
    SELECT p.company_id INTO NEW.company_id
    FROM public.products p
    WHERE p.id = NEW.vehicle_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_application_company ON public.applications;
CREATE TRIGGER trg_stamp_application_company
  BEFORE INSERT OR UPDATE OF vehicle_id, company_id ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.stamp_application_company_from_vehicle();

-- ── 2) Backfill existing NULL company_id from vehicle partner ────────────────
ALTER TABLE public.applications DISABLE TRIGGER trg_enforce_customer_application_field_guard;

UPDATE public.applications a
SET    company_id = p.company_id,
       updated_at = GREATEST(a.updated_at, now())
FROM   public.products p
WHERE  a.company_id IS NULL
  AND  a.vehicle_id IS NOT NULL
  AND  p.id = a.vehicle_id
  AND  p.company_id IS NOT NULL;

ALTER TABLE public.applications ENABLE TRIGGER trg_enforce_customer_application_field_guard;

-- ── 3) Backfill payment_transactions for paid schedules (idempotent) ─────────
INSERT INTO public.payment_transactions (
  payment_schedule_id,
  application_id,
  amount,
  method,
  status,
  completed_at,
  payer_email,
  created_at
)
SELECT
  ps.id,
  ps.application_id,
  COALESCE(ps.paid_amount, ps.amount),
  'bank_transfer',
  'completed',
  COALESCE(ps.paid_date, ps.updated_at, now()),
  a.customer_email,
  COALESCE(ps.paid_date, ps.updated_at, now())
FROM   public.payment_schedules ps
JOIN   public.applications a ON a.id = ps.application_id
WHERE  ps.status = 'paid'
  AND  NOT EXISTS (
    SELECT 1
    FROM   public.payment_transactions pt
    WHERE  pt.payment_schedule_id = ps.id
  );

-- ── 4) Cancel abandoned pending card rows (never reached SkipCash) ───────────
UPDATE public.payment_transactions
SET    status = 'cancelled',
       failure_reason = COALESCE(
         NULLIF(trim(failure_reason), ''),
         'Auto-cancelled: abandoned pending initiation (>2h, no SkipCash payment id)'
       )
WHERE  status = 'pending'
  AND  created_at < now() - interval '2 hours'
  AND  (skipcash_payment_id IS NULL OR trim(skipcash_payment_id) = '');

-- ── 5) Fail very old pending rows that have SkipCash id but never completed ───
UPDATE public.payment_transactions
SET    status = 'failed',
       failure_reason = COALESCE(
         NULLIF(trim(failure_reason), ''),
         'Auto-failed: pending >48h with no completion webhook'
       )
WHERE  status IN ('pending', 'processing')
  AND  created_at < now() - interval '48 hours'
  AND  skipcash_payment_id IS NOT NULL
  AND  trim(skipcash_payment_id) <> '';

-- ── Verify ───────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_null_company int;
  v_orphan_paid  int;
  v_stale_pending int;
BEGIN
  SELECT COUNT(*) INTO v_null_company
  FROM public.applications
  WHERE company_id IS NULL
    AND status NOT IN ('draft', 'cancelled');

  SELECT COUNT(*) INTO v_orphan_paid
  FROM public.payment_schedules ps
  WHERE ps.status = 'paid'
    AND NOT EXISTS (
      SELECT 1 FROM public.payment_transactions pt
      WHERE pt.payment_schedule_id = ps.id
    );

  SELECT COUNT(*) INTO v_stale_pending
  FROM public.payment_transactions
  WHERE status = 'pending'
    AND created_at < now() - interval '30 minutes';

  RAISE NOTICE 'data_integrity: null_company=%, orphan_paid=%, stale_pending=%',
    v_null_company, v_orphan_paid, v_stale_pending;
END;
$$;
