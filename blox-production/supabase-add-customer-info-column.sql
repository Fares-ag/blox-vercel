-- Add customer_info column to applications table
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS customer_info JSONB;

-- Add comment to document the column
COMMENT ON COLUMN applications.customer_info IS 'Detailed customer information including personal details, address, employment, and income information';

