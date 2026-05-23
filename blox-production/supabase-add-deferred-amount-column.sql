-- ============================================
-- Add deferred_amount and original_amount columns to payment_deferrals
-- ============================================
-- Run this script in Supabase Dashboard -> SQL Editor
-- ============================================

-- Add deferred_amount column (NULL means full deferral)
ALTER TABLE payment_deferrals
ADD COLUMN IF NOT EXISTS deferred_amount DECIMAL(12, 2);

-- Add original_amount column to track the original payment amount
ALTER TABLE payment_deferrals
ADD COLUMN IF NOT EXISTS original_amount DECIMAL(12, 2);

-- Add comments
COMMENT ON COLUMN payment_deferrals.deferred_amount IS 'Amount deferred. NULL means full payment is deferred.';
COMMENT ON COLUMN payment_deferrals.original_amount IS 'Original payment amount before deferral.';

