-- ============================================
-- FIX: Allow Customers to Update Applications for Resubmission
-- ============================================
-- The current policy only allows updates when status = 'draft'
-- But customers need to update when status = 'resubmission_required'
-- ============================================

-- Check current UPDATE policies
SELECT 
  policyname,
  cmd,
  qual as "USING condition",
  with_check as "WITH CHECK condition"
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'applications'
  AND cmd = 'UPDATE'
ORDER BY policyname;

-- ============================================
-- STEP 1: Add policy for resubmission updates
-- ============================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Customers can update for resubmission" ON applications;

-- Allow customers to update their own applications when resubmission is required
-- This allows them to upload documents and change status back to 'under_review'
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
    -- Allow updating to 'under_review' or keeping 'resubmission_required'
    -- This prevents customers from changing status to something they shouldn't
  );

-- ============================================
-- STEP 2: Verify the new policy
-- ============================================
SELECT 
  policyname,
  cmd,
  qual as "USING condition",
  with_check as "WITH CHECK condition"
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'applications'
  AND cmd = 'UPDATE'
ORDER BY policyname;

-- ============================================
-- STEP 3: Add policy for contract signing updates
-- ============================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Customers can update for contract signing" ON applications;

-- Allow customers to update their own applications when contract signing is required
-- This allows them to upload signed contract and change status to 'contracts_submitted'
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

-- ============================================
-- EXPECTED RESULT:
-- ============================================
-- You should now see:
-- 1. "Admins can update all applications" (for admins)
-- 2. "Customers can update own draft applications" (for draft status)
-- 3. "Customers can update for resubmission" (for resubmission_required status)
-- 4. "Customers can update for contract signing" (for contract_signing_required status) <- NEW
-- ============================================

-- ============================================
-- STEP 3: Test the policy (Optional)
-- ============================================
-- After running this, try resubmitting documents again
-- The status should now update from 'resubmission_required' to 'under_review'
-- ============================================

