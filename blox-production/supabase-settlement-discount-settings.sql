-- ============================================
-- SETTLEMENT DISCOUNT SETTINGS TABLE
-- ============================================
-- This table stores admin-configurable settings for early payment settlement discounts
-- ============================================

CREATE TABLE IF NOT EXISTS settlement_discount_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL DEFAULT 'Default Settlement Discount Settings',
  description TEXT,
  
  -- Principal Discount Settings
  principal_discount_enabled BOOLEAN DEFAULT FALSE,
  principal_discount_type VARCHAR(20) CHECK (principal_discount_type IN ('percentage', 'fixed')) DEFAULT 'percentage',
  principal_discount_value DECIMAL(10, 2) DEFAULT 0,
  principal_discount_min_amount DECIMAL(12, 2) DEFAULT 0,
  
  -- Interest/Rent Discount Settings
  interest_discount_enabled BOOLEAN DEFAULT FALSE,
  interest_discount_type VARCHAR(20) CHECK (interest_discount_type IN ('percentage', 'fixed')) DEFAULT 'percentage',
  interest_discount_value DECIMAL(10, 2) DEFAULT 0,
  interest_discount_min_amount DECIMAL(12, 2) DEFAULT 0,
  
  -- General Settings
  is_active BOOLEAN DEFAULT TRUE,
  min_settlement_amount DECIMAL(12, 2) DEFAULT 0,
  min_remaining_payments INTEGER DEFAULT 1,
  max_discount_amount DECIMAL(12, 2) DEFAULT NULL,
  max_discount_percentage DECIMAL(5, 2) DEFAULT NULL,
  
  -- Tiered Discount Settings (JSONB for flexibility)
  -- Based on "months early" - how many months early the customer is paying (Total Tenure - Months Into Loan)
  -- Minimum 1 month early required to qualify for any discount
  -- Example: 1-12 months early, 13-24 months early, 25-30 months early, 31+ months early
  tiered_discounts JSONB DEFAULT '[]'::jsonb,
  -- Example structure: [{"minMonthsEarly": 1, "maxMonthsEarly": 12, "principalDiscount": 0, "interestDiscount": 5, "principalDiscountType": "percentage", "interestDiscountType": "percentage"}, ...]
  
  -- Date Range Settings (for promotional periods)
  valid_from DATE DEFAULT NULL,
  valid_until DATE DEFAULT NULL,
  
  -- Priority (higher priority settings override lower ones)
  priority INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add missing columns if they don't exist (for existing tables)
DO $$ 
BEGIN
  -- Add max_discount_amount if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'settlement_discount_settings' 
    AND column_name = 'max_discount_amount'
  ) THEN
    ALTER TABLE settlement_discount_settings 
    ADD COLUMN max_discount_amount DECIMAL(12, 2) DEFAULT NULL;
  END IF;

  -- Add max_discount_percentage if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'settlement_discount_settings' 
    AND column_name = 'max_discount_percentage'
  ) THEN
    ALTER TABLE settlement_discount_settings 
    ADD COLUMN max_discount_percentage DECIMAL(5, 2) DEFAULT NULL;
  END IF;

  -- Add use_tiered_discounts if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'settlement_discount_settings' 
    AND column_name = 'use_tiered_discounts'
  ) THEN
    ALTER TABLE settlement_discount_settings 
    ADD COLUMN use_tiered_discounts BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add valid_from if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'settlement_discount_settings' 
    AND column_name = 'valid_from'
  ) THEN
    ALTER TABLE settlement_discount_settings 
    ADD COLUMN valid_from DATE DEFAULT NULL;
  END IF;

  -- Add valid_until if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'settlement_discount_settings' 
    AND column_name = 'valid_until'
  ) THEN
    ALTER TABLE settlement_discount_settings 
    ADD COLUMN valid_until DATE DEFAULT NULL;
  END IF;

  -- Add priority if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'settlement_discount_settings' 
    AND column_name = 'priority'
  ) THEN
    ALTER TABLE settlement_discount_settings 
    ADD COLUMN priority INTEGER DEFAULT 0;
  END IF;

  -- Add tiered_discounts if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'settlement_discount_settings' 
    AND column_name = 'tiered_discounts'
  ) THEN
    ALTER TABLE settlement_discount_settings 
    ADD COLUMN tiered_discounts JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Create a default settings record
INSERT INTO settlement_discount_settings (
  id,
  name,
  description,
  principal_discount_enabled,
  principal_discount_type,
  principal_discount_value,
  interest_discount_enabled,
  interest_discount_type,
  interest_discount_value,
  is_active
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Settlement Discount Settings',
  'Default settings for early payment settlement discounts',
  FALSE,
  'percentage',
  0,
  FALSE,
  'percentage',
  0,
  TRUE
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE settlement_discount_settings ENABLE ROW LEVEL SECURITY;

-- Create or replace is_admin() function if it doesn't exist
-- This function uses SECURITY DEFINER to access auth.users table
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_email TEXT;
BEGIN
  -- Fast path: check JWT claims (if present)
  IF (auth.jwt() ->> 'role') = 'admin' OR (auth.jwt() ->> 'user_role') = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- PRIMARY: Check the public.users table (where we store roles)
  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();

  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Fallback: check by email in public.users table
  user_email := auth.jwt() ->> 'email';
  IF user_email IS NOT NULL THEN
    SELECT role INTO user_role
    FROM public.users
    WHERE LOWER(email) = LOWER(user_email);

    IF user_role = 'admin' THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- Legacy fallback: check auth.users.raw_user_meta_data (for backwards compatibility)
  -- This requires SECURITY DEFINER to access auth.users
  SELECT COALESCE(raw_user_meta_data->>'role', raw_user_meta_data->>'user_role')
    INTO user_role
  FROM auth.users
  WHERE id = auth.uid();

  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Admins can read settlement discount settings" ON settlement_discount_settings;
DROP POLICY IF EXISTS "Admins can insert settlement discount settings" ON settlement_discount_settings;
DROP POLICY IF EXISTS "Admins can update settlement discount settings" ON settlement_discount_settings;
DROP POLICY IF EXISTS "Admins can delete settlement discount settings" ON settlement_discount_settings;

-- Policy: Only admins can read settings
CREATE POLICY "Admins can read settlement discount settings"
  ON settlement_discount_settings
  FOR SELECT
  USING (is_admin());

-- Policy: Only admins can insert settings
CREATE POLICY "Admins can insert settlement discount settings"
  ON settlement_discount_settings
  FOR INSERT
  WITH CHECK (is_admin());

-- Policy: Only admins can update settings
CREATE POLICY "Admins can update settlement discount settings"
  ON settlement_discount_settings
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Policy: Only admins can delete settings
CREATE POLICY "Admins can delete settlement discount settings"
  ON settlement_discount_settings
  FOR DELETE
  USING (is_admin());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON settlement_discount_settings TO authenticated;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_settlement_discount_settings_active ON settlement_discount_settings(is_active) WHERE is_active = TRUE;

