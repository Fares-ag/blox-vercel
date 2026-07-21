-- Ops reconciliation helpers (read-only views for stuck / orphan payments)

CREATE OR REPLACE VIEW public.ops_payments_stuck_pending AS
SELECT
  pt.id,
  pt.transaction_id,
  pt.skipcash_payment_id,
  pt.application_id,
  pt.amount,
  pt.status,
  pt.payer_email,
  pt.created_at,
  pt.completed_at,
  pt.ledger_applied_at
FROM public.payment_transactions pt
WHERE pt.status = 'pending'
  AND pt.created_at < now() - interval '2 hours'
ORDER BY pt.created_at ASC;

CREATE OR REPLACE VIEW public.ops_payments_completed_not_applied AS
SELECT
  pt.id,
  pt.transaction_id,
  pt.skipcash_payment_id,
  pt.application_id,
  pt.amount,
  pt.status,
  pt.payer_email,
  pt.completed_at,
  pt.ledger_applied_at
FROM public.payment_transactions pt
WHERE pt.status = 'completed'
  AND pt.ledger_applied_at IS NULL
ORDER BY pt.completed_at ASC NULLS LAST;

CREATE OR REPLACE VIEW public.ops_credit_topups_missing_ledger AS
SELECT
  pt.id,
  pt.transaction_id,
  pt.amount,
  pt.payer_email,
  pt.status,
  pt.completed_at,
  pt.ledger_applied_at
FROM public.payment_transactions pt
WHERE pt.transaction_id LIKE 'CREDIT-%'
  AND pt.status = 'completed'
  AND NOT EXISTS (
    SELECT 1
    FROM public.credit_transactions ct
    WHERE ct.payment_transaction_id = pt.transaction_id
       OR ct.description ILIKE '%' || pt.transaction_id || '%'
  )
ORDER BY pt.completed_at ASC NULLS LAST;

COMMENT ON VIEW public.ops_payments_stuck_pending IS
  'Pending card txns older than 2h — reconcile vs SkipCash dashboard';
COMMENT ON VIEW public.ops_payments_completed_not_applied IS
  'Completed but ledger_applied_at null — re-run complete_skipcash_payment';
COMMENT ON VIEW public.ops_credit_topups_missing_ledger IS
  'CREDIT-* completed without credit_transactions row';

-- Restrict to service_role / admins via grants (views inherit table RLS poorly; revoke public)
REVOKE ALL ON public.ops_payments_stuck_pending FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.ops_payments_completed_not_applied FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.ops_credit_topups_missing_ledger FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.ops_payments_stuck_pending TO service_role;
GRANT SELECT ON public.ops_payments_completed_not_applied TO service_role;
GRANT SELECT ON public.ops_credit_topups_missing_ledger TO service_role;
