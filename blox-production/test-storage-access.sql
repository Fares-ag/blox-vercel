-- ============================================
-- Test Storage Access and Policies
-- ============================================
-- Run this to diagnose storage access issues
-- ============================================

-- 1. Check if bucket exists
SELECT 
  name,
  id,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE name = 'documents';

-- 2. Check current user email
SELECT 
  auth.jwt() ->> 'email' as current_user_email,
  auth.jwt() ->> 'role' as current_user_role,
  auth.uid() as current_user_id;

-- 3. Check if is_admin() function works
SELECT is_admin() as is_current_user_admin;

-- 4. Check existing storage policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;

-- 5. Test application ownership function
-- Replace 'your-application-id' with an actual application ID
SELECT 
  id,
  customer_email,
  user_owns_application(id::TEXT) as user_owns_this_app
FROM applications
LIMIT 5;

-- 6. Check if there are any existing files in the bucket
SELECT 
  name,
  bucket_id,
  owner,
  created_at,
  updated_at
FROM storage.objects
WHERE bucket_id = 'documents'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- If bucket doesn't exist, you'll need to create it manually
-- in Supabase Dashboard -> Storage
-- ============================================

