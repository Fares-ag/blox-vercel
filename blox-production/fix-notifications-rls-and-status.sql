-- ============================================
-- Fix Notifications RLS and Status Update Issues
-- ============================================
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================

-- ============================================
-- STEP 1: Fix Notifications RLS Policies
-- ============================================

-- Drop existing insert policies
DROP POLICY IF EXISTS "Allow authenticated insert" ON notifications;
DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can create notifications for themselves" ON notifications;

-- Allow users to create notifications for their own email
CREATE POLICY "Users can create notifications for themselves" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Users can create notifications for their own email
    (auth.jwt() ->> 'email')::text = LOWER(user_email)
    OR
    -- Admins can create notifications for any email
    is_admin()
  );

-- Verify the policy was created
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'notifications'
ORDER BY policyname;

-- ============================================
-- STEP 2: Verify Applications Table RLS Allows Status Updates
-- ============================================

-- Check current RLS policies on applications table
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'applications'
ORDER BY policyname;

-- ============================================
-- STEP 3: Test Notification Creation (Optional)
-- ============================================
-- Run this as a test (replace with actual email):
-- INSERT INTO notifications (user_email, type, title, message)
-- VALUES ('your-email@example.com', 'info', 'Test', 'Test notification');
-- 
-- If this works, the RLS policy is correct.
-- ============================================

