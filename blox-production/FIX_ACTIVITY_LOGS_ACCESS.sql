-- ============================================
-- FIX: Activity Logs RLS Policy - Complete Fix
-- ============================================
-- This script fixes the RLS policy blocking super_admin access
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================

-- Step 1: Create/Update is_super_admin() function
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_email TEXT;
BEGIN
  -- Fast path: check JWT claims
  user_role := COALESCE(
    auth.jwt() ->> 'role',
    auth.jwt() ->> 'user_role'
  );
  
  IF user_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;

  -- Check public.users table
  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();

  IF user_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;

  -- Fallback: check by email
  user_email := auth.jwt() ->> 'email';
  IF user_email IS NOT NULL THEN
    SELECT role INTO user_role
    FROM public.users
    WHERE LOWER(email) = LOWER(user_email);

    IF user_role = 'super_admin' THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- Legacy fallback: check auth.users.raw_user_meta_data
  SELECT COALESCE(raw_user_meta_data->>'role', raw_user_meta_data->>'user_role')
    INTO user_role
  FROM auth.users
  WHERE id = auth.uid();

  IF user_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Drop existing policies
DROP POLICY IF EXISTS "Super admins can read all activity logs" ON activity_logs;
DROP POLICY IF EXISTS "super_admins_can_read_all_activity_logs" ON activity_logs;

-- Step 3: Create new RLS policy using is_super_admin()
CREATE POLICY "Super admins can read all activity logs"
  ON activity_logs FOR SELECT
  USING (is_super_admin());

-- Step 4: Verify the policy was created
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'activity_logs'
ORDER BY policyname;

-- Step 5: Test the policy (this should return TRUE if you're logged in as super_admin)
-- Note: This needs to be run in the context of an authenticated session
-- SELECT is_super_admin();

-- Step 6: Check if there's any data
SELECT COUNT(*) as total_logs FROM activity_logs;

-- ============================================
-- ALTERNATIVE: If is_super_admin() doesn't work, use direct check
-- ============================================
-- Uncomment below if the above doesn't work:

/*
DROP POLICY IF EXISTS "Super admins can read all activity logs" ON activity_logs;

CREATE POLICY "Super admins can read all activity logs"
  ON activity_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' = 'super_admin'
        OR auth.users.raw_user_meta_data->>'user_role' = 'super_admin'
        OR (auth.jwt() ->> 'role') = 'super_admin'
        OR (auth.jwt() ->> 'user_role') = 'super_admin'
      )
    )
  );
*/
