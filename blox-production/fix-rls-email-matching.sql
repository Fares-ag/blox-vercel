-- ============================================
-- Fix RLS Email Matching Issue
-- ============================================
-- This script fixes the issue where customers can see other users' applications
-- ============================================

-- Step 1: Check current policies
SELECT 
  tablename,
  policyname,
  cmd,
  qual as "Condition"
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'applications'
  AND policyname LIKE '%Customer%';

-- Step 2: Drop existing customer policy if it exists
DROP POLICY IF EXISTS "Customers can read own applications" ON applications;

-- Step 3: Recreate with better email matching (case-insensitive)
CREATE POLICY "Customers can read own applications" ON applications
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    LOWER(customer_email) = LOWER(current_user_email())
  );

-- Step 4: Also fix the update policy
DROP POLICY IF EXISTS "Customers can update own draft applications" ON applications;

CREATE POLICY "Customers can update own draft applications" ON applications
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    LOWER(customer_email) = LOWER(current_user_email()) AND
    status = 'draft'
  );

-- Step 5: Fix the insert policy
DROP POLICY IF EXISTS "Customers can create applications" ON applications;

CREATE POLICY "Customers can create applications" ON applications
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    LOWER(customer_email) = LOWER(current_user_email())
  );

-- Step 6: Verify the helper function is working
-- Test what email the function returns
SELECT 
  current_user_email() as "Current User Email",
  auth.jwt() ->> 'email' as "JWT Email";

-- Step 7: Test the policy (replace with your actual email)
-- This should return 0 rows if RLS is working
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"email": "faroos4848@gmail.com", "role": "customer"}';

SELECT 
  id,
  customer_email,
  status
FROM applications
WHERE customer_email != 'faroos4848@gmail.com';

-- Should return 0 rows if RLS is working correctly

RESET ROLE;

-- Step 8: Check if there are any permissive policies that might be allowing access
SELECT 
  tablename,
  policyname,
  permissive,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'applications'
  AND permissive = 'PERMISSIVE';

-- If you see any PERMISSIVE policies with USING (true), that's the problem!
-- Drop them immediately:
-- DROP POLICY "Policy Name" ON applications;

