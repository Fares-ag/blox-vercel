-- ============================================
-- DIAGNOSE: Activity Logs - Check All Logs
-- ============================================
-- This script helps diagnose why only super admin logs are showing
-- Run this in Supabase Dashboard -> SQL Editor (as service role)
-- ============================================

-- 1. Check total logs count
SELECT COUNT(*) as total_logs FROM activity_logs;

-- 2. Check logs by user_role (this shows if logs from customers/admins exist)
SELECT 
  user_role,
  COUNT(*) as log_count,
  COUNT(DISTINCT user_email) as unique_users,
  MIN(created_at) as earliest_log,
  MAX(created_at) as latest_log
FROM activity_logs
GROUP BY user_role
ORDER BY log_count DESC;

-- 3. Check logs by action_type
SELECT 
  action_type,
  COUNT(*) as log_count
FROM activity_logs
GROUP BY action_type
ORDER BY log_count DESC;

-- 4. Check logs by resource_type
SELECT 
  resource_type,
  COUNT(*) as log_count
FROM activity_logs
GROUP BY resource_type
ORDER BY log_count DESC;

-- 5. Show recent logs from all roles (last 30)
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
LIMIT 30;

-- 6. Check if there are any logs from customers
SELECT COUNT(*) as customer_logs
FROM activity_logs
WHERE user_role = 'customer';

-- 7. Check if there are any logs from admins
SELECT COUNT(*) as admin_logs
FROM activity_logs
WHERE user_role = 'admin';

-- 8. Check if there are any logs from super admins
SELECT COUNT(*) as super_admin_logs
FROM activity_logs
WHERE user_role = 'super_admin';

-- 9. Verify RLS policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'activity_logs'
ORDER BY cmd, policyname;
