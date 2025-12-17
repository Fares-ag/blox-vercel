-- ============================================
-- QUICK FIX: Storage RLS Policies
-- ============================================
-- Run this FIRST to fix the storage upload error
-- ============================================

-- Step 1: Check if bucket exists (run this first to verify)
SELECT name, id, public, file_size_limit 
FROM storage.buckets 
WHERE name = 'documents';

-- If the bucket doesn't exist, you need to create it manually:
-- 1. Go to Supabase Dashboard -> Storage
-- 2. Click "New bucket"
-- 3. Name: "documents"
-- 4. Public: false (private)
-- 5. File size limit: 50MB
-- 6. Allowed MIME types: image/*, application/pdf

-- ============================================
-- Step 2: Create helper functions
-- ============================================

-- Function to check if user owns application
CREATE OR REPLACE FUNCTION user_owns_application(application_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
  app_customer_email TEXT;
BEGIN
  user_email := auth.jwt() ->> 'email';
  
  IF user_email IS NULL THEN
    RETURN FALSE;
  END IF;
  
  SELECT customer_email INTO app_customer_email
  FROM applications
  WHERE id::TEXT = application_id;
  
  IF app_customer_email IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN LOWER(user_email) = LOWER(app_customer_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to extract application ID from path
CREATE OR REPLACE FUNCTION extract_application_id_from_path(path TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Path format: application-documents/{applicationId}/{filename}
  IF path ~ '^application-documents/([^/]+)/' THEN
    RETURN (regexp_match(path, '^application-documents/([^/]+)/'))[1];
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if user can access storage path
CREATE OR REPLACE FUNCTION user_can_access_storage_path(path TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  app_id TEXT;
BEGIN
  app_id := extract_application_id_from_path(path);
  IF app_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN user_owns_application(app_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Step 3: Drop existing policies (if any)
-- ============================================
DROP POLICY IF EXISTS "Customers can upload to their applications" ON storage.objects;
DROP POLICY IF EXISTS "Customers can read their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Customers can update their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Customers can delete their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can manage documents" ON storage.objects;

-- ============================================
-- Step 4: Create Storage Policies
-- ============================================

-- Policy 1: Customers can upload to their own application folders
CREATE POLICY "Customers can upload to their applications"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (
    (name LIKE 'application-documents/%' AND user_can_access_storage_path(name))
    OR
    is_admin()
  )
);

-- Policy 2: Customers can read their own documents
CREATE POLICY "Customers can read their own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (
    (name LIKE 'application-documents/%' AND user_can_access_storage_path(name))
    OR
    (name LIKE 'payment-proofs/%' AND user_can_access_storage_path(name))
    OR
    is_admin()
  )
);

-- Policy 3: Customers can update their own documents
CREATE POLICY "Customers can update their own documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (
    (name LIKE 'application-documents/%' AND user_can_access_storage_path(name))
    OR
    is_admin()
  )
)
WITH CHECK (
  bucket_id = 'documents' AND
  (
    (name LIKE 'application-documents/%' AND user_can_access_storage_path(name))
    OR
    is_admin()
  )
);

-- Policy 4: Customers can delete their own documents
CREATE POLICY "Customers can delete their own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (
    (name LIKE 'application-documents/%' AND user_can_access_storage_path(name))
    OR
    is_admin()
  )
);

-- Policy 5: Admins can manage all documents
CREATE POLICY "Admins can manage all documents"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'documents' AND is_admin()
)
WITH CHECK (
  bucket_id = 'documents' AND is_admin()
);

-- ============================================
-- Step 5: Verify policies were created
-- ============================================
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;

-- ============================================
-- IMPORTANT NOTES:
-- ============================================
-- 1. Make sure the 'documents' bucket exists in Storage
-- 2. The bucket should be PRIVATE (not public)
-- 3. After running this script, try uploading a document again
-- 4. If you still get errors, check:
--    - Your user email matches the application's customer_email
--    - The application ID in the path is correct
--    - The bucket name is exactly 'documents' (case-sensitive)
-- ============================================

