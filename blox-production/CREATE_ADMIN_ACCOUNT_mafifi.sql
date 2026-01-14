-- ============================================
-- Create/Update Admin Account for mafifi@q-auto.com
-- ============================================
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================

-- Step 1: Check if user exists
SELECT 
  id,
  email,
  email_confirmed_at,
  raw_user_meta_data->>'role' as current_role,
  CASE 
    WHEN email_confirmed_at IS NOT NULL AND raw_user_meta_data->>'role' = 'admin' 
      THEN '✅ Already set up correctly'
    WHEN email_confirmed_at IS NULL 
      THEN '⚠️ Email not confirmed'
    WHEN raw_user_meta_data->>'role' != 'admin' 
      THEN '⚠️ Not admin role'
    ELSE '❌ Needs setup'
  END as status
FROM auth.users
WHERE email = 'mafifi@q-auto.com';

-- Step 2: Update user to admin and confirm email (if user exists)
-- This will work if the user was created via signup or dashboard
UPDATE auth.users
SET 
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'role', 'admin',
      'user_role', 'admin'
    ),
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  confirmed_at = COALESCE(confirmed_at, NOW()),
  updated_at = NOW()
WHERE email = 'mafifi@q-auto.com';

-- Step 3: Verify the update
SELECT 
  email,
  email_confirmed_at IS NOT NULL as is_confirmed,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'user_role' as user_role,
  CASE 
    WHEN raw_user_meta_data->>'role' = 'admin' AND email_confirmed_at IS NOT NULL 
      THEN '✅ Admin account ready'
    ELSE '⚠️ Check setup'
  END as status
FROM auth.users
WHERE email = 'mafifi@q-auto.com';

-- ============================================
-- IMPORTANT: If user doesn't exist yet
-- ============================================
-- You need to create the user first using one of these methods:
--
-- METHOD 1: Supabase Dashboard (Recommended)
-- 1. Go to Supabase Dashboard -> Authentication -> Users
-- 2. Click "Add User" or "Invite User"
-- 3. Email: mafifi@q-auto.com
-- 4. Password: Set a secure password
-- 5. ✅ Check "Auto Confirm User"
-- 6. User Metadata: {"role": "admin", "user_role": "admin"}
-- 7. Click "Create User"
-- 8. Then run this script again to verify
--
-- METHOD 2: Use Supabase Admin API
-- See CREATE_ADMIN_ACCOUNT_SIMPLE.md for API example
