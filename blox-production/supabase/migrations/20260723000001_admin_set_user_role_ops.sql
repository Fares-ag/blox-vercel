-- Allow assigning showroom ops roles via admin_set_user_role

CREATE OR REPLACE FUNCTION public.admin_set_user_role(p_user_id uuid, p_role text)
RETURNS TABLE(id uuid, email text, role text, company_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'not authorized: admin_set_user_role is admin-only';
  END IF;

  IF p_role NOT IN (
    'customer',
    'admin',
    'super_admin',
    'dealer_agent',
    'credit_officer'
  ) THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  -- Only super_admin may grant super_admin
  IF p_role = 'super_admin' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'super_admin'
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'only super_admin may assign super_admin';
    END IF;
  END IF;

  UPDATE public.users
  SET role = p_role, updated_at = NOW()
  WHERE public.users.id = p_user_id;

  RETURN QUERY
  SELECT u.id, u.email, u.role, u.company_id
  FROM public.users u
  WHERE u.id = p_user_id;
END;
$$;
