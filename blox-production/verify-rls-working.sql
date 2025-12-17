-- ============================================
-- Verify RLS Policies Are Working
-- ============================================
-- Run this in Supabase SQL Editor to check if RLS is working

-- 1. Check if RLS is enabled on applications table
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'applications';

-- Should return: RLS Enabled = true

-- 2. Check what policies exist
SELECT 
  tablename,
  policyname,
  cmd as "Command",
  qual as "Condition"
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'applications'
ORDER BY policyname;

-- Should show policies like:
-- "Customers can read own applications"
-- "Admins can read all applications"

-- 3. Test as a specific user (replace with actual email)
-- This simulates what a customer would see
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"email": "faroos4848@gmail.com", "role": "customer"}';

-- Try to select applications
SELECT 
  id,
  customer_email,
  status,
  created_at
FROM applications
LIMIT 10;

-- Should only return applications where customer_email = 'faroos4848@gmail.com'

-- 4. Check what email is stored in applications
SELECT DISTINCT customer_email, COUNT(*) as count
FROM applications
GROUP BY customer_email
ORDER BY count DESC;

-- This shows all customer emails in the database
-- Compare with the logged-in user's email

-- 5. Reset role
RESET ROLE;

