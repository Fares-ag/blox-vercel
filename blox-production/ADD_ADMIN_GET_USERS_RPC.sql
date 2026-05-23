-- Admin-only RPC to list Supabase Auth users (for Admin UI).
-- Run in Supabase Dashboard -> SQL Editor.
--
-- Prerequisites:
-- - `is_admin()` must exist (see `supabase-secure-rls-policies.sql`)
--
-- Notes:
-- - Client apps cannot directly read `auth.users`, even for admins.
-- - This SECURITY DEFINER function exposes a safe, admin-guarded subset via `supabase.rpc()`.

CREATE OR REPLACE FUNCTION public.admin_get_users()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  updated_at timestamptz,
  raw_user_meta_data jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT is_admin() THEN
    -- Raise a clear privilege error (will surface as 4xx in PostgREST)
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'not authorized: admin_get_users is admin-only. Set your Supabase auth user metadata role=user_role=admin and re-login.';
  END IF;

  RETURN QUERY
    SELECT
      u.id::uuid,
      u.email::text,
      u.created_at::timestamptz,
      u.updated_at::timestamptz,
      u.raw_user_meta_data::jsonb
    FROM auth.users u
    ORDER BY u.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_users() TO authenticated;


