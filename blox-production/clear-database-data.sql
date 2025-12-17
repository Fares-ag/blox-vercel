-- ============================================
-- Clear Database Data from Supabase
-- ============================================
-- WARNING: This will DELETE ALL DATA from these tables!
-- Make sure you have a backup before running this!
-- ============================================

-- ============================================
-- OPTION 1: Delete ALL Data (Nuclear Option)
-- ============================================
-- Uncomment the section below to delete everything

/*
-- Disable RLS temporarily for deletion (if needed)
ALTER TABLE applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_deferrals DISABLE ROW LEVEL SECURITY;
ALTER TABLE ledgers DISABLE ROW LEVEL SECURITY;

-- Delete in order (respecting foreign keys)
-- Start with tables that have foreign keys pointing to them
DELETE FROM payment_deferrals;
DELETE FROM payment_transactions;
DELETE FROM payment_schedules;
DELETE FROM ledgers;
DELETE FROM applications;
DELETE FROM packages;
DELETE FROM promotions;
DELETE FROM offers;
DELETE FROM products;
DELETE FROM insurance_rates;
DELETE FROM notifications;

-- Re-enable RLS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_deferrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledgers ENABLE ROW LEVEL SECURITY;
*/

-- ============================================
-- OPTION 2: Delete Only Applications (Recommended)
-- ============================================
-- This will delete applications and all related payment data
-- Products, offers, packages, promotions will remain

-- Disable RLS temporarily
ALTER TABLE applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_deferrals DISABLE ROW LEVEL SECURITY;
ALTER TABLE ledgers DISABLE ROW LEVEL SECURITY;

-- Delete payment-related data first (due to foreign keys)
DELETE FROM payment_deferrals;
DELETE FROM payment_transactions;
DELETE FROM payment_schedules;
DELETE FROM ledgers;

-- Delete applications
DELETE FROM applications;

-- Re-enable RLS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_deferrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledgers ENABLE ROW LEVEL SECURITY;

-- ============================================
-- OPTION 3: Delete Specific Application
-- ============================================
-- Uncomment and replace 'application-7' with the ID you want to delete

/*
DELETE FROM payment_deferrals WHERE application_id = 'application-7';
DELETE FROM payment_transactions WHERE application_id = 'application-7';
DELETE FROM payment_schedules WHERE application_id = 'application-7';
DELETE FROM ledgers WHERE application_id = 'application-7';
DELETE FROM applications WHERE id = 'application-7';
*/

-- ============================================
-- OPTION 4: Delete Applications by Email
-- ============================================
-- Uncomment and replace with the email you want to delete

/*
DELETE FROM payment_deferrals 
WHERE application_id IN (SELECT id FROM applications WHERE customer_email = 'fares@blox.market');

DELETE FROM payment_transactions 
WHERE application_id IN (SELECT id FROM applications WHERE customer_email = 'fares@blox.market');

DELETE FROM payment_schedules 
WHERE application_id IN (SELECT id FROM applications WHERE customer_email = 'fares@blox.market');

DELETE FROM ledgers 
WHERE application_id IN (SELECT id FROM applications WHERE customer_email = 'fares@blox.market');

DELETE FROM applications WHERE customer_email = 'fares@blox.market';
*/

-- ============================================
-- OPTION 5: Reset Auto-Increment IDs (if using simple IDs)
-- ============================================
-- If you're using simple IDs like "application-1", "application-2", etc.
-- You may want to reset the sequence after deletion
-- Note: This is only needed if you have triggers generating sequential IDs

-- ============================================
-- VERIFICATION: Check what's left
-- ============================================
SELECT 
  'applications' as table_name,
  COUNT(*) as row_count
FROM applications
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'offers', COUNT(*) FROM offers
UNION ALL
SELECT 'packages', COUNT(*) FROM packages
UNION ALL
SELECT 'promotions', COUNT(*) FROM promotions
UNION ALL
SELECT 'insurance_rates', COUNT(*) FROM insurance_rates
UNION ALL
SELECT 'payment_schedules', COUNT(*) FROM payment_schedules
UNION ALL
SELECT 'payment_transactions', COUNT(*) FROM payment_transactions
UNION ALL
SELECT 'payment_deferrals', COUNT(*) FROM payment_deferrals
UNION ALL
SELECT 'ledgers', COUNT(*) FROM ledgers
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
ORDER BY table_name;

