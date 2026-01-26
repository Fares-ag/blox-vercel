-- ============================================
-- FIX: Activity Logs INSERT Policy
-- ============================================
-- This script fixes the INSERT policy for activity_logs
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================

-- Step 1: Drop existing INSERT policies
DROP POLICY IF EXISTS "Authenticated users can create activity logs" ON activity_logs;
DROP POLICY IF EXISTS "authenticated_users_can_create_activity_logs" ON activity_logs;

-- Step 2: Create new INSERT policy
-- Allow all authenticated users to insert activity logs
CREATE POLICY "Authenticated users can create activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

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

-- Step 4: Test INSERT (optional - uncomment to test)
-- This should work if you're logged in as any authenticated user
-- INSERT INTO activity_logs (user_email, user_role, action_type, resource_type, description)
-- VALUES ('test@example.com', 'customer', 'view', 'dashboard', 'Test activity log');
