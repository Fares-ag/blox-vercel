-- ============================================
-- FIX: Activity Logs INSERT Policy - More Permissive
-- ============================================
-- This script creates a more permissive INSERT policy
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================

-- Step 1: Drop ALL existing INSERT policies
DROP POLICY IF EXISTS "Authenticated users can create activity logs" ON activity_logs;
DROP POLICY IF EXISTS "authenticated_users_can_create_activity_logs" ON activity_logs;
DROP POLICY IF EXISTS "System can insert activity logs" ON activity_logs;

-- Step 2: Create new INSERT policy that allows any authenticated user
-- This policy is more permissive and should work for all authenticated users
CREATE POLICY "Authenticated users can create activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if user is authenticated (any role)
    auth.role() = 'authenticated'
    OR
    -- Fallback: allow if there's a valid user ID
    auth.uid() IS NOT NULL
  );

-- Step 3: Verify the policy was created
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'activity_logs'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- Step 4: Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'activity_logs';

-- Step 5: Test INSERT (run this while logged in as a customer/admin)
-- This should work if you're logged in
-- Note: We use JWT claims to get email and role since auth.users table might be blocked by RLS
INSERT INTO activity_logs (
  user_email,
  user_role,
  action_type,
  resource_type,
  description
) VALUES (
  COALESCE(auth.jwt() ->> 'email', 'test@example.com'),
  COALESCE(
    auth.jwt() ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role',
    'customer'
  ),
  'test',
  'user',
  'Test activity log from SQL'
)
RETURNING id, user_email, user_role, created_at;

-- Step 6: Clean up test log (optional)
-- DELETE FROM activity_logs WHERE action_type = 'test' AND resource_type = 'user';
