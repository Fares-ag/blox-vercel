-- ============================================
-- FIX: Activity Logs INSERT Policy - Bypass RLS Check
-- ============================================
-- This uses a SECURITY DEFINER function to check user validity
-- Works even when session is being cleared during logout
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================

-- Step 1: Create a function to check if user_id is valid (bypasses RLS)
CREATE OR REPLACE FUNCTION check_user_exists(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- This function runs with SECURITY DEFINER, so it can access auth.users
  RETURN EXISTS (SELECT 1 FROM auth.users WHERE id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Drop ALL existing INSERT policies
DROP POLICY IF EXISTS "Authenticated users can create activity logs" ON activity_logs;
DROP POLICY IF EXISTS "authenticated_users_can_create_activity_logs" ON activity_logs;
DROP POLICY IF EXISTS "System can insert activity logs" ON activity_logs;

-- Step 3: Create INSERT policy using the function
CREATE POLICY "Authenticated users can create activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (
    -- Allow if user is authenticated (normal case)
    auth.role() = 'authenticated'
    OR
    -- Allow if user_id is provided and exists (uses SECURITY DEFINER function)
    (user_id IS NOT NULL AND check_user_exists(user_id))
    OR
    -- Allow if user_email is provided (fallback)
    user_email IS NOT NULL
  );

-- Step 4: Verify the policy was created
SELECT 
  policyname,
  cmd,
  qual,
  with_check,
  roles
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'activity_logs'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- Step 5: Test the function (optional)
-- SELECT check_user_exists('9fbee71c-ffca-41b6-b92a-05ac64a81262'::UUID);
