-- ============================================
-- FIX: Application Delete RLS Policy
-- ============================================
-- This script fixes the issue where admins cannot delete applications
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================

-- Step 1: Ensure is_admin() function exists and works correctly
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_email TEXT;
BEGIN
  -- Fast path: check JWT claims (if present)
  IF (auth.jwt() ->> 'role') = 'admin' OR (auth.jwt() ->> 'user_role') = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- PRIMARY: Check the public.users table (where we store roles)
  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();

  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Fallback: check by email in public.users table
  user_email := auth.jwt() ->> 'email';
  IF user_email IS NOT NULL THEN
    SELECT role INTO user_role
    FROM public.users
    WHERE LOWER(email) = LOWER(user_email);

    IF user_role = 'admin' THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- Legacy fallback: check auth.users.raw_user_meta_data (for backwards compatibility)
  SELECT COALESCE(raw_user_meta_data->>'role', raw_user_meta_data->>'user_role')
    INTO user_role
  FROM auth.users
  WHERE id = auth.uid();

  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Admins can delete applications" ON applications;
DROP POLICY IF EXISTS "Admins can delete all applications" ON applications;

-- Step 3: Create a proper DELETE policy for admins
CREATE POLICY "Admins can delete applications" ON applications
  FOR DELETE 
  USING (is_admin());

-- Step 4: Verify the policy was created
SELECT 
  policyname,
  cmd,
  permissive,
  qual as "Condition"
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'applications'
  AND cmd = 'DELETE';

-- Step 5: Test the is_admin() function (run as your admin user)
-- SELECT is_admin();

-- Step 6: Check your user's admin status
-- Replace 'YOUR_EMAIL@example.com' with your actual email
SELECT 
  email,
  raw_user_meta_data->>'role' as role_in_metadata,
  CASE 
    WHEN raw_user_meta_data->>'role' = 'admin' THEN '✅ Admin'
    ELSE '❌ Not Admin'
  END as status
FROM auth.users
WHERE email = 'YOUR_EMAIL@example.com';

-- Step 7: If your user is not an admin, set it:
-- UPDATE auth.users
-- SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
-- WHERE email = 'YOUR_EMAIL@example.com';

-- ============================================
-- ALTERNATIVE: Create an RPC function for deletion
-- This bypasses RLS and uses SECURITY DEFINER
-- ============================================
CREATE OR REPLACE FUNCTION admin_delete_application(app_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Permission denied: Only admins can delete applications';
  END IF;

  -- Delete the application
  DELETE FROM applications WHERE id = app_id;
  
  -- Return true if deletion was successful
  RETURN FOUND;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION admin_delete_application(TEXT) TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================
-- After running this script:
-- 1. Log out and log back in to refresh your JWT token
-- 2. Try deleting an application again
-- 3. If it still doesn't work, use the RPC function instead
