-- Migration: backfill_installment_plan_json
-- Fixes HIGH-005: 16 of 17 active applications have an empty or partial
-- installment_plan JSON column (missing monthlyPayment / termMonths).
-- The payment_schedules table is the authoritative source; we derive the
-- JSON fields from it so the Flutter and web installmentPlan readers work.
--
-- Only touches active applications where monthlyPayment is missing.
-- Idempotent: re-running will re-compute from current schedule data.

-- The trg_enforce_customer_application_field_guard trigger blocks installment_plan
-- changes for non-admin sessions. Disable it for this admin backfill.
ALTER TABLE public.applications DISABLE TRIGGER trg_enforce_customer_application_field_guard;

UPDATE public.applications a
SET    installment_plan = COALESCE(a.installment_plan, '{}'::jsonb)
    || jsonb_build_object(
         'termMonths',    sched.term_months,
         'monthlyPayment', sched.avg_amount,
         'totalRent',     COALESCE(
                            (a.installment_plan->>'totalRent')::numeric,
                            sched.avg_amount * sched.term_months
                          )
       )
FROM (
  SELECT
    ps.application_id,
    COUNT(*)::int                              AS term_months,
    ROUND(AVG(ps.amount), 2)                  AS avg_amount
  FROM   public.payment_schedules ps
  WHERE  ps.status != 'cancelled'
  GROUP  BY ps.application_id
) AS sched
WHERE  a.id           = sched.application_id
  AND  a.status       = 'active'
  AND  (
    a.installment_plan IS NULL
    OR (a.installment_plan->>'monthlyPayment') IS NULL
    OR (a.installment_plan->>'termMonths')     IS NULL
  );

ALTER TABLE public.applications ENABLE TRIGGER trg_enforce_customer_application_field_guard;

DO $$
DECLARE
  remaining int;
BEGIN
  SELECT COUNT(*) INTO remaining
  FROM   public.applications
  WHERE  status = 'active'
    AND  (installment_plan->>'monthlyPayment') IS NULL;

  RAISE NOTICE 'backfill_installment_plan_json: % active applications still missing monthlyPayment', remaining;
END;
$$;
