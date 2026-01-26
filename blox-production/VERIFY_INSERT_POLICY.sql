-- ============================================
-- VERIFY: Activity Logs INSERT Policy
-- ============================================
-- This script verifies the INSERT policy is correctly set up
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================

-- Check if INSERT policy exists and its configuration
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

-- Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'activity_logs';

-- Test if current user can insert (while logged in)
-- This should work if the policy is correct
SELECT 
  auth.uid() as current_user_id,
  auth.role() as current_role,
  auth.jwt() ->> 'email' as current_email;
