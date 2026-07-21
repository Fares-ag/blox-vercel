-- Migration: wire_ledger_writes_on_payment
-- Fixes HIGH-006: ledgers table is never populated.
-- Adds a DB trigger on payment_schedules: whenever a row transitions to
-- status='paid' for the first time, a ledger entry is inserted automatically.
-- This works for ALL payment paths: SkipCash webhook, admin mark-paid, and
-- credits RPC — no application code changes required.

-- Trigger function: insert a ledger entry when a schedule is marked paid
CREATE OR REPLACE FUNCTION public.ledger_on_schedule_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only fire when status transitions TO 'paid' (not on subsequent updates)
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    INSERT INTO public.ledgers (
      transaction_type,
      amount,
      description,
      application_id,
      date,
      status
    ) VALUES (
      'payment',
      COALESCE(NEW.paid_amount, NEW.amount),
      'Installment paid — schedule ' || NEW.id::text,
      NEW.application_id,
      CURRENT_DATE,
      'posted'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger (drop first to keep migration idempotent)
DROP TRIGGER IF EXISTS trg_ledger_on_schedule_paid ON public.payment_schedules;

CREATE TRIGGER trg_ledger_on_schedule_paid
AFTER UPDATE OF status ON public.payment_schedules
FOR EACH ROW
EXECUTE FUNCTION public.ledger_on_schedule_paid();

-- Back-fill existing paid schedules into ledgers (one-time, idempotent)
INSERT INTO public.ledgers (
  transaction_type,
  amount,
  description,
  application_id,
  date,
  status
)
SELECT
  'payment'                                                AS transaction_type,
  COALESCE(ps.paid_amount, ps.amount)                     AS amount,
  'Backfill — installment paid ' || ps.id::text           AS description,
  ps.application_id                                       AS application_id,
  COALESCE(ps.paid_date::date, ps.updated_at::date, CURRENT_DATE) AS date,
  'posted'                                                AS status
FROM   public.payment_schedules ps
WHERE  ps.status = 'paid'
  AND  NOT EXISTS (
    SELECT 1
    FROM   public.ledgers l
    WHERE  l.description LIKE '%' || ps.id::text || '%'
  );

DO $$
DECLARE ledger_count int;
BEGIN
  SELECT COUNT(*) INTO ledger_count FROM public.ledgers;
  RAISE NOTICE 'wire_ledger_writes_on_payment: ledgers now has % rows', ledger_count;
END;
$$;
