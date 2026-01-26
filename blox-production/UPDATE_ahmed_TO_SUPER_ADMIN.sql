-- ============================================
-- Update User to Super Admin
-- ============================================
-- This script updates an existing user (ahmed@blox.market)
-- to have super_admin role
-- ============================================

-- Update the user's role to super_admin
UPDATE auth.users
SET 
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'role', 'super_admin',
      'user_role', 'super_admin',
      'email_verified', true
    ),
  updated_at = NOW()
WHERE email = 'ahmed@blox.market'
  AND id = 'f16f4f3b-a2e1-40b0-8df5-7e665c05c32f';

-- Verification step - Check the updated user
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'user_role' as user_role,
  raw_user_meta_data->>'email_verified' as email_verified,
  updated_at,
  CASE 
    WHEN raw_user_meta_data->>'role' = 'super_admin' THEN '✅ Super Admin'
    WHEN raw_user_meta_data->>'role' = 'admin' THEN '👤 Admin'
    WHEN raw_user_meta_data->>'role' = 'customer' THEN '👤 Customer'
    ELSE '❌ No role set'
  END as status
FROM auth.users
WHERE email = 'ahmed@blox.market'
  AND id = 'f16f4f3b-a2e1-40b0-8df5-7e665c05c32f';

-- ============================================
-- Notes:
-- ============================================
-- 1. After running this script, the user will need to log out and log back in
--    for the role change to take effect in their session
-- 2. The user can now access the super admin portal at /super-admin
-- 3. Make sure the activity_logs table and RLS policies are set up
--    (run supabase-activity-logs-schema.sql if not already done)
