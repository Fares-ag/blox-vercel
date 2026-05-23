-- ============================================
-- Check if Application #application-7 Exists
-- ============================================

-- 1. Search for application-7
SELECT 
  id,
  customer_email,
  customer_name,
  status,
  created_at,
  updated_at
FROM applications
WHERE id = 'application-7'
   OR id LIKE '%application-7%'
   OR customer_email = 'fares@blox.market';

-- 2. List all applications with their emails
SELECT 
  id,
  customer_email,
  customer_name,
  status,
  created_at
FROM applications
ORDER BY created_at DESC
LIMIT 20;

-- 3. Check if there are any applications for fares@blox.market
SELECT COUNT(*) as count
FROM applications
WHERE customer_email = 'fares@blox.market';

-- 4. Check if there are any applications for faroos4848@gmail.com
SELECT COUNT(*) as count
FROM applications
WHERE customer_email = 'faroos4848@gmail.com';

-- 5. Search for any application with "application-7" in any field
SELECT 
  id,
  customer_email,
  customer_name,
  status
FROM applications
WHERE id::text LIKE '%7%'
   OR customer_name LIKE '%Fares%'
   OR customer_email LIKE '%fares%';

