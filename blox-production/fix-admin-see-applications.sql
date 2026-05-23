-- ============================================
-- Fix: Admin Can't See Applications
-- ============================================
-- This script fixes the issue where admin users can't see applications
-- ============================================

-- ============================================
-- STEP 1: Update is_admin() function to check user metadata
-- ============================================
-- The function now checks both JWT and the auth.users table
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_email TEXT;
BEGIN
  -- Get user email from JWT
  user_email := auth.jwt() ->> 'email';
  
  -- Check JWT directly first (for backward compatibility)
  IF (auth.jwt() ->> 'role') = 'admin' OR (auth.jwt() ->> 'user_role') = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- If not in JWT, check raw_user_meta_data from auth.users table
  -- This is more reliable as it checks the source of truth
  IF user_email IS NOT NULL THEN
    SELECT raw_user_meta_data->>'role' INTO user_role
    FROM auth.users
    WHERE email = user_email;
    
    IF user_role = 'admin' THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 2: Check current admin users
-- ============================================
-- Run this to see which users have admin role
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as role,
  CASE 
    WHEN raw_user_meta_data->>'role' = 'admin' THEN '✅ Admin'
    WHEN raw_user_meta_data->>'role' = 'customer' THEN '👤 Customer'
    ELSE '❌ No role set'
  END as status,
  created_at
FROM auth.users
ORDER BY created_at DESC;

-- ============================================
-- STEP 3: Set admin role for your admin user(s)
-- ============================================
-- Replace 'YOUR_ADMIN_EMAIL@example.com' with your actual admin email
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE email = 'YOUR_ADMIN_EMAIL@example.com';  -- ⚠️ CHANGE THIS TO YOUR ADMIN EMAIL

-- ============================================
-- STEP 4: Verify the role was set
-- ============================================
SELECT 
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data as full_metadata
FROM auth.users
WHERE email = 'YOUR_ADMIN_EMAIL@example.com';  -- ⚠️ CHANGE THIS TO YOUR ADMIN EMAIL

-- ============================================
-- STEP 5: Check if applications exist
-- ============================================
SELECT 
  id,
  customer_name,
  customer_email,
  status,
  created_at
FROM applications
ORDER BY created_at DESC
LIMIT 20;

-- ============================================
-- STEP 6: Verify RLS policies exist
-- ============================================
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'applications'
ORDER BY policyname;

-- ============================================
-- IMPORTANT: After running this script
-- ============================================
-- 1. Log out of the admin panel completely
-- 2. Log back in as the admin user
-- 3. The new JWT will include the role from metadata
-- 4. You should now be able to see all applications
--
-- If it still doesn't work:
-- - Check browser console for RLS errors
-- - Verify the email matches exactly (case-sensitive)
-- - Try clearing browser cache/cookies
-- ============================================

