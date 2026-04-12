-- ============================================
-- Disable payments for companies (for now)
-- ============================================
-- Both RPCs return FALSE for non-admins so:
-- - No installment payments (application/company)
-- - No credit top-up (any-application check)
-- Admins still get TRUE so they can test.
-- To re-enable later, re-run ADD_APPLICATION_PAYMENT_PERMISSIONS_RPC.sql
-- and ADD_ANY_APPLICATION_PAYMENT_PERMISSIONS_RPC.sql.
-- ============================================

CREATE OR REPLACE FUNCTION public.current_user_can_pay_for_application(p_application_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF is_admin() THEN
    RETURN TRUE;
  END IF;
  -- Disabled for now: no company-based installment payments
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_pay_for_any_application()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF is_admin() THEN
    RETURN TRUE;
  END IF;
  -- Disabled for now: no credit top-up (company-based gate)
  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.current_user_can_pay_for_application(TEXT) IS 'Payment permission for an application. Currently disabled for non-admins (company payments off).';
COMMENT ON FUNCTION public.current_user_can_pay_for_any_application() IS 'Payment permission for flows not tied to one application (e.g. credit top-up). Currently disabled for non-admins.';
