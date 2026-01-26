-- ============================================
-- FIX: Activity Logs SELECT RLS Policy - Fast Direct Check
-- ============================================
-- This script fixes the RLS policy blocking super_admin SELECT access
-- Uses direct auth.users check for better performance
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================

-- Step 1: Drop existing SELECT policies
DROP POLICY IF EXISTS "Super admins can read all activity logs" ON activity_logs;
DROP POLICY IF EXISTS "super_admins_can_read_all_activity_logs" ON activity_logs;

-- Step 2: Create a fast, direct RLS policy for SELECT
-- This directly checks auth.users.raw_user_meta_data without function calls
CREATE POLICY "Super admins can read all activity logs"
  ON activity_logs FOR SELECT
  USING (
    -- Direct check: auth.users.raw_user_meta_data
    EXISTS (
      SELECT 1 
      FROM auth.users 
      WHERE auth.users.id = auth.uid()
      AND (
        COALESCE(auth.users.raw_user_meta_data->>'role', '') = 'super_admin'
        OR COALESCE(auth.users.raw_user_meta_data->>'user_role', '') = 'super_admin'
      )
    )
    OR
    -- Fallback: JWT claims (if role is in JWT)
    COALESCE((auth.jwt() ->> 'role'), '') = 'super_admin'
    OR COALESCE((auth.jwt() ->> 'user_role'), '') = 'super_admin'
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

-- Step 5: Verify is_super_admin() function exists and works
-- (This should return TRUE if you're logged in as super_admin)
SELECT 
  is_super_admin() as is_super_admin_result,
  auth.uid() as current_user_id,
  auth.jwt() ->> 'email' as current_user_email;

-- Step 6: Check current user's role from auth.users
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as role_from_metadata,
  raw_user_meta_data->>'user_role' as user_role_from_metadata,
  raw_user_meta_data as full_metadata
FROM auth.users
WHERE id = auth.uid();

-- Step 7: Count total logs (should work if RLS is correct)
SELECT COUNT(*) as total_logs FROM activity_logs;

-- ============================================
-- TROUBLESHOOTING: If still not working
-- ============================================
-- If the above doesn't work, try this alternative that bypasses function calls:

/*
DROP POLICY IF EXISTS "Super admins can read all activity logs" ON activity_logs;

CREATE POLICY "Super admins can read all activity logs"
  ON activity_logs FOR SELECT
  USING (
    -- Only check auth.users.raw_user_meta_data (fastest)
    EXISTS (
      SELECT 1 
      FROM auth.users 
      WHERE auth.users.id = auth.uid()
      AND (
        raw_user_meta_data->>'role' = 'super_admin'
        OR raw_user_meta_data->>'user_role' = 'super_admin'
      )
    )
  );
*/
