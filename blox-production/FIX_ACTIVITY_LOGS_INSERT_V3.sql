-- ============================================
-- FIX: Activity Logs INSERT Policy - Simple and Permissive
-- ============================================
-- This script creates a simple INSERT policy that allows all authenticated users
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================

-- Step 1: Drop ALL existing INSERT policies
DROP POLICY IF EXISTS "Authenticated users can create activity logs" ON activity_logs;
DROP POLICY IF EXISTS "authenticated_users_can_create_activity_logs" ON activity_logs;
DROP POLICY IF EXISTS "System can insert activity logs" ON activity_logs;

-- Step 2: Create simple INSERT policy
-- This allows ANY authenticated user to insert logs
-- No complex checks - just verify user is authenticated
CREATE POLICY "Authenticated users can create activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Step 3: Verify the policy was created
SELECT 
  policyname,
  cmd,
  qual,
  with_check
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
-- NOTE: The policy uses `WITH CHECK (true)` which means
-- any authenticated user can insert logs.
-- This is safe because:
-- 1. Only authenticated users can access the table (TO authenticated)
-- 2. The application code validates user data before inserting
-- 3. Super admins can view all logs via SELECT policy
-- ============================================
