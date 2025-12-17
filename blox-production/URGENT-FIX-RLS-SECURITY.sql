-- ============================================
-- URGENT: Fix RLS Security Issue
-- ============================================
-- Customers are seeing other users' applications!
-- This script fixes the security vulnerability
-- ============================================

-- STEP 1: Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'applications';

-- If RLS Enabled = false, run this:
-- ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- STEP 2: Find and DROP all dangerous permissive policies
-- These allow anyone to see everything - DANGEROUS!
DROP POLICY IF EXISTS "Allow public access" ON applications;
DROP POLICY IF EXISTS "Allow all" ON applications;
DROP POLICY IF EXISTS "Allow public read access" ON applications;
DROP POLICY IF EXISTS "Allow public insert" ON applications;
DROP POLICY IF EXISTS "Allow public update" ON applications;
DROP POLICY IF EXISTS "Allow public delete" ON applications;
DROP POLICY IF EXISTS "Public can read all" ON applications;
DROP POLICY IF EXISTS "Public can read applications" ON applications;

-- STEP 3: Ensure RLS is enabled
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- STEP 4: Drop existing customer policies (we'll recreate them)
DROP POLICY IF EXISTS "Customers can read own applications" ON applications;
DROP POLICY IF EXISTS "Customers can create applications" ON applications;
DROP POLICY IF EXISTS "Customers can update own draft applications" ON applications;

-- STEP 5: Recreate secure customer policies with case-insensitive matching
CREATE POLICY "Customers can read own applications" ON applications
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    LOWER(COALESCE(customer_email, '')) = LOWER(COALESCE(current_user_email(), ''))
  );

CREATE POLICY "Customers can create applications" ON applications
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    LOWER(COALESCE(customer_email, '')) = LOWER(COALESCE(current_user_email(), ''))
  );

CREATE POLICY "Customers can update own draft applications" ON applications
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    LOWER(COALESCE(customer_email, '')) = LOWER(COALESCE(current_user_email(), '')) AND
    status = 'draft'
  );

-- STEP 6: Ensure admin policies exist
DROP POLICY IF EXISTS "Admins can read all applications" ON applications;
DROP POLICY IF EXISTS "Admins can update all applications" ON applications;
DROP POLICY IF EXISTS "Admins can delete all applications" ON applications;

CREATE POLICY "Admins can read all applications" ON applications
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update all applications" ON applications
  FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete all applications" ON applications
  FOR DELETE USING (is_admin());

-- STEP 7: Verify policies
SELECT 
  tablename,
  policyname,
  cmd,
  permissive,
  qual as "Condition"
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'applications'
ORDER BY policyname;

-- Should show:
-- - "Admins can read all applications" (SELECT, RESTRICTIVE)
-- - "Admins can update all applications" (UPDATE, RESTRICTIVE)
-- - "Admins can delete all applications" (DELETE, RESTRICTIVE)
-- - "Customers can read own applications" (SELECT, RESTRICTIVE)
-- - "Customers can create applications" (INSERT, RESTRICTIVE)
-- - "Customers can update own draft applications" (UPDATE, RESTRICTIVE)

-- STEP 8: Test the fix
-- After running this, customers should ONLY see their own applications
-- Log out and log back in to refresh the JWT token

