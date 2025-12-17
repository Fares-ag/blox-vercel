-- ============================================
-- Migration: Change IDs to simple format for all entities
-- ============================================
-- Run this in Supabase SQL Editor
-- This will update: applications, offers, packages
-- ============================================

-- ============================================
-- APPLICATIONS: application-1, application-2, etc.
-- ============================================

-- Function to get next application number
CREATE OR REPLACE FUNCTION get_next_application_number()
RETURNS INTEGER AS $$
DECLARE
  max_num INTEGER;
BEGIN
  SELECT COALESCE(
    MAX(
      CASE 
        WHEN id::TEXT ~ '^application-[0-9]+$' THEN 
          CAST(SUBSTRING(id::TEXT FROM 'application-([0-9]+)') AS INTEGER)
        ELSE 0
      END
    ), 0
  ) INTO max_num
  FROM applications;
  
  RETURN max_num + 1;
END;
$$ LANGUAGE plpgsql;

-- Create mapping for applications
CREATE TEMP TABLE IF NOT EXISTS app_id_mapping AS
SELECT 
  id as old_id, 
  ROW_NUMBER() OVER (ORDER BY created_at) as new_num
FROM applications
ORDER BY created_at;

-- Add new ID column
ALTER TABLE applications ADD COLUMN IF NOT EXISTS id_new TEXT;

-- Generate new IDs
UPDATE applications a
SET id_new = 'application-' || am.new_num::TEXT
FROM app_id_mapping am
WHERE a.id::TEXT = am.old_id::TEXT;

-- Drop foreign key constraints
ALTER TABLE payment_schedules DROP CONSTRAINT IF EXISTS payment_schedules_application_id_fkey;
ALTER TABLE payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_application_id_fkey;
ALTER TABLE payment_deferrals DROP CONSTRAINT IF EXISTS payment_deferrals_application_id_fkey;
ALTER TABLE ledgers DROP CONSTRAINT IF EXISTS ledgers_application_id_fkey;

-- Drop primary key
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_pkey;

-- Replace ID column
ALTER TABLE applications DROP COLUMN IF EXISTS id;
ALTER TABLE applications RENAME COLUMN id_new TO id;
ALTER TABLE applications ALTER COLUMN id TYPE TEXT;
ALTER TABLE applications ADD PRIMARY KEY (id);

-- Update foreign key columns
ALTER TABLE payment_schedules ALTER COLUMN application_id TYPE TEXT USING application_id::TEXT;
ALTER TABLE payment_transactions ALTER COLUMN application_id TYPE TEXT USING application_id::TEXT;
ALTER TABLE payment_deferrals ALTER COLUMN application_id TYPE TEXT USING application_id::TEXT;
ALTER TABLE ledgers ALTER COLUMN application_id TYPE TEXT USING application_id::TEXT;

-- Recreate foreign keys
ALTER TABLE payment_schedules 
  ADD CONSTRAINT payment_schedules_application_id_fkey 
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;

ALTER TABLE payment_transactions 
  ADD CONSTRAINT payment_transactions_application_id_fkey 
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;

ALTER TABLE payment_deferrals 
  ADD CONSTRAINT payment_deferrals_application_id_fkey 
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;

ALTER TABLE ledgers 
  ADD CONSTRAINT ledgers_application_id_fkey 
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL;

-- Create trigger for applications
CREATE OR REPLACE FUNCTION set_application_id()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    next_num := get_next_application_number();
    NEW.id := 'application-' || next_num::TEXT;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_application_id_trigger ON applications;
CREATE TRIGGER set_application_id_trigger
  BEFORE INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION set_application_id();

-- ============================================
-- OFFERS: offer-1, offer-2, etc.
-- ============================================

-- Function to get next offer number
CREATE OR REPLACE FUNCTION get_next_offer_number()
RETURNS INTEGER AS $$
DECLARE
  max_num INTEGER;
BEGIN
  SELECT COALESCE(
    MAX(
      CASE 
        WHEN id::TEXT ~ '^offer-[0-9]+$' THEN 
          CAST(SUBSTRING(id::TEXT FROM 'offer-([0-9]+)') AS INTEGER)
        ELSE 0
      END
    ), 0
  ) INTO max_num
  FROM offers;
  
  RETURN max_num + 1;
