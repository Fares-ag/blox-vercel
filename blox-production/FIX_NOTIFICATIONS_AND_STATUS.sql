-- ============================================
-- FIX: Notifications RLS and Status Updates
-- ============================================
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================

-- ============================================
-- PART 1: Fix Notifications RLS Policy
-- ============================================

-- Drop existing insert policies that might be blocking
DROP POLICY IF EXISTS "Allow authenticated insert" ON notifications;
DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can create notifications for themselves" ON notifications;
DROP POLICY IF EXISTS "Allow authenticated users to insert notifications" ON notifications;

-- Create new policy: Users can create notifications for their own email
-- This allows customers to create notifications when they resubmit documents
CREATE POLICY "Users can create notifications for themselves" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Users can create notifications for their own email (case-insensitive)
    LOWER((auth.jwt() ->> 'email')::text) = LOWER(user_email)
    OR
    -- Admins can create notifications for any email
    is_admin()
  );

-- Verify the policy
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'notifications'
ORDER BY policyname;

-- ============================================
-- PART 2: Fix Applications Update Policy for Resubmission
-- ============================================

-- Check current UPDATE policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'applications'
  AND cmd = 'UPDATE'
ORDER BY policyname;

-- The current policy only allows updates when status = 'draft'
-- But customers need to update when status = 'resubmission_required'
-- Add a new policy to allow this

DROP POLICY IF EXISTS "Customers can update for resubmission" ON applications;

CREATE POLICY "Customers can update for resubmission" ON applications
  FOR UPDATE 
  TO authenticated
  USING (
    auth.role() = 'authenticated' AND
    LOWER(customer_email) = LOWER(current_user_email()) AND
    status = 'resubmission_required'
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    LOWER(customer_email) = LOWER(current_user_email())
  );

-- Also add policy for contract signing updates
DROP POLICY IF EXISTS "Customers can update for contract signing" ON applications;

CREATE POLICY "Customers can update for contract signing" ON applications
  FOR UPDATE 
  TO authenticated
  USING (
    auth.role() = 'authenticated' AND
    LOWER(customer_email) = LOWER(current_user_email()) AND
    status = 'contract_signing_required'
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    LOWER(customer_email) = LOWER(current_user_email())
  );

-- Verify all UPDATE policies were created
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'applications'
  AND cmd = 'UPDATE'
ORDER BY policyname;

-- ============================================
-- PART 3: Test Queries (Optional - for debugging)
-- ============================================

-- Test 1: Check current user email
-- SELECT auth.jwt() ->> 'email' as current_user_email;

-- Test 2: Check if you can update an application (replace with actual ID)
-- UPDATE applications 
-- SET status = 'under_review', updated_at = NOW()
-- WHERE id = 'your-application-id'::uuid
-- RETURNING id, status, customer_email;

-- Test 3: Check if you can create a notification (replace with your email)
-- INSERT INTO notifications (user_email, type, title, message)
-- VALUES ('your-email@example.com', 'info', 'Test', 'Test notification')
-- RETURNING *;

-- ============================================
-- NOTES:
-- ============================================
-- 1. After running this script, try resubmitting documents again
-- 2. Check the browser console for detailed logs
-- 3. If status still doesn't update, check the applications UPDATE policy
-- 4. The notification should now be created successfully
-- ============================================

