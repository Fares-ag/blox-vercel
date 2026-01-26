-- ============================================
-- CHECK: Current User's Role
-- ============================================
-- This script checks the role of the currently authenticated user
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================

-- Check current user's role from auth.users
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'user_role' as user_role,
  raw_user_meta_data as full_metadata,
  confirmed_at,
  last_sign_in_at
FROM auth.users
WHERE id = auth.uid();

-- Check if is_super_admin() returns TRUE for current user
SELECT 
  is_super_admin() as is_super_admin_result,
  auth.uid() as current_user_id,
  auth.jwt() ->> 'email' as current_user_email;

-- Check if current user can access activity_logs (test query)
SELECT COUNT(*) as accessible_logs_count
FROM activity_logs
LIMIT 1;
