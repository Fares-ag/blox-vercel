-- ============================================
-- Restore customer payment permissions
-- ============================================
-- Undoes 20250215200000_disable_company_payments.sql which forced
-- current_user_can_pay_* to FALSE for all non-admins.
-- Logic matches ADD_APPLICATION_PAYMENT_PERMISSIONS_RPC.sql and
-- ADD_ANY_APPLICATION_PAYMENT_PERMISSIONS_RPC.sql (company can_pay).
-- Safe to re-run.
-- ============================================

DROP FUNCTION IF EXISTS public.current_user_can_pay_for_application(UUID);

CREATE OR REPLACE FUNCTION public.current_user_can_pay_for_application(p_application_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app_company_id UUID;
  company_can_pay BOOLEAN;
  company_status TEXT;
BEGIN
  IF is_admin() THEN
    RETURN TRUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.applications a
    WHERE a.id::text = p_application_id
      AND LOWER(a.customer_email) = LOWER(auth.jwt() ->> 'email')
  ) THEN
    RETURN FALSE;
  END IF;

  SELECT a.company_id INTO app_company_id
  FROM public.applications a
  WHERE a.id::text = p_application_id
  LIMIT 1;

  IF app_company_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT c.can_pay, c.status INTO company_can_pay, company_status
  FROM public.companies c
  WHERE c.id = app_company_id
  LIMIT 1;

  IF company_status = 'inactive' THEN
    RETURN FALSE;
  END IF;

  RETURN COALESCE(company_can_pay, FALSE);
END;
$$;

COMMENT ON FUNCTION public.current_user_can_pay_for_application(TEXT) IS
  'Payment permission for an application: owner + company active + can_pay (admins bypass).';

CREATE OR REPLACE FUNCTION public.current_user_can_pay_for_any_application()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
BEGIN
  IF is_admin() THEN
    RETURN TRUE;
  END IF;

  user_email := LOWER(auth.jwt() ->> 'email');
  IF user_email IS NULL OR user_email = '' THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.applications a
    JOIN public.companies c ON c.id = a.company_id
    WHERE LOWER(a.customer_email) = user_email
      AND a.company_id IS NOT NULL
      AND c.status <> 'inactive'
      AND COALESCE(c.can_pay, FALSE) = TRUE
  );
END;
$$;

COMMENT ON FUNCTION public.current_user_can_pay_for_any_application() IS
  'Credit top-up / any-app payment: user has at least one app with company can_pay.';

GRANT EXECUTE ON FUNCTION public.current_user_can_pay_for_application(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_can_pay_for_any_application() TO authenticated;
