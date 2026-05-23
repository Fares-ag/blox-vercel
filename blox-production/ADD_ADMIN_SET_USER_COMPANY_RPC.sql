-- ============================================
-- Admin RPC: set user company_id (safe upsert)
-- ============================================
-- Purpose:
-- - Guarantee company assignment works even if public.users row is missing
-- - Avoid UI failures due to RLS on public.users
--
-- Run in Supabase SQL Editor (production project).
-- Safe to re-run.
-- ============================================

CREATE OR REPLACE FUNCTION public.admin_set_user_company(
  p_user_id UUID,
  p_company_id UUID
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT,
  company_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'not authorized: admin_set_user_company is admin-only';
  END IF;

  -- Pull email from auth.users (requires definer privileges)
  SELECT u.email INTO v_email
  FROM auth.users u
  WHERE u.id = p_user_id;

  IF v_email IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'User not found in auth.users';
  END IF;

  -- Ensure profile exists + set company
  INSERT INTO public.users (id, email, role, company_id, created_at, updated_at)
  VALUES (p_user_id, v_email, 'customer', p_company_id, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    company_id = EXCLUDED.company_id,
    updated_at = NOW();

  RETURN QUERY
  SELECT pu.id, pu.email, pu.role, pu.company_id, pu.created_at, pu.updated_at
  FROM public.users pu
  WHERE pu.id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_company(UUID, UUID) TO authenticated;

