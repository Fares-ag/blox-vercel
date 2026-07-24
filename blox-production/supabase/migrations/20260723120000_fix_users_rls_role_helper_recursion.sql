-- Fix: infinite recursion on public.users RLS when credit/dealer policies
-- call is_credit_officer()/is_dealer_agent()/current_user_role(), which SELECT users.
-- SECURITY DEFINER helpers must run with row_security off so they do not re-enter RLS.

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO off
AS $$
DECLARE
  user_role TEXT;
  user_email TEXT;
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') = 'service_role' THEN
    RETURN 'service_role';
  END IF;

  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();

  IF user_role IS NOT NULL THEN
    RETURN lower(user_role);
  END IF;

  user_email := auth.jwt() ->> 'email';
  IF user_email IS NOT NULL THEN
    SELECT role INTO user_role
    FROM public.users
    WHERE LOWER(email) = LOWER(user_email);
    IF user_role IS NOT NULL THEN
      RETURN lower(user_role);
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO off
AS $$
DECLARE
  user_role TEXT;
  user_email TEXT;
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') = 'service_role' THEN
    RETURN TRUE;
  END IF;

  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();

  IF user_role IN ('admin', 'super_admin') THEN
    RETURN TRUE;
  END IF;

  user_email := auth.jwt() ->> 'email';
  IF user_email IS NOT NULL THEN
    SELECT role INTO user_role
    FROM public.users
    WHERE LOWER(email) = LOWER(user_email);

    IF user_role IN ('admin', 'super_admin') THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_credit_officer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO off
AS $$
  SELECT public.current_user_role() = 'credit_officer';
$$;

CREATE OR REPLACE FUNCTION public.is_dealer_agent()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO off
AS $$
  SELECT public.current_user_role() = 'dealer_agent';
$$;

-- Allow credit officers (and other authenticated ops) to log activity without 401.
-- Keep function SECURITY DEFINER; grant execute only.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'log_activity_secure'
  ) THEN
    GRANT EXECUTE ON FUNCTION public.log_activity_secure TO authenticated;
  END IF;
END $$;
