-- ============================================
-- Fix Admin Access to Applications
-- ============================================
-- This script helps diagnose and fix admin access issues
-- ============================================

-- ============================================
-- STEP 1: Check current user roles
-- ============================================
-- Run this to see all users and their roles
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'user_role' as user_role,
  created_at
FROM auth.users
ORDER BY created_at DESC;

-- ============================================
-- STEP 2: Set admin role for specific users
-- ============================================
-- Replace 'admin@blox.com' with your actual admin email(s)
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email IN (
  'admin@blox.com',
  'your-admin-email@example.com'
  -- Add more admin emails here
);

-- ============================================
-- STEP 3: Verify admin role was set
-- ============================================
SELECT 
  email,
  raw_user_meta_data->>'role' as role,
  CASE 
    WHEN raw_user_meta_data->>'role' = 'admin' THEN '✅ Admin'
    WHEN raw_user_meta_data->>'role' = 'customer' THEN '👤 Customer'
    ELSE '❌ No role set'
  END as status
FROM auth.users
WHERE email IN (
  'admin@blox.com',
  'your-admin-email@example.com'
);

-- ============================================
-- STEP 4: Test RLS policy (run as admin user)
-- ============================================
-- After setting the role, the admin user needs to:
-- 1. Log out
-- 2. Log back in (to get new JWT with role)
-- 3. Then they should be able to see all applications

-- ============================================
-- STEP 5: Alternative - Check if policy is working
-- ============================================
-- This query will show what the current JWT contains
-- (Run this while logged in as admin in your app's browser console)
SELECT 
  auth.jwt() ->> 'email' as current_email,
  auth.jwt() ->> 'role' as current_role,
  auth.jwt() ->> 'user_role' as current_user_role,
  auth.role() as auth_role;

-- ============================================
-- STEP 6: If still not working, check policy exists
-- ============================================
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'applications'
  AND policyname LIKE '%Admin%';

-- ============================================
-- STEP 7: Emergency - Temporarily allow all authenticated users
-- ============================================
-- ONLY USE IF ABSOLUTELY NECESSARY - REMOVE AFTER FIXING
-- This allows any authenticated user to read applications
-- (Use only for testing, then remove this policy)
/*
CREATE POLICY "Temporary: Allow all authenticated" ON applications
  FOR SELECT USING (auth.role() = 'authenticated');
*/

-- ============================================
-- NOTES:
-- ============================================
-- 1. After updating user metadata, user MUST log out and log back in
-- 2. The JWT token is cached, so role changes require re-authentication
-- 3. Check browser console for any RLS policy violation errors
-- 4. Verify the admin email matches exactly (case-sensitive)

