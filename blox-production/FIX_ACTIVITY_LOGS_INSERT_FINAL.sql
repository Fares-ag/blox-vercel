-- ============================================
-- FIX: Activity Logs INSERT Policy - Works During Logout
-- ============================================
-- This script creates an INSERT policy that works even when session is being cleared
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================

-- Step 1: Drop ALL existing INSERT policies
DROP POLICY IF EXISTS "Authenticated users can create activity logs" ON activity_logs;
DROP POLICY IF EXISTS "authenticated_users_can_create_activity_logs" ON activity_logs;
DROP POLICY IF EXISTS "System can insert activity logs" ON activity_logs;

-- Step 2: Create INSERT policy that allows inserts when:
-- - User is authenticated (normal case), OR
-- - We're inserting with a valid user_id (for logout scenarios)
-- Note: We use a function to check if the user_id matches a valid user
CREATE POLICY "Authenticated users can create activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (
    -- Allow if user is authenticated (normal case)
    auth.role() = 'authenticated'
    OR
    -- Allow if user_id is provided and matches a valid user (for logout scenarios)
    (user_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM auth.users WHERE id = user_id
    ))
    OR
    -- Allow if user_email is provided (fallback for logout)
    user_email IS NOT NULL
  );

-- Step 3: Verify the policy was created
SELECT 
  policyname,
  cmd,
  qual,
  with_check,
  roles
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'activity_logs'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- Step 4: Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'activity_logs';

-- ============================================
-- NOTE: This policy allows inserts when:
-- 1. User is authenticated (normal case) - auth.role() = 'authenticated'
-- 2. user_id is provided and exists in auth.users (logout case)
-- 3. user_email is provided (fallback)
-- 
-- However, if the session is completely cleared, the policy might still fail
-- because we can't query auth.users without proper permissions.
-- 
-- Alternative: Use a SECURITY DEFINER function to bypass RLS for the check.
-- ============================================
