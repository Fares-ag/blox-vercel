-- ============================================
-- Debug Activity Logs Access Issue
-- ============================================
-- Run this in Supabase Dashboard -> SQL Editor
-- Replace 'ahmed@blox.market' with your super admin email
-- ============================================

-- 1. Check if activity_logs table exists and RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'activity_logs';

-- 2. Check if there's any data in the table
SELECT COUNT(*) as total_logs FROM activity_logs;

-- 3. Check RLS policies on activity_logs
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'activity_logs'
ORDER BY policyname;

-- 4. Check if is_super_admin() function exists
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'is_super_admin';

-- 5. Check super admin user metadata
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'user_role' as user_role,
  raw_user_meta_data
FROM auth.users
WHERE email = 'ahmed@blox.market'; -- Replace with your super admin email

-- 6. Test is_super_admin() function (run as the super admin user)
-- Note: This needs to be run in the context of an authenticated session
-- You can test this from the application console:
-- SELECT is_super_admin();

-- 7. Check if public.users table has the role
SELECT 
  id,
  email,
  role
FROM public.users
WHERE email = 'ahmed@blox.market'; -- Replace with your super admin email

-- 8. Try to manually query activity_logs (this should work if RLS is correct)
-- SELECT * FROM activity_logs LIMIT 5;

-- ============================================
-- FIX: Ensure RLS policy uses is_super_admin()
-- ============================================
DROP POLICY IF EXISTS "Super admins can read all activity logs" ON activity_logs;

CREATE POLICY "Super admins can read all activity logs"
  ON activity_logs FOR SELECT
  USING (is_super_admin());

-- Verify the policy
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'activity_logs'
  AND policyname = 'Super admins can read all activity logs';
