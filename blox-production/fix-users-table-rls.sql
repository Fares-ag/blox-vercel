-- ============================================
-- Fix Users Table RLS Policies
-- ============================================
-- This script creates the users table (if it doesn't exist) and enables access for authenticated users
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Sync existing auth users to public.users table
-- This ensures all existing users have a record in public.users
INSERT INTO public.users (id, email, role)
SELECT 
  u.id,
  u.email,
  COALESCE(
    u.raw_user_meta_data->>'role',
    u.raw_user_meta_data->>'user_role',
    'customer'
  )::TEXT as role
FROM auth.users u
ON CONFLICT (id) DO UPDATE
SET 
  role = COALESCE(
    EXCLUDED.role,
    (SELECT COALESCE(raw_user_meta_data->>'role', raw_user_meta_data->>'user_role', 'customer') FROM auth.users WHERE id = EXCLUDED.id)
  ),
  email = EXCLUDED.email,
  updated_at = NOW();

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile by email" ON public.users;
DROP POLICY IF EXISTS "Users can read role" ON public.users;
DROP POLICY IF EXISTS "Authenticated can read users" ON public.users;
DROP POLICY IF EXISTS "Authenticated can read user roles" ON public.users;

-- Policy: Users can read their own profile (by ID)
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT 
  USING (auth.uid() = id);

-- Policy: Users can read their own profile (by email)
CREATE POLICY "Users can read own profile by email" ON public.users
  FOR SELECT 
  USING (
    auth.role() = 'authenticated' AND
    LOWER(email) = LOWER(auth.jwt() ->> 'email')
  );

-- Policy: Authenticated users can read role field for any user
-- This is needed for the is_admin() function and role checks
CREATE POLICY "Authenticated can read user roles" ON public.users
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Grant necessary permissions
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT (id, email, role) ON public.users TO authenticated;

-- Create a function to sync users from auth.users to public.users
CREATE OR REPLACE FUNCTION public.sync_user_to_public_users()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'role',
      NEW.raw_user_meta_data->>'user_role',
      'customer'
    )::TEXT
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    role = COALESCE(
      EXCLUDED.role,
      COALESCE(
        NEW.raw_user_meta_data->>'role',
        NEW.raw_user_meta_data->>'user_role',
        public.users.role
      )
    ),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically sync new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_to_public_users();

-- Update existing users when their metadata changes
CREATE OR REPLACE FUNCTION public.update_user_role_from_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if role in metadata changed
  IF (OLD.raw_user_meta_data->>'role' IS DISTINCT FROM NEW.raw_user_meta_data->>'role') OR
     (OLD.raw_user_meta_data->>'user_role' IS DISTINCT FROM NEW.raw_user_meta_data->>'user_role') THEN
    UPDATE public.users
    SET 
      role = COALESCE(
        NEW.raw_user_meta_data->>'role',
        NEW.raw_user_meta_data->>'user_role',
        role
      )::TEXT,
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_metadata_updated ON auth.users;
CREATE TRIGGER on_auth_user_metadata_updated
  AFTER UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_role_from_metadata();


