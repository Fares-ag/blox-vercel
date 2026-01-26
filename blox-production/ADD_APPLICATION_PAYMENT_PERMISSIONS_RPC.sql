-- ============================================
-- Application-based payment permission RPC
-- ============================================
-- Goal:
-- - Decide payment eligibility from applications.company_id -> companies.can_pay/status
-- - Ensure the caller is authorized for the application (owns it) unless admin
--
-- Run in Supabase SQL Editor (production).
-- Safe to re-run.
-- ============================================

-- IMPORTANT:
-- If you previously created a UUID overload of this function, PostgREST can become
-- unable to resolve which overload to call (PGRST203). We explicitly drop the UUID
-- signature to keep a single, unambiguous function.
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
  -- Admin bypass
  IF is_admin() THEN
    RETURN TRUE;
  END IF;

  -- Ensure the current user is the owner of the application
  IF NOT EXISTS (
    SELECT 1
    FROM public.applications a
    WHERE a.id::text = p_application_id
      AND LOWER(a.customer_email) = LOWER(auth.jwt() ->> 'email')
  ) THEN
    RETURN FALSE;
  END IF;

  -- Get application company
  SELECT a.company_id INTO app_company_id
  FROM public.applications a
  WHERE a.id::text = p_application_id
  LIMIT 1;

  IF app_company_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get company pay rules
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

GRANT EXECUTE ON FUNCTION public.current_user_can_pay_for_application(TEXT) TO authenticated;

