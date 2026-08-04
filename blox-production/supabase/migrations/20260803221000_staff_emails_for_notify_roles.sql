-- Return staff emails for role fan-out (excludes actor). Used by client notifyRoles
-- email parity when app.supabase_url / app.service_role_key GUCs are unset.

CREATE OR REPLACE FUNCTION public.staff_emails_for_notify_roles(p_roles text[])
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO off
AS $$
DECLARE
  v_allowed text[] := ARRAY['admin', 'super_admin', 'credit_officer', 'finance_officer'];
  v_roles text[];
  v_emails text[];
  v_actor text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authorized: authentication required'
      USING ERRCODE = '42501';
  END IF;

  IF p_roles IS NULL OR cardinality(p_roles) = 0 THEN
    RETURN ARRAY[]::text[];
  END IF;

  SELECT array_agg(DISTINCT r)
  INTO v_roles
  FROM (
    SELECT lower(trim(x)) AS r
    FROM unnest(p_roles) AS x
  ) s
  WHERE r = ANY (v_allowed);

  IF v_roles IS NULL OR cardinality(v_roles) = 0 THEN
    RETURN ARRAY[]::text[];
  END IF;

  v_actor := lower(coalesce(public.current_user_email(), ''));

  SELECT coalesce(array_agg(DISTINCT lower(u.email)), ARRAY[]::text[])
  INTO v_emails
  FROM public.users u
  WHERE u.role = ANY (v_roles)
    AND u.email IS NOT NULL
    AND trim(u.email) <> ''
    AND lower(trim(u.email)) <> v_actor;

  RETURN v_emails;
END;
$$;

GRANT EXECUTE ON FUNCTION public.staff_emails_for_notify_roles(text[]) TO authenticated;
