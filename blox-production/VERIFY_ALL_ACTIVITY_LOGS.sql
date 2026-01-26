-- ============================================
-- VERIFY: All Activity Logs by User Role
-- ============================================
-- This script checks if logs from all user roles exist
-- Run this in Supabase Dashboard -> SQL Editor (as service role or super admin)
-- ============================================

-- Check total logs count
SELECT COUNT(*) as total_logs FROM activity_logs;

-- Check logs by user role
SELECT 
  user_role,
  COUNT(*) as log_count,
  MIN(created_at) as earliest_log,
  MAX(created_at) as latest_log
FROM activity_logs
GROUP BY user_role
ORDER BY log_count DESC;

-- Check logs by user email (top 10 users)
SELECT 
  user_email,
  user_role,
  COUNT(*) as log_count,
  MAX(created_at) as latest_action
FROM activity_logs
GROUP BY user_email, user_role
ORDER BY log_count DESC
LIMIT 10;

-- Check recent logs (last 20)
SELECT 
  id,
  user_email,
  user_role,
  action_type,
  resource_type,
  description,
  created_at
FROM activity_logs
ORDER BY created_at DESC
LIMIT 20;

-- Check if INSERT policy allows all authenticated users
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'activity_logs'
  AND cmd = 'INSERT';
