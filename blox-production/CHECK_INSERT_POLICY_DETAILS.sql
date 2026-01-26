-- ============================================
-- CHECK: Activity Logs INSERT Policy Details
-- ============================================
-- This script shows the exact INSERT policy configuration
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================

-- Check INSERT policy details
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'activity_logs'
  AND cmd = 'INSERT';

-- If no policy exists, you'll get no rows
-- If policy exists, you should see:
-- - policyname: "Authenticated users can create activity logs"
-- - roles: should include "authenticated" or be empty (meaning all roles)
-- - with_check: should be "true" or "(true)"

-- Also check if there are any other policies that might conflict
SELECT 
  policyname,
  cmd,
  roles,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'activity_logs'
ORDER BY cmd, policyname;
