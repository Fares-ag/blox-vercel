-- ============================================
-- Add Chassis Number and Engine Number to Products
-- ============================================
-- This script adds chassis_number and engine_number columns to the products table
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================

-- Add chassis_number column
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS chassis_number VARCHAR(100);

-- Add engine_number column
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS engine_number VARCHAR(100);

-- Add indexes for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_products_chassis_number ON products(chassis_number);
CREATE INDEX IF NOT EXISTS idx_products_engine_number ON products(engine_number);

-- Add comments for documentation
COMMENT ON COLUMN products.chassis_number IS 'Vehicle chassis/VIN number';
COMMENT ON COLUMN products.engine_number IS 'Vehicle engine serial number';

