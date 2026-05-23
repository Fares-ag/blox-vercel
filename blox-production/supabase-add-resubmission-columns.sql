-- ============================================
-- Add Resubmission Columns to Applications Table
-- ============================================
-- Run this script in Supabase Dashboard -> SQL Editor
-- ============================================

-- Add resubmission_comments column
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS resubmission_comments TEXT;

-- Add resubmission_date column
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS resubmission_date TIMESTAMPTZ;

-- Add comments to document the columns
COMMENT ON COLUMN applications.resubmission_comments IS 'Comments from admin when requesting resubmission (e.g., wrong document uploaded)';
COMMENT ON COLUMN applications.resubmission_date IS 'Date when resubmission was requested by admin';

