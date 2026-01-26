-- ============================================
-- VERIFY: Super Admin Role for ahmed@blox.market
-- ============================================
-- This script verifies that the super admin role is correctly set
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================

-- Check the user's role in auth.users
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'user_role' as user_role,
  raw_user_meta_data as full_metadata,
  confirmed_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'ahmed@blox.market';

-- Check if is_super_admin() would return TRUE for this user
-- (Note: This needs to be run in the context of that user's session)
-- For now, we'll manually check:
SELECT 
  id,
  email,
  CASE 
    WHEN raw_user_meta_data->>'role' = 'super_admin' THEN 'YES - role field'
    WHEN raw_user_meta_data->>'user_role' = 'super_admin' THEN 'YES - user_role field'
    ELSE 'NO - not set as super_admin'
  END as is_super_admin_check
FROM auth.users
WHERE email = 'ahmed@blox.market';

-- If the role is not set, update it:
-- UPDATE auth.users
-- SET raw_user_meta_data = jsonb_set(
--   COALESCE(raw_user_meta_data, '{}'::jsonb),
--   '{role}',
--   '"super_admin"'
-- )
-- WHERE email = 'ahmed@blox.market';
