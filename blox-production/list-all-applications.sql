-- ============================================
-- List All Applications with Details
-- ============================================

-- Show all applications with their customer info
SELECT 
  id,
  customer_email,
  customer_name,
  status,
  created_at,
  updated_at
FROM applications
ORDER BY created_at DESC;

-- Check specifically for application-7
SELECT 
  id,
  customer_email,
  customer_name,
  status,
  created_at
FROM applications
WHERE id = 'application-7'
   OR id LIKE '%application-7%';

-- Group by customer email to see distribution
SELECT 
  customer_email,
  COUNT(*) as "Application Count",
  STRING_AGG(id::text, ', ' ORDER BY created_at DESC) as "Application IDs"
FROM applications
GROUP BY customer_email
ORDER BY "Application Count" DESC;

-- Check if application-7 exists and what email it belongs to
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM applications WHERE id = 'application-7') 
    THEN 'EXISTS' 
    ELSE 'DOES NOT EXIST' 
  END as "Application-7 Status",
  (SELECT customer_email FROM applications WHERE id = 'application-7' LIMIT 1) as "Belongs To Email";

