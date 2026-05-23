-- Balloon Payment Schema Updates
-- This script adds support for balloon payment structures in the payment system

-- Add payment_type column to track payment types (down_payment, installment, balloon_payment)
-- Note: This assumes you have a payment_schedules table. Adjust table name as needed.
-- If using Supabase's built-in tables, you may need to add this via the dashboard or adjust accordingly.

-- Example: If you have a custom payment_schedules table
-- ALTER TABLE payment_schedules 
-- ADD COLUMN IF NOT EXISTS payment_type VARCHAR(20) DEFAULT 'installment' 
-- CHECK (payment_type IN ('down_payment', 'installment', 'balloon_payment'));

-- ALTER TABLE payment_schedules
-- ADD COLUMN IF NOT EXISTS is_balloon BOOLEAN DEFAULT FALSE;

-- Add index for better query performance
-- CREATE INDEX IF NOT EXISTS idx_payment_schedules_payment_type ON payment_schedules(payment_type);
-- CREATE INDEX IF NOT EXISTS idx_payment_schedules_is_balloon ON payment_schedules(is_balloon);

-- Note: The actual table structure depends on your Supabase setup.
-- If payments are stored in application.installmentPlan.schedule (JSONB), 
-- the payment_type and isBalloon fields are already supported in the TypeScript models.
-- This SQL is for cases where you have a separate payment_schedules table.

-- For JSONB storage (current implementation), no schema changes are needed
-- as the payment_type and isBalloon fields are stored within the schedule JSON.
