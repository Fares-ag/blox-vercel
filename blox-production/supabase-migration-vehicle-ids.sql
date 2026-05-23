-- ============================================
-- Migration: Change Products ID to vehicle-1, vehicle-2 format
-- ============================================
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Create function to get next vehicle number
CREATE OR REPLACE FUNCTION get_next_vehicle_number()
RETURNS INTEGER AS $$
DECLARE
  max_num INTEGER;
BEGIN
  SELECT COALESCE(
    MAX(
      CASE 
        WHEN id::TEXT ~ '^vehicle-[0-9]+$' THEN 
          CAST(SUBSTRING(id::TEXT FROM 'vehicle-([0-9]+)') AS INTEGER)
        ELSE 0
      END
    ), 0
  ) INTO max_num
  FROM products;
  
  RETURN max_num + 1;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create temporary mapping table
CREATE TEMP TABLE id_mapping AS
SELECT 
  id as old_id, 
  ROW_NUMBER() OVER (ORDER BY created_at) as new_num
FROM products
ORDER BY created_at;

-- Step 3: Add new ID column
ALTER TABLE products ADD COLUMN IF NOT EXISTS id_new TEXT;

-- Step 4: Generate new IDs for existing records
UPDATE products p
SET id_new = 'vehicle-' || im.new_num::TEXT
FROM id_mapping im
WHERE p.id::TEXT = im.old_id::TEXT;

-- Step 5: Handle foreign key constraints
-- Drop foreign key constraint temporarily
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_vehicle_id_fkey;

-- Step 6: Drop old primary key
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_pkey;

-- Step 7: Remove old ID column and rename new one
ALTER TABLE products DROP COLUMN IF EXISTS id;
ALTER TABLE products RENAME COLUMN id_new TO id;

-- Step 8: Change ID column type to TEXT (if not already)
ALTER TABLE products ALTER COLUMN id TYPE TEXT;

-- Step 9: Recreate primary key
ALTER TABLE products ADD PRIMARY KEY (id);

-- Step 10: Update applications vehicle_id to TEXT
ALTER TABLE applications ALTER COLUMN vehicle_id TYPE TEXT USING vehicle_id::TEXT;

-- Step 11: Recreate foreign key
ALTER TABLE applications 
  ADD CONSTRAINT applications_vehicle_id_fkey 
  FOREIGN KEY (vehicle_id) 
  REFERENCES products(id) 
  ON DELETE SET NULL;

-- Step 12: Create trigger for auto-generating IDs
CREATE OR REPLACE FUNCTION set_vehicle_id()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    next_num := get_next_vehicle_number();
    NEW.id := 'vehicle-' || next_num::TEXT;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_vehicle_id_trigger ON products;
CREATE TRIGGER set_vehicle_id_trigger
  BEFORE INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION set_vehicle_id();

-- Clean up
DROP TABLE IF EXISTS id_mapping;

-- ============================================
-- ✅ Migration Complete!
-- ============================================
-- Your existing product should now be: vehicle-1
-- New products will get: vehicle-2, vehicle-3, etc.
-- ============================================
