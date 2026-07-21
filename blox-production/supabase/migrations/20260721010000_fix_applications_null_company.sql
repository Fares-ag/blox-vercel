-- Migration: fix_applications_null_company
-- Fixes BLK-003: 2 active applications have company_id = NULL, which causes
-- current_user_can_pay_for_application() to return FALSE, silently blocking
-- all customer card/QPay/bank-transfer payment attempts for those applications.
--
-- Part 1: Assign QAuto company to any active/draft/under_review application
--         that currently has no company_id.
-- Part 2: Patch current_user_can_pay_for_application() to return TRUE when
--         company_id is NULL (fail-open on missing data), preserving the
--         can_pay=false kill-switch for companies that explicitly disable payments.

-- ── PART 1: Backfill company_id ──────────────────────────────────────────────
-- The trg_enforce_customer_application_field_guard trigger blocks company_id
-- changes for non-admin sessions. Disable it for this admin backfill, then
-- re-enable immediately after.
ALTER TABLE public.applications DISABLE TRIGGER trg_enforce_customer_application_field_guard;

DO $$
DECLARE
  v_company_id uuid;
  v_count      int;
BEGIN
  SELECT id INTO v_company_id
  FROM public.companies
  WHERE LOWER(name) = 'qauto'
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'QAuto company not found in public.companies — cannot backfill';
  END IF;

  UPDATE public.applications
  SET    company_id = v_company_id
  WHERE  company_id IS NULL
    AND  status IN ('active', 'draft', 'under_review', 'resubmission_required',
                    'contract_signing_required', 'contracts_submitted',
                    'down_payment_required', 'down_payment_submitted');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled company_id = % on % applications', v_company_id, v_count;
END;
$$;

ALTER TABLE public.applications ENABLE TRIGGER trg_enforce_customer_application_field_guard;

-- ── PART 2: Harden payment gate — fail-open on NULL company ──────────────────
-- When an application has no company_id we allow payment rather than silently
-- blocking. The explicit can_pay=false flag on a real company still kills pay.
CREATE OR REPLACE FUNCTION public.current_user_can_pay_for_application(
  p_application_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  app_company_id uuid;
  company_can_pay boolean;
  company_status  text;
BEGIN
  -- Admins can always pay (e.g. to test on behalf of a customer)
  IF public.is_admin() THEN
    RETURN TRUE;
  END IF;

  -- Verify the application belongs to the calling user
  IF NOT EXISTS (
    SELECT 1
    FROM   public.applications a
    WHERE  a.id::text = p_application_id
      AND  LOWER(a.customer_email) = LOWER(auth.jwt() ->> 'email')
  ) THEN
    RETURN FALSE;
  END IF;

  -- Read the company linked to this application
  SELECT a.company_id INTO app_company_id
  FROM   public.applications a
  WHERE  a.id::text = p_application_id
  LIMIT 1;

  -- If no company is set, allow payment (fail-open).
  -- Applications should always have a company, but missing data must not
  -- silently block a legitimate payment.
  IF app_company_id IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check the company's payment flag
  SELECT c.can_pay, c.status INTO company_can_pay, company_status
  FROM   public.companies c
  WHERE  c.id = app_company_id
  LIMIT 1;

  -- Inactive company = no payments
  IF company_status = 'inactive' THEN
    RETURN FALSE;
  END IF;

  RETURN COALESCE(company_can_pay, TRUE);
END;
$$;
