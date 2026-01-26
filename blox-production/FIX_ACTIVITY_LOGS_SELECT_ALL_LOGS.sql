-- ============================================
-- FIX: Activity Logs SELECT - Show ALL Logs for Super Admins
-- ============================================
-- This ensures super admins can see logs from ALL user roles
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================

-- Step 1: Drop existing SELECT policy
DROP POLICY IF EXISTS "Super admins can read all activity logs" ON activity_logs;

-- Step 2: Create comprehensive RLS policy that checks multiple JWT paths
-- This policy allows super admins to see ALL logs (from all user roles)
CREATE POLICY "Super admins can read all activity logs"
  ON activity_logs FOR SELECT
  USING (
    -- Check multiple JWT claim paths for super_admin role
    COALESCE((auth.jwt() ->> 'role'), '') = 'super_admin'
    OR COALESCE((auth.jwt() ->> 'user_role'), '') = 'super_admin'
    OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') = 'super_admin'
    OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'user_role'), '') = 'super_admin'
    OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'super_admin'
  );

-- Step 3: Verify the policy
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'activity_logs'
  AND cmd = 'SELECT';

-- Step 4: Test query (should return ALL logs if you're super_admin)
-- This should return logs from customers, admins, and super_admins
SELECT 
  user_role,
  COUNT(*) as log_count
FROM activity_logs
GROUP BY user_role;

-- Step 5: Show sample logs from each role
SELECT 
  user_email,
  user_role,
  action_type,
  resource_type,
  created_at
FROM activity_logs
ORDER BY created_at DESC
LIMIT 20;

-- ============================================
-- IMPORTANT: After running this, you may need to:
-- 1. Log out and log back in to refresh your JWT token
-- 2. The JWT is created at login time, so if role was added after login,
--    you need a fresh login to get the role in the JWT
-- ============================================
