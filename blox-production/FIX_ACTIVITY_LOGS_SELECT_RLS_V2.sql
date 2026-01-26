-- ============================================
-- FIX: Activity Logs SELECT RLS Policy - JWT Only (No Table Access)
-- ============================================
-- This script fixes the RLS policy to use JWT claims only
-- No table access required - works with JWT token metadata
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================

-- Step 1: Drop existing SELECT policies
DROP POLICY IF EXISTS "Super admins can read all activity logs" ON activity_logs;
DROP POLICY IF EXISTS "super_admins_can_read_all_activity_logs" ON activity_logs;

-- Step 2: Create RLS policy using ONLY JWT claims (no table access)
-- This works because Supabase includes user_metadata in the JWT token
CREATE POLICY "Super admins can read all activity logs"
  ON activity_logs FOR SELECT
  USING (
    -- Check JWT claims (role is included in JWT from user_metadata)
    COALESCE((auth.jwt() ->> 'role'), '') = 'super_admin'
    OR COALESCE((auth.jwt() ->> 'user_role'), '') = 'super_admin'
    OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') = 'super_admin'
    OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'user_role'), '') = 'super_admin'
  );

-- Step 3: Verify the policy was created
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

-- Step 4: Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'activity_logs';

-- Step 5: Test JWT claims (this should show the role in the JWT)
SELECT 
  auth.uid() as current_user_id,
  auth.jwt() ->> 'email' as email_from_jwt,
  auth.jwt() ->> 'role' as role_from_jwt,
  auth.jwt() -> 'user_metadata' ->> 'role' as role_from_metadata,
  auth.jwt() -> 'user_metadata' as full_user_metadata;

-- Step 6: Count total logs (should work if RLS is correct)
SELECT COUNT(*) as total_logs FROM activity_logs;

-- ============================================
-- NOTE: If JWT doesn't contain role, you need to refresh the token
-- ============================================
-- The JWT token is created when the user logs in.
-- If the role was added AFTER login, the JWT won't have it.
-- Solution: User must log out and log back in to get a fresh JWT with the role.
