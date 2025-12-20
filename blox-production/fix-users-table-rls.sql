-- ============================================
-- Fix Users Table RLS Policies
-- ============================================
-- This script enables access to the users table for authenticated users
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================

-- Enable RLS on users table (if not already enabled)
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can read role" ON public.users;
DROP POLICY IF EXISTS "Authenticated can read users" ON public.users;

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


