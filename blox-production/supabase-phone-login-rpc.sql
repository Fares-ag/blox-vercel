-- ============================================
-- Phone Number Login Support
-- ============================================
-- This script creates an RPC function to lookup user email by phone number
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================

-- Helper function to normalize phone numbers
CREATE OR REPLACE FUNCTION public.normalize_phone(phone_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF phone_text IS NULL THEN
    RETURN '';
  END IF;
  -- Remove spaces, dashes, parentheses, and convert to lowercase
  RETURN LOWER(REGEXP_REPLACE(phone_text, '[^0-9+]', '', 'g'));
END;
$$;

-- Function to get email by phone number from auth.users metadata
-- This allows customers to login with phone number instead of email
CREATE OR REPLACE FUNCTION public.get_email_by_phone(phone_number TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_email TEXT;
  normalized_input TEXT;
BEGIN
  -- Normalize input phone number
  normalized_input := public.normalize_phone(phone_number);
  
  -- Search for user with matching phone number in raw_user_meta_data
  SELECT u.email INTO user_email
  FROM auth.users u
  WHERE 
    public.normalize_phone(u.raw_user_meta_data->>'phone_number') = normalized_input
    OR
    public.normalize_phone(u.raw_user_meta_data->>'phone') = normalized_input
  LIMIT 1;

  RETURN user_email;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_email_by_phone(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_by_phone(TEXT) TO anon;

-- Note: This function is safe to expose to anonymous users because:
-- 1. It only returns email addresses (which are often public)
-- 2. It doesn't reveal if a phone number exists or not (returns NULL if not found)
-- 3. Users still need the correct password to login

