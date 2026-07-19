-- Customer P1 (careful):
-- 1) Blocking: include active financing; allow re-apply after completed.
-- 2) payment_transactions INSERT: require can_pay (defense in depth while payments gated).
-- Does NOT flip companies.can_pay or payment RPC return values.

CREATE OR REPLACE FUNCTION public.has_blocking_application(p_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id text;
  v_email text := lower(trim(COALESCE(p_email, '')));
BEGIN
  IF v_email = '' THEN
    RETURN NULL;
  END IF;

  SELECT a.id INTO v_id
  FROM public.applications a
  WHERE lower(trim(a.customer_email)) = v_email
    AND a.status IN (
      'active',
      'under_review',
      'contract_signing_required',
      'resubmission_required',
      'contracts_submitted',
      'contract_under_review',
      'down_payment_required',
      'down_payment_submitted'
    )
  ORDER BY a.created_at DESC NULLS LAST
  LIMIT 1;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.has_blocking_application(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_blocking_application(text) TO anon;
GRANT EXECUTE ON FUNCTION public.has_blocking_application(text) TO authenticated;

COMMENT ON FUNCTION public.has_blocking_application(text) IS
  'Returns latest blocking application id for email (in-progress or active). Completed does not block.';

-- Tighten customer bank-transfer insert: must own app AND pass can_pay RPC.
DROP POLICY IF EXISTS "Users can create payment transactions" ON public.payment_transactions;

CREATE POLICY "Users can create payment transactions"
ON public.payment_transactions
FOR INSERT
WITH CHECK (
  (SELECT is_admin() AS is_admin)
  OR (
    (SELECT auth.role() AS role) = 'authenticated'::text
    AND (status)::text = 'pending'::text
    AND public.current_user_can_pay_for_application(application_id)
    AND EXISTS (
      SELECT 1
      FROM applications a
      WHERE a.id = payment_transactions.application_id
        AND lower((a.customer_email)::text) = lower((SELECT current_user_email() AS current_user_email))
    )
  )
);
