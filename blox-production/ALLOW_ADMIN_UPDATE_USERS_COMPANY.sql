-- ============================================
-- Allow admins to update `public.users.company_id`
-- ============================================
-- Required for Admin UI "Assign Company" on User Detail page.
-- Run in Supabase Dashboard -> SQL Editor
-- Safe to re-run.
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can update users" ON public.users;
CREATE POLICY "Admins can update users" ON public.users
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Ensure authenticated role can issue UPDATE (RLS still applies)
GRANT UPDATE (company_id) ON public.users TO authenticated;

