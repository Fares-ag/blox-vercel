-- ============================================
-- TEST: Activity Logs INSERT for All Roles
-- ============================================
-- This script tests if INSERT works for different user roles
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================

-- Step 1: Check current INSERT policy
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'activity_logs'
  AND cmd = 'INSERT';

-- Step 2: Test INSERT as current user (should work if authenticated)
-- This will test if the INSERT policy allows the current user
INSERT INTO activity_logs (
  user_email,
  user_role,
  action_type,
  resource_type,
  description
) VALUES (
  'test@example.com',
  'customer',
  'test',
  'test',
  'Test activity log from SQL'
)
RETURNING id, user_email, user_role, created_at;

-- Step 3: Check if the test log was created
SELECT 
  id,
  user_email,
  user_role,
  action_type,
  created_at
FROM activity_logs
WHERE user_email = 'test@example.com'
ORDER BY created_at DESC
LIMIT 5;

-- Step 4: Clean up test logs (optional)
-- DELETE FROM activity_logs WHERE user_email = 'test@example.com';

-- ============================================
-- IMPORTANT: If INSERT fails, check:
-- 1. Are you logged in as an authenticated user?
-- 2. Does the INSERT policy allow authenticated users?
-- 3. Check the error message for RLS policy issues
-- ============================================
