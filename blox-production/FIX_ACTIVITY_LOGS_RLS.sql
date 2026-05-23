-- ============================================
-- Fix Activity Logs RLS Policy
-- ============================================
-- This script fixes the RLS policy for activity_logs table
-- to use the is_super_admin() function instead of direct checks
-- ============================================

-- Drop the old policy
DROP POLICY IF EXISTS "Super admins can read all activity logs" ON activity_logs;

-- Create new policy using is_super_admin() function
CREATE POLICY "Super admins can read all activity logs"
  ON activity_logs FOR SELECT
  USING (is_super_admin());

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'activity_logs'
ORDER BY policyname;

-- Test query (should work for super_admin)
-- SELECT COUNT(*) FROM activity_logs;
