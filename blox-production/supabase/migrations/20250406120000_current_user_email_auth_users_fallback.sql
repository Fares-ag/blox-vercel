-- Fix applications INSERT/SELECT RLS when JWT "email" claim is missing or empty.
-- Policies use LOWER(customer_email) = LOWER(current_user_email()); if the JWT omits
-- email (edge cases, stale session), the old implementation returned NULL and RLS failed.

CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    NULLIF(TRIM(auth.jwt() ->> 'email'), ''),
    (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
  );
$$;

COMMENT ON FUNCTION public.current_user_email() IS
  'Email for RLS: JWT claim first, else auth.users.email for auth.uid().';
