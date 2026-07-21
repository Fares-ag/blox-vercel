-- Migration: backfill_payment_transactions
-- Fixes HIGH-001: 193 paid payment_schedules have no backing payment_transactions
-- record. These are legitimate historical bank payments confirmed by admin before
-- the payment_transactions table was introduced in the platform.
--
-- Creates retroactive payment_transactions rows so that:
--   1. Reconciliation reports show accurate collected amounts.
--   2. The admin audit trail has a record for each paid installment.
--   3. Future queries joining payment_schedules ↔ payment_transactions work.
--
-- Safe to run multiple times (NOT EXISTS guard makes it idempotent).

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
  ps.id                  AS payment_schedule_id,
  ps.application_id      AS application_id,
  ps.amount              AS amount,
  'bank_transfer'        AS method,
  'completed'            AS status,
  COALESCE(ps.paid_date, ps.updated_at, now()) AS completed_at,
  a.customer_email       AS payer_email,
  COALESCE(ps.paid_date, ps.updated_at, now()) AS created_at
FROM   public.payment_schedules ps
JOIN   public.applications      a  ON a.id = ps.application_id
WHERE  ps.status = 'paid'
  AND  NOT EXISTS (
    SELECT 1
    FROM   public.payment_transactions pt
    WHERE  pt.payment_schedule_id = ps.id
  );

-- Verify backfill
DO $$
DECLARE
  orphan_count int;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM   public.payment_schedules ps
  WHERE  ps.status = 'paid'
    AND  NOT EXISTS (
      SELECT 1 FROM public.payment_transactions pt
      WHERE  pt.payment_schedule_id = ps.id
    );

  IF orphan_count > 0 THEN
    RAISE WARNING 'backfill_payment_transactions: % orphaned paid schedules remain', orphan_count;
  ELSE
    RAISE NOTICE 'backfill_payment_transactions: all paid schedules now have a transaction record';
  END IF;
END;
$$;
