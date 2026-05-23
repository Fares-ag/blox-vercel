-- ============================================
-- Any-application payment permission RPC (for credit top-ups)
-- ============================================
-- Goal:
-- - For payment flows not tied to a specific application (e.g. credit top-up),
--   allow payment if the current user has AT LEAST ONE application whose
--   assigned company is active and can_pay = true.
--
-- Run in Supabase SQL Editor (production). Safe to re-run.
-- ============================================

CREATE OR REPLACE FUNCTION public.current_user_can_pay_for_any_application()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Admin bypass
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

GRANT EXECUTE ON FUNCTION public.current_user_can_pay_for_any_application() TO authenticated;

