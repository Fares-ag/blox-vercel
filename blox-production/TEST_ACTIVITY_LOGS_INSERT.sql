-- ============================================
-- TEST: Activity Logs INSERT
-- ============================================
-- This script helps test if INSERT works for activity_logs
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================

-- Test 1: Check current user context (if logged in)
-- This will show your current auth context
SELECT 
  auth.uid() as current_user_id,
  auth.jwt() ->> 'email' as current_email,
  auth.role() as current_role;

-- Test 2: Try to insert a test log (uncomment when ready to test)
-- Note: This will only work if you're logged in as an authenticated user
-- Replace 'test@example.com' with your actual email
/*
INSERT INTO activity_logs (
  user_email,
  user_role,
  action_type,
  resource_type,
  description
) VALUES (
  'test@example.com',
  'customer',
  'view',
  'dashboard',
  'Test activity log from SQL'
) RETURNING *;
*/

-- Test 3: Check if there are any constraints or triggers that might block inserts
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'activity_logs'::regclass;

-- Test 4: Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'activity_logs'
ORDER BY ordinal_position;
