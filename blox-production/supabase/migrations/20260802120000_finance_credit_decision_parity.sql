-- Finance: credit decision parity + money ops
-- 1) finance_officer status matrix = credit decisions + activation
-- 2) finance may UPDATE application_settlements (approve/reject)
-- 3) credit adjust RPCs allow finance_officer

-- ── 1) Status transition enforcement ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_application_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor text;
  v_role text;
  v_ok boolean := false;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF COALESCE(auth.jwt() ->> 'role', '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  v_role := public.current_user_role();

  IF public.is_admin() THEN
    v_actor := 'admin';
  ELSIF v_role = 'credit_officer' THEN
    v_actor := 'credit_officer';
  ELSIF v_role = 'finance_officer' THEN
    v_actor := 'finance_officer';
  ELSIF v_role = 'dealer_agent' THEN
    v_actor := 'dealer_agent';
  ELSIF (SELECT auth.role()) = 'authenticated'
        AND lower(NEW.customer_email) = lower(public.current_user_email()) THEN
    v_actor := 'customer';
  ELSE
    RAISE EXCEPTION 'Unauthorized status transition';
  END IF;

  IF v_actor = 'customer' AND lower(NEW.customer_email) IS DISTINCT FROM lower(OLD.customer_email) THEN
    RAISE EXCEPTION 'Customers cannot change application ownership';
  END IF;

  IF NEW.status = 'under_review'
     AND OLD.status IN ('draft', 'resubmission_required')
     AND NEW.submitted_at IS NULL THEN
    NEW.submitted_at := now();
    NEW.submitted_by := auth.uid();
  END IF;

  IF v_actor = 'customer' THEN
    v_ok := CASE OLD.status
      WHEN 'draft' THEN NEW.status IN ('under_review', 'submission_cancelled')
      WHEN 'resubmission_required' THEN NEW.status IN ('under_review')
      WHEN 'contract_signing_required' THEN NEW.status IN ('contracts_submitted', 'submission_cancelled')
      WHEN 'under_review' THEN NEW.status IN ('submission_cancelled')
      WHEN 'down_payment_required' THEN NEW.status IN ('submission_cancelled')
      WHEN 'pending_finance_activation' THEN NEW.status IN ('submission_cancelled')
      ELSE false
    END;
  ELSIF v_actor = 'dealer_agent' THEN
    v_ok := CASE OLD.status
      WHEN 'draft' THEN NEW.status IN ('under_review', 'submission_cancelled')
      WHEN 'resubmission_required' THEN NEW.status IN ('under_review')
      ELSE false
    END;
  ELSIF v_actor = 'credit_officer' THEN
    v_ok := CASE OLD.status
      WHEN 'under_review' THEN NEW.status IN (
        'contract_signing_required', 'resubmission_required', 'rejected',
        'pending_finance_activation', 'submission_cancelled'
      )
      WHEN 'resubmission_required' THEN NEW.status IN ('under_review', 'rejected', 'submission_cancelled')
      WHEN 'contract_signing_required' THEN NEW.status IN (
        'contracts_submitted', 'resubmission_required', 'rejected', 'under_review'
      )
      WHEN 'contracts_submitted' THEN NEW.status IN (
        'contract_under_review', 'pending_finance_activation',
        'contract_signing_required', 'rejected', 'resubmission_required'
      )
      WHEN 'contract_under_review' THEN NEW.status IN (
        'pending_finance_activation', 'contract_signing_required',
        'rejected', 'down_payment_required'
      )
      WHEN 'down_payment_required' THEN NEW.status IN (
        'down_payment_submitted', 'pending_finance_activation', 'rejected'
      )
      WHEN 'down_payment_submitted' THEN NEW.status IN (
        'pending_finance_activation', 'rejected', 'down_payment_required'
      )
      WHEN 'rejected' THEN NEW.status IN ('under_review')
      ELSE false
    END;
  ELSIF v_actor = 'finance_officer' THEN
    -- Credit decision parity + activation (never merge roles; credit still cannot → active)
    v_ok := CASE OLD.status
      WHEN 'under_review' THEN NEW.status IN (
        'contract_signing_required', 'resubmission_required', 'rejected',
        'pending_finance_activation', 'submission_cancelled'
      )
      WHEN 'resubmission_required' THEN NEW.status IN ('under_review', 'rejected', 'submission_cancelled')
      WHEN 'contract_signing_required' THEN NEW.status IN (
        'contracts_submitted', 'resubmission_required', 'rejected', 'under_review'
      )
      WHEN 'contracts_submitted' THEN NEW.status IN (
        'contract_under_review', 'pending_finance_activation', 'active',
        'contract_signing_required', 'rejected', 'resubmission_required'
      )
      WHEN 'contract_under_review' THEN NEW.status IN (
        'pending_finance_activation', 'active', 'contract_signing_required',
        'rejected', 'down_payment_required'
      )
      WHEN 'down_payment_required' THEN NEW.status IN (
        'down_payment_submitted', 'pending_finance_activation', 'rejected'
      )
      WHEN 'down_payment_submitted' THEN NEW.status IN (
        'pending_finance_activation', 'active', 'rejected', 'down_payment_required'
      )
      WHEN 'pending_finance_activation' THEN NEW.status IN ('active', 'rejected', 'under_review')
      WHEN 'rejected' THEN NEW.status IN ('under_review')
      ELSE false
    END;
  ELSE
    -- admin / super_admin
    v_ok := CASE OLD.status
      WHEN 'draft' THEN NEW.status IN (
        'under_review', 'active', 'pending_finance_activation', 'rejected', 'submission_cancelled'
      )
      WHEN 'under_review' THEN NEW.status IN (
        'contract_signing_required', 'resubmission_required', 'rejected',
        'active', 'pending_finance_activation', 'submission_cancelled'
      )
      WHEN 'resubmission_required' THEN NEW.status IN ('under_review', 'rejected', 'submission_cancelled')
      WHEN 'contract_signing_required' THEN NEW.status IN (
        'contracts_submitted', 'resubmission_required', 'rejected', 'under_review'
      )
      WHEN 'contracts_submitted' THEN NEW.status IN (
        'contract_under_review', 'active', 'pending_finance_activation',
        'contract_signing_required', 'rejected', 'resubmission_required'
      )
      WHEN 'contract_under_review' THEN NEW.status IN (
        'active', 'pending_finance_activation', 'contract_signing_required',
        'rejected', 'down_payment_required'
      )
      WHEN 'down_payment_required' THEN NEW.status IN (
        'down_payment_submitted', 'active', 'pending_finance_activation', 'rejected'
      )
      WHEN 'down_payment_submitted' THEN NEW.status IN (
        'active', 'pending_finance_activation', 'rejected', 'down_payment_required'
      )
      WHEN 'pending_finance_activation' THEN NEW.status IN (
        'active', 'rejected', 'under_review', 'submission_cancelled'
      )
      WHEN 'active' THEN NEW.status IN ('completed', 'submission_cancelled')
      WHEN 'rejected' THEN NEW.status IN ('under_review')
      WHEN 'completed' THEN false
      WHEN 'submission_cancelled' THEN NEW.status IN ('under_review')
      ELSE false
    END;
  END IF;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'Illegal status transition for %: % -> %', v_actor, OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

-- ── 2) Settlements: finance UPDATE (approve/reject) ──────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'application_settlements'
  ) THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS "Finance officers update application settlements" ON public.application_settlements;
      CREATE POLICY "Finance officers update application settlements"
        ON public.application_settlements
        FOR UPDATE
        USING (public.finance_can_access_application(application_id))
        WITH CHECK (public.finance_can_access_application(application_id));
    $p$;
  END IF;
