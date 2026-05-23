-- ============================================
-- FIX: Activity Logs INSERT Policy - Simple Version
-- ============================================
-- This creates a simple policy that allows inserts when user data is provided
-- Works even when session is being cleared during logout
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================

-- Step 1: Drop ALL existing INSERT policies
DROP POLICY IF EXISTS "Authenticated users can create activity logs" ON activity_logs;
DROP POLICY IF EXISTS "authenticated_users_can_create_activity_logs" ON activity_logs;
DROP POLICY IF EXISTS "System can insert activity logs" ON activity_logs;

-- Step 2: Create simple INSERT policy
-- Allow inserts if user is authenticated OR if user_email is provided
-- This works for logout scenarios where session might be clearing
CREATE POLICY "Authenticated users can create activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (
    -- Primary: User is authenticated
    auth.role() = 'authenticated'
    OR
    -- Fallback: user_email is provided (for logout scenarios)
    -- This allows logging even when session is being cleared
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

-- ============================================
-- NOTE: This policy allows inserts when:
-- 1. User is authenticated (normal case)
-- 2. user_email is provided (logout case - session might be clearing)
-- 
-- The fallback to user_email ensures logout logging works
-- even when the session is being cleared.
-- ============================================
