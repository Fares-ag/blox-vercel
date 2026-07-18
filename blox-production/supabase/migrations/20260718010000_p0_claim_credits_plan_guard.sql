-- =============================================================================
-- P0: Credit claim ownership + no credit_history dependency
--     Customer cannot rewrite installment_plan
--     Revoke dangerous anon EXECUTE on money RPCs
--     Baseline status-transition function (idempotent; already live)
-- =============================================================================

-- 1) Persist payer on payment_transactions for credit top-up ownership
ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS payer_email text;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_payer_email
  ON public.payment_transactions (lower(payer_email));

-- Customers may only insert pending rows for their own applications
DROP POLICY IF EXISTS "Users can create payment transactions" ON public.payment_transactions;
CREATE POLICY "Users can create payment transactions"
  ON public.payment_transactions
  FOR INSERT
  TO public
  WITH CHECK (
    (SELECT public.is_admin())
    OR (
      (SELECT auth.role()) = 'authenticated'
      AND status = 'pending'
      AND EXISTS (
        SELECT 1
        FROM public.applications a
        WHERE a.id = payment_transactions.application_id
          AND lower(a.customer_email) = lower((SELECT public.current_user_email()))
      )
    )
  );

-- 2) Rewrite claim RPC: credit_transactions only, bind to payer/owner
CREATE OR REPLACE FUNCTION public.customer_claim_payment_credits(
  p_transaction_id text
)
RETURNS TABLE (
  success boolean,
  message text,
  credits_added integer,
  new_balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_email text;
  v_payment_record public.payment_transactions%ROWTYPE;
  v_credits_to_add integer;
  v_current_balance numeric;
  v_new_balance numeric;
  v_owner_email text;
BEGIN
  v_user_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  IF v_user_email = '' THEN
    RETURN QUERY SELECT false, 'Not authenticated'::text, 0, 0::numeric;
    RETURN;
  END IF;

  IF p_transaction_id IS NULL OR p_transaction_id NOT LIKE 'CREDIT-%' THEN
    RETURN QUERY SELECT false, 'Not a credit top-up transaction'::text, 0, 0::numeric;
    RETURN;
  END IF;

  SELECT * INTO v_payment_record
  FROM public.payment_transactions pt
  WHERE pt.transaction_id = p_transaction_id
  LIMIT 1
  FOR UPDATE;

  IF v_payment_record.id IS NULL THEN
    RETURN QUERY SELECT false, 'Payment transaction not found'::text, 0, 0::numeric;
    RETURN;
  END IF;

  IF v_payment_record.status <> 'completed' THEN
    RETURN QUERY SELECT false,
      ('Payment not completed. Status: ' || v_payment_record.status)::text,
      0, 0::numeric;
    RETURN;
  END IF;

  -- Resolve owner: payer_email (preferred) or application customer_email
  v_owner_email := lower(nullif(trim(coalesce(v_payment_record.payer_email, '')), ''));
  IF v_owner_email IS NULL AND v_payment_record.application_id IS NOT NULL THEN
    SELECT lower(a.customer_email) INTO v_owner_email
    FROM public.applications a
    WHERE a.id = v_payment_record.application_id
    LIMIT 1;
  END IF;

  IF v_owner_email IS NULL OR v_owner_email <> v_user_email THEN
    RETURN QUERY SELECT false, 'Not authorized to claim this payment'::text, 0, 0::numeric;
    RETURN;
  END IF;

  v_credits_to_add := floor(v_payment_record.amount)::integer;
  IF v_credits_to_add IS NULL OR v_credits_to_add <= 0 THEN
    RETURN QUERY SELECT false, 'Invalid credit amount'::text, 0, 0::numeric;
    RETURN;
  END IF;

  -- Idempotency via credit_transactions (webhook or prior claim)
  IF EXISTS (
    SELECT 1
    FROM public.credit_transactions ct
    WHERE lower(ct.user_email) = v_user_email
      AND (
        ct.payment_transaction_id = p_transaction_id
        OR ct.description ILIKE '%' || p_transaction_id || '%'
      )
  ) THEN
    SELECT coalesce(balance, 0) INTO v_current_balance
    FROM public.user_credits
    WHERE lower(user_email) = v_user_email;
    RETURN QUERY SELECT true, 'Credits already added'::text, 0, coalesce(v_current_balance, 0::numeric);
    RETURN;
  END IF;

  INSERT INTO public.user_credits (user_email, balance, updated_at)
  VALUES (v_user_email, 0, now())
  ON CONFLICT (user_email) DO NOTHING;

  SELECT coalesce(balance, 0) INTO v_current_balance
  FROM public.user_credits
  WHERE lower(user_email) = v_user_email
  FOR UPDATE;

  v_new_balance := coalesce(v_current_balance, 0) + v_credits_to_add;

  UPDATE public.user_credits
  SET balance = v_new_balance,
      updated_at = now()
  WHERE lower(user_email) = v_user_email;

  INSERT INTO public.credit_transactions (
    user_email,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    description,
    admin_email,
    payment_transaction_id,
    created_at
  ) VALUES (
    v_user_email,
    'add',
    v_credits_to_add,
    coalesce(v_current_balance, 0),
    v_new_balance,
    format(
      'Credit top-up via payment. Transaction ID: %s, Payment ID: %s',
      p_transaction_id,
      coalesce(v_payment_record.skipcash_payment_id, '')
    ),
    null,
    p_transaction_id,
    now()
  );

  RETURN QUERY SELECT true, 'Credits added successfully'::text, v_credits_to_add, v_new_balance;
END;
$$;

COMMENT ON FUNCTION public.customer_claim_payment_credits(text) IS
  'Claim credits from completed CREDIT-* payment. Owner-bound via payer_email/application; idempotent via credit_transactions.';

REVOKE ALL ON FUNCTION public.customer_claim_payment_credits(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.customer_claim_payment_credits(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.customer_claim_payment_credits(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_claim_payment_credits(text) TO service_role;

-- 3) Block non-admin clients from rewriting installment_plan / ownership money fields
CREATE OR REPLACE FUNCTION public.enforce_customer_application_field_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.installment_plan IS DISTINCT FROM OLD.installment_plan THEN
    RAISE EXCEPTION 'Customers cannot modify installment_plan';
  END IF;

  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'Customers cannot modify company_id';
  END IF;

  IF NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id THEN
    RAISE EXCEPTION 'Customers cannot modify vehicle_id';
  END IF;

  IF NEW.customer_email IS DISTINCT FROM OLD.customer_email THEN
    RAISE EXCEPTION 'Customers cannot modify customer_email';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_customer_application_field_guard ON public.applications;
CREATE TRIGGER trg_enforce_customer_application_field_guard
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_customer_application_field_guard();

-- 4) Baseline status transition function (idempotent mirror of live FIX_BACKEND)
CREATE OR REPLACE FUNCTION public.enforce_application_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor text;
  v_ok boolean := false;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF public.is_admin() THEN
    v_actor := 'admin';
  ELSIF (SELECT auth.role()) = 'authenticated'
        AND lower(NEW.customer_email) = lower(public.current_user_email()) THEN
    v_actor := 'customer';
  ELSE
    IF COALESCE(auth.jwt() ->> 'role', '') = 'service_role' THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Unauthorized status transition';
  END IF;

  IF v_actor = 'customer' AND lower(NEW.customer_email) IS DISTINCT FROM lower(OLD.customer_email) THEN
    RAISE EXCEPTION 'Customers cannot change application ownership';
  END IF;

  IF v_actor = 'customer' THEN
    v_ok := CASE OLD.status
      WHEN 'draft' THEN NEW.status IN ('under_review', 'submission_cancelled')
      WHEN 'resubmission_required' THEN NEW.status IN ('under_review')
      WHEN 'contract_signing_required' THEN NEW.status IN ('contracts_submitted', 'submission_cancelled')
      WHEN 'under_review' THEN NEW.status IN ('submission_cancelled')
      WHEN 'down_payment_required' THEN NEW.status IN ('submission_cancelled')
      ELSE false
    END;
  ELSE
    v_ok := CASE OLD.status
      WHEN 'draft' THEN NEW.status IN ('under_review', 'active', 'rejected', 'submission_cancelled')
      WHEN 'under_review' THEN NEW.status IN ('contract_signing_required', 'resubmission_required', 'rejected', 'active', 'submission_cancelled')
      WHEN 'resubmission_required' THEN NEW.status IN ('under_review', 'rejected', 'submission_cancelled')
      WHEN 'contract_signing_required' THEN NEW.status IN ('contracts_submitted', 'resubmission_required', 'rejected', 'under_review')
      WHEN 'contracts_submitted' THEN NEW.status IN ('contract_under_review', 'active', 'contract_signing_required', 'rejected', 'resubmission_required')
      WHEN 'contract_under_review' THEN NEW.status IN ('active', 'contract_signing_required', 'rejected', 'down_payment_required')
      WHEN 'down_payment_required' THEN NEW.status IN ('down_payment_submitted', 'active', 'rejected')
      WHEN 'down_payment_submitted' THEN NEW.status IN ('active', 'rejected', 'down_payment_required')
      WHEN 'active' THEN NEW.status IN ('completed', 'submission_cancelled')
      WHEN 'rejected' THEN NEW.status IN ('under_review')
      WHEN 'completed' THEN false
      WHEN 'submission_cancelled' THEN NEW.status IN ('under_review')
      ELSE false
    END;
  END IF;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'Illegal status transition for %: % → %', v_actor, OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_application_status_transition ON public.applications;
CREATE TRIGGER trg_enforce_application_status_transition
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_application_status_transition();

-- 5) Revoke anon EXECUTE on selected money / privileged RPCs (keep authenticated)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'customer_claim_payment_credits',
        'customer_pay_installment_with_credits',
        'current_user_can_pay_for_application',
        'current_user_can_pay_for_any_application',
        'create_application_after_signup',
        'get_dashboard_stats',
        'get_conversion_funnel',
        'get_customer_lifetime_value',
        'get_payment_collection_rates',
        'get_revenue_forecast',
        'admin_add_user_credits',
        'admin_subtract_user_credits',
        'admin_set_user_credits'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
  END LOOP;
END $$;

-- Keep phone lookup usable pre-login (anon) but not admin credit mutators
GRANT EXECUTE ON FUNCTION public.get_email_by_phone(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_application_after_signup(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_pay_installment_with_credits(text, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_can_pay_for_application(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_can_pay_for_any_application() TO authenticated;