END $$;

-- ── 3) Credit adjust RPCs: allow finance_officer ─────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_add_user_credits(
  p_user_email TEXT,
  p_amount DECIMAL(12, 2),
  p_description TEXT DEFAULT NULL,
  p_admin_email TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  new_balance DECIMAL(12, 2),
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_before DECIMAL(12, 2);
  v_balance_after DECIMAL(12, 2);
  v_current_balance DECIMAL(12, 2);
BEGIN
  IF NOT (public.is_admin() OR public.is_finance_officer()) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'not authorized: admin_add_user_credits requires admin or finance_officer';
  END IF;

  IF p_amount <= 0 THEN
    RETURN QUERY SELECT false, 0::DECIMAL, 'Amount must be greater than 0'::TEXT;
    RETURN;
  END IF;

  INSERT INTO user_credits (user_email, balance)
  VALUES (p_user_email, 0)
  ON CONFLICT (user_email) DO NOTHING;

  SELECT balance INTO v_current_balance
  FROM user_credits
  WHERE user_email = p_user_email;

  v_balance_before := COALESCE(v_current_balance, 0);
  v_balance_after := v_balance_before + p_amount;

  UPDATE user_credits
  SET balance = v_balance_after,
      updated_at = NOW()
  WHERE user_email = p_user_email;

  INSERT INTO credit_transactions (
    user_email, transaction_type, amount, balance_before, balance_after, description, admin_email
  ) VALUES (
    p_user_email, 'add', p_amount, v_balance_before, v_balance_after,
    COALESCE(p_description, 'Credits added'), p_admin_email
  );

  RETURN QUERY SELECT true, v_balance_after, 'Credits added successfully'::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_subtract_user_credits(
  p_user_email TEXT,
  p_amount DECIMAL(12, 2),
  p_description TEXT DEFAULT NULL,
  p_admin_email TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  new_balance DECIMAL(12, 2),
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_before DECIMAL(12, 2);
  v_balance_after DECIMAL(12, 2);
  v_current_balance DECIMAL(12, 2);
BEGIN
  IF NOT (public.is_admin() OR public.is_finance_officer()) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'not authorized: admin_subtract_user_credits requires admin or finance_officer';
  END IF;

  IF p_amount <= 0 THEN
    RETURN QUERY SELECT false, 0::DECIMAL, 'Amount must be greater than 0'::TEXT;
    RETURN;
  END IF;

  SELECT balance INTO v_current_balance
  FROM user_credits
  WHERE user_email = p_user_email;

  v_balance_before := COALESCE(v_current_balance, 0);

  IF v_balance_before < p_amount THEN
    RETURN QUERY SELECT false, v_balance_before, 'Insufficient credits balance'::TEXT;
    RETURN;
  END IF;

  v_balance_after := v_balance_before - p_amount;

  INSERT INTO user_credits (user_email, balance)
  VALUES (p_user_email, 0)
  ON CONFLICT (user_email) DO NOTHING;

  UPDATE user_credits
  SET balance = v_balance_after,
      updated_at = NOW()
  WHERE user_email = p_user_email;

  INSERT INTO credit_transactions (
    user_email, transaction_type, amount, balance_before, balance_after, description, admin_email
  ) VALUES (
    p_user_email, 'subtract', p_amount, v_balance_before, v_balance_after,
    COALESCE(p_description, 'Credits subtracted'), p_admin_email
  );

  RETURN QUERY SELECT true, v_balance_after, 'Credits subtracted successfully'::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_credits(
  p_user_email TEXT,
  p_amount DECIMAL(12, 2),
  p_description TEXT DEFAULT NULL,
  p_admin_email TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  new_balance DECIMAL(12, 2),
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_before DECIMAL(12, 2);
  v_balance_after DECIMAL(12, 2);
  v_current_balance DECIMAL(12, 2);
BEGIN
  IF NOT (public.is_admin() OR public.is_finance_officer()) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'not authorized: admin_set_user_credits requires admin or finance_officer';
  END IF;

  IF p_amount < 0 THEN
    RETURN QUERY SELECT false, 0::DECIMAL, 'Amount cannot be negative'::TEXT;
    RETURN;
  END IF;

  SELECT balance INTO v_current_balance
  FROM user_credits
  WHERE user_email = p_user_email;

  v_balance_before := COALESCE(v_current_balance, 0);
  v_balance_after := p_amount;

  INSERT INTO user_credits (user_email, balance)
  VALUES (p_user_email, p_amount)
  ON CONFLICT (user_email) DO UPDATE
  SET balance = p_amount,
      updated_at = NOW();

  INSERT INTO credit_transactions (
    user_email, transaction_type, amount, balance_before, balance_after, description, admin_email
  ) VALUES (
    p_user_email, 'set', ABS(v_balance_after - v_balance_before),
    v_balance_before, v_balance_after,
    COALESCE(p_description, 'Credits balance set'), p_admin_email
  );

  RETURN QUERY SELECT true, v_balance_after, 'Credits balance set successfully'::TEXT;
END;
$$;
