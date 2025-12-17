-- ============================================
-- Fix: Change insurance_rates.id and offers.insurance_rate_id to TEXT
-- ============================================
-- Run this in Supabase SQL Editor
-- This allows simple IDs like "INS001" instead of UUIDs
-- ============================================

-- ============================================
-- STEP 1: Update insurance_rates table
-- ============================================

-- Drop foreign key constraint from offers table first
ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_insurance_rate_id_fkey;

-- Change insurance_rates.id from UUID to TEXT
ALTER TABLE insurance_rates DROP CONSTRAINT IF EXISTS insurance_rates_pkey;
ALTER TABLE insurance_rates ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE insurance_rates ADD PRIMARY KEY (id);

-- ============================================
-- STEP 2: Update offers.insurance_rate_id to TEXT
-- ============================================

-- Change offers.insurance_rate_id from UUID to TEXT
ALTER TABLE offers ALTER COLUMN insurance_rate_id TYPE TEXT USING insurance_rate_id::TEXT;

-- Recreate foreign key constraint
ALTER TABLE offers 
  ADD CONSTRAINT offers_insurance_rate_id_fkey 
  FOREIGN KEY (insurance_rate_id) REFERENCES insurance_rates(id) ON DELETE SET NULL;

-- ============================================
-- ✅ Done!
-- ============================================
-- Now insurance_rates can use simple IDs like "INS001"
-- And offers.insurance_rate_id will accept TEXT values
-- ============================================

