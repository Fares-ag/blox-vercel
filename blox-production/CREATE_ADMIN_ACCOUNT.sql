-- ============================================
-- Create Auto-Confirmed Admin Account
-- ============================================
-- This script creates an admin account with auto-confirmed email
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================

-- IMPORTANT: You need to set a password for this account
-- After running this script, you can either:
-- 1. Use Supabase Dashboard -> Authentication -> Users -> Reset Password
-- 2. Or use the Supabase Admin API to set the password
-- ============================================

-- Step 1: Create the admin user in auth.users
-- Note: This requires using Supabase Admin API or creating via auth.signUp first
-- Since we can't directly insert into auth.users via SQL (it's protected),
-- we'll use the Supabase Admin API approach or create a helper function

-- ============================================
-- OPTION 1: Using Supabase Admin API (Recommended)
-- ============================================
-- Run this in your backend or use Supabase Dashboard -> Authentication -> Users -> Add User
-- Then run the UPDATE query below to set the role and confirm email

-- ============================================
-- OPTION 2: Create user via SQL (if you have admin access)
-- ============================================
-- This requires superuser access to auth schema
-- Replace 'YOUR_SECURE_PASSWORD_HASH' with a bcrypt hash of your password
-- You can generate one at: https://bcrypt-generator.com/ (rounds: 10)

-- First, let's check if the user already exists
DO $$
DECLARE
  user_exists BOOLEAN;
  user_id UUID;
BEGIN
  -- Check if user exists
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE email = 'mafifi@q-auto.com'
  ) INTO user_exists;
  
  IF user_exists THEN
    RAISE NOTICE 'User already exists. Updating role and confirmation status...';
    
    -- Update existing user to admin and confirm email
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
    
    RAISE NOTICE 'Admin account updated successfully!';
  ELSE
    RAISE NOTICE 'User does not exist. Please create the user first using one of these methods:';
    RAISE NOTICE '1. Supabase Dashboard -> Authentication -> Users -> Add User';
    RAISE NOTICE '2. Use Supabase Admin API';
    RAISE NOTICE '3. Sign up normally, then run this script again';
  END IF;
END $$;

-- ============================================
-- Step 2: Verify the admin account was created/updated
-- ============================================
SELECT 
  id,
  email,
  email_confirmed_at,
  confirmed_at,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'user_role' as user_role,
  created_at,
  updated_at,
  CASE 
    WHEN raw_user_meta_data->>'role' = 'admin' AND email_confirmed_at IS NOT NULL 
      THEN '✅ Admin (Confirmed)'
    WHEN raw_user_meta_data->>'role' = 'admin' AND email_confirmed_at IS NULL 
      THEN '⚠️ Admin (Not Confirmed)'
    WHEN email_confirmed_at IS NOT NULL 
      THEN '✅ Confirmed (Not Admin)'
    ELSE '❌ Not Set Up'
  END as status
FROM auth.users
WHERE email = 'mafifi@q-auto.com';

-- ============================================
-- Step 3: Set password (if user was just created)
-- ============================================
-- After creating the user, you need to set a password
-- Option A: Use Supabase Dashboard
--   1. Go to Authentication -> Users
--   2. Find the user mafifi@q-auto.com
--   3. Click "Reset Password" or "Send Password Reset Email"
--
-- Option B: Use Supabase Admin API (from your backend)
--   POST https://your-project.supabase.co/auth/v1/admin/users
--   {
--     "email": "mafifi@q-auto.com",
--     "password": "your-secure-password",
--     "email_confirm": true,
--     "user_metadata": {
--       "role": "admin"
--     }
--   }

-- ============================================
-- INSTRUCTIONS FOR CREATING THE USER
-- ============================================
-- Since we can't directly insert into auth.users via SQL (it's a protected system table),
-- you need to create the user first using one of these methods:

-- METHOD 1: Supabase Dashboard (Easiest)
-- 1. Go to Supabase Dashboard -> Authentication -> Users
-- 2. Click "Add User" or "Invite User"
-- 3. Enter email: mafifi@q-auto.com
-- 4. Set a temporary password (user will need to change it on first login)
-- 5. Check "Auto Confirm User" checkbox
-- 6. In "User Metadata", add: {"role": "admin", "user_role": "admin"}
-- 7. Click "Create User"
-- 8. Then run the UPDATE query above to ensure everything is set correctly

-- METHOD 2: Supabase Admin API (Programmatic)
-- Use the Supabase Admin API from your backend or a script:
-- 
-- Example using curl:
-- curl -X POST 'https://YOUR_PROJECT.supabase.co/auth/v1/admin/users' \
--   -H "apikey: YOUR_SERVICE_ROLE_KEY" \
--   -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
--   -H "Content-Type: application/json" \
--   -d '{
--     "email": "mafifi@q-auto.com",
--     "password": "SecurePassword123!",
--     "email_confirm": true,
--     "user_metadata": {
--       "role": "admin",
--       "user_role": "admin"
--     }
--   }'

-- METHOD 3: Sign up normally, then update
-- 1. Use the signup form in your app with email: mafifi@q-auto.com
-- 2. After signup, run this script to update role and confirm email

-- ============================================
-- After creating the user, run this to verify:
-- ============================================
SELECT 
  email,
  email_confirmed_at IS NOT NULL as is_confirmed,
  raw_user_meta_data->>'role' as role,
  CASE 
    WHEN raw_user_meta_data->>'role' = 'admin' AND email_confirmed_at IS NOT NULL 
      THEN '✅ Ready to use'
    ELSE '⚠️ Needs setup'
  END as status
FROM auth.users
WHERE email = 'mafifi@q-auto.com';
