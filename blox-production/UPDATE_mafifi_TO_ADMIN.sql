-- ============================================
-- Update mafifi@q-auto.com to Admin Account
-- ============================================
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================

-- Update the user to admin role
UPDATE auth.users
SET 
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'role', 'admin',
      'user_role', 'admin',
      'email_verified', true
    ),
  updated_at = NOW()
WHERE email = 'mafifi@q-auto.com'
  AND id = '1998b31b-be5d-4b2b-ae45-acfb9635b73b';

-- Verify the update
SELECT 
  id,
  email,
  email_confirmed_at IS NOT NULL as is_confirmed,
  confirmed_at IS NOT NULL as is_confirmed_v2,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'user_role' as user_role,
  raw_user_meta_data->>'email_verified' as email_verified,
  CASE 
    WHEN raw_user_meta_data->>'role' = 'admin' AND confirmed_at IS NOT NULL 
      THEN '✅ Admin account ready'
    WHEN raw_user_meta_data->>'role' = 'admin' 
      THEN '✅ Admin (check confirmation)'
    ELSE '⚠️ Not admin'
  END as status,
  created_at,
  updated_at
FROM auth.users
WHERE email = 'mafifi@q-auto.com'
  AND id = '1998b31b-be5d-4b2b-ae45-acfb9635b73b';

-- ============================================
-- IMPORTANT: After running this script
-- ============================================
-- The user MUST log out and log back in to get a new JWT token
-- with the admin role. The JWT is cached, so role changes require
-- re-authentication.
-- ============================================