END;
$$ LANGUAGE plpgsql;

-- Create mapping for offers
CREATE TEMP TABLE IF NOT EXISTS offer_id_mapping AS
SELECT 
  id as old_id, 
  ROW_NUMBER() OVER (ORDER BY created_at) as new_num
FROM offers
ORDER BY created_at;

-- Add new ID column
ALTER TABLE offers ADD COLUMN IF NOT EXISTS id_new TEXT;

-- Generate new IDs
UPDATE offers o
SET id_new = 'offer-' || om.new_num::TEXT
FROM offer_id_mapping om
WHERE o.id::TEXT = om.old_id::TEXT;

-- Drop foreign key constraints
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_offer_id_fkey;

-- Drop primary key
ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_pkey;

-- Replace ID column
ALTER TABLE offers DROP COLUMN IF EXISTS id;
ALTER TABLE offers RENAME COLUMN id_new TO id;
ALTER TABLE offers ALTER COLUMN id TYPE TEXT;
ALTER TABLE offers ADD PRIMARY KEY (id);

-- Update foreign key in applications
ALTER TABLE applications ALTER COLUMN offer_id TYPE TEXT USING offer_id::TEXT;

-- Recreate foreign key
ALTER TABLE applications 
  ADD CONSTRAINT applications_offer_id_fkey 
  FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE SET NULL;

-- Create trigger for offers
CREATE OR REPLACE FUNCTION set_offer_id()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    next_num := get_next_offer_number();
    NEW.id := 'offer-' || next_num::TEXT;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_offer_id_trigger ON offers;
CREATE TRIGGER set_offer_id_trigger
  BEFORE INSERT ON offers
  FOR EACH ROW
  EXECUTE FUNCTION set_offer_id();

-- ============================================
-- PACKAGES: package-1, package-2, etc.
-- ============================================

-- Function to get next package number
CREATE OR REPLACE FUNCTION get_next_package_number()
RETURNS INTEGER AS $$
DECLARE
  max_num INTEGER;
BEGIN
  SELECT COALESCE(
    MAX(
      CASE 
        WHEN id::TEXT ~ '^package-[0-9]+$' THEN 
          CAST(SUBSTRING(id::TEXT FROM 'package-([0-9]+)') AS INTEGER)
        ELSE 0
      END
    ), 0
  ) INTO max_num
  FROM packages;
  
  RETURN max_num + 1;
END;
$$ LANGUAGE plpgsql;

-- Create mapping for packages
CREATE TEMP TABLE IF NOT EXISTS package_id_mapping AS
SELECT 
  id as old_id, 
  ROW_NUMBER() OVER (ORDER BY created_at) as new_num
FROM packages
ORDER BY created_at;

-- Add new ID column
ALTER TABLE packages ADD COLUMN IF NOT EXISTS id_new TEXT;

-- Generate new IDs
UPDATE packages p
SET id_new = 'package-' || pm.new_num::TEXT
FROM package_id_mapping pm
WHERE p.id::TEXT = pm.old_id::TEXT;

-- Drop primary key
ALTER TABLE packages DROP CONSTRAINT IF EXISTS packages_pkey;

-- Replace ID column
ALTER TABLE packages DROP COLUMN IF EXISTS id;
ALTER TABLE packages RENAME COLUMN id_new TO id;
ALTER TABLE packages ALTER COLUMN id TYPE TEXT;
ALTER TABLE packages ADD PRIMARY KEY (id);

-- Create trigger for packages
CREATE OR REPLACE FUNCTION set_package_id()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    next_num := get_next_package_number();
    NEW.id := 'package-' || next_num::TEXT;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_package_id_trigger ON packages;
CREATE TRIGGER set_package_id_trigger
  BEFORE INSERT ON packages
  FOR EACH ROW
  EXECUTE FUNCTION set_package_id();

-- Clean up
DROP TABLE IF EXISTS app_id_mapping;
DROP TABLE IF EXISTS offer_id_mapping;
DROP TABLE IF EXISTS package_id_mapping;

-- ============================================
-- ✅ Migration Complete!
-- ============================================
-- Applications: application-1, application-2, etc.
-- Offers: offer-1, offer-2, etc.
-- Packages: package-1, package-2, etc.
-- ============================================

