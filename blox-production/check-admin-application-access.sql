-- ============================================
-- Diagnostic Script: Check Admin Application Access
-- ============================================
-- This script helps diagnose why admin can't see applications
-- ============================================

-- 1. Check if admin user exists and has role set
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as role_in_metadata,
  raw_app_meta_data->>'role' as role_in_app_metadata,
  created_at
FROM auth.users
WHERE email = 'YOUR_ADMIN_EMAIL_HERE'; -- Replace with your admin email

-- 2. Check all applications in the database
SELECT 
  id,
  customer_name,
  customer_email,
  status,
  created_at
FROM applications
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check if RLS is enabled on applications table
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'applications';

-- 4. Check existing policies on applications table
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
WHERE tablename = 'applications';

-- 5. Test the is_admin() function (run this as the admin user)
-- Note: This needs to be run in the context of an authenticated session
-- SELECT is_admin();

-- 6. Check JWT claims structure (this is what the admin sees)
-- You'll need to check this from the application's auth context
-- The JWT should contain: { "role": "admin" } or { "user_role": "admin" }

-- ============================================
-- FIX: Update is_admin() function to check raw_user_meta_data
-- ============================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_email TEXT;
BEGIN
  -- Get user email from JWT
  user_email := auth.jwt() ->> 'email';
  
  -- Check JWT directly first
  IF (auth.jwt() ->> 'role') = 'admin' OR (auth.jwt() ->> 'user_role') = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- If not in JWT, check raw_user_meta_data from auth.users table
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
-- ALTERNATIVE FIX: Update admin user metadata
-- ============================================
-- Run this to ensure admin user has role set correctly
-- Replace 'YOUR_ADMIN_EMAIL_HERE' with your actual admin email
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE email = 'YOUR_ADMIN_EMAIL_HERE';

-- ============================================
-- VERIFY: Check if admin can now see applications
-- ============================================
-- After running the fixes above, log out and log back in as admin
-- Then check if applications are visible in the admin panel

