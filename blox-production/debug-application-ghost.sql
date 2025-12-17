-- ============================================
-- Debug: Why is application-7 showing if it doesn't exist?
-- ============================================

-- 1. Check if application-7 exists in database
SELECT 
  'application-7' as "Searching for",
  COUNT(*) as "Found Count"
FROM applications
WHERE id = 'application-7';

-- 2. List ALL applications (to see what actually exists)
SELECT 
  id,
  customer_email,
  customer_name,
  status,
  created_at
FROM applications
ORDER BY created_at DESC;

-- 3. Check for any applications with similar IDs
SELECT 
  id,
  customer_email,
  status
FROM applications
WHERE id::text LIKE '%7%'
ORDER BY id;

-- 4. Check for applications with "fares" email
SELECT 
  id,
  customer_email,
  customer_name,
  status
FROM applications
WHERE LOWER(customer_email) LIKE '%fares%'
   OR LOWER(customer_name) LIKE '%fares%';

-- 5. Count total applications
SELECT 
  COUNT(*) as "Total Applications",
  COUNT(DISTINCT customer_email) as "Unique Customer Emails"
FROM applications;

