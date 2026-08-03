-- Credit activates; finance views activation (no → active for finance_officer)

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
    -- Credit decision parity + activation
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
  ELSIF v_actor = 'finance_officer' THEN
    -- Credit decision parity WITHOUT activation (view activation queue only)
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
      WHEN 'pending_finance_activation' THEN NEW.status IN ('rejected', 'under_review')
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
