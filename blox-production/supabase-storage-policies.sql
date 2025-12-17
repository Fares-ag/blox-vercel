-- ============================================
-- Supabase Storage Bucket Policies for Documents
-- ============================================
-- This script sets up RLS policies for the 'documents' storage bucket
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================

-- ============================================
-- STEP 1: Ensure the 'documents' bucket exists
-- ============================================
-- Note: Buckets must be created manually in Supabase Dashboard -> Storage
-- If the bucket doesn't exist, create it first:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Click "New bucket"
-- 3. Name: "documents"
-- 4. Public: false (private bucket)
-- 5. File size limit: 50MB (or as needed)
-- 6. Allowed MIME types: image/*, application/pdf

-- ============================================
-- STEP 2: Enable RLS on the storage bucket
-- ============================================
-- Note: RLS is enabled by default on new buckets, but we'll ensure it's on
-- This is done via the Supabase Dashboard, but we'll document it here

-- ============================================
-- STEP 3: Helper function to check if user owns the application
-- ============================================
CREATE OR REPLACE FUNCTION user_owns_application(application_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
  app_customer_email TEXT;
BEGIN
  -- Get current user email
  user_email := auth.jwt() ->> 'email';
  
  IF user_email IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get application customer email
  SELECT customer_email INTO app_customer_email
  FROM applications
  WHERE id::TEXT = application_id;
  
  -- Check if emails match (case-insensitive)
  IF app_customer_email IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN LOWER(user_email) = LOWER(app_customer_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 4: Helper function to extract application ID from storage path
-- ============================================
CREATE OR REPLACE FUNCTION extract_application_id_from_path(path TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Path format: application-documents/{applicationId}/{filename}
  -- Extract the application ID (second segment)
  IF path ~ '^application-documents/([^/]+)/' THEN
    RETURN (regexp_match(path, '^application-documents/([^/]+)/'))[1];
  END IF;
  
  -- Also handle payment-proofs path: payment-proofs/{applicationId}-{index}-{timestamp}.{ext}
  IF path ~ '^payment-proofs/([^-]+)-' THEN
    RETURN (regexp_match(path, '^payment-proofs/([^-]+)-'))[1];
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- STEP 4b: Helper function to check if path belongs to user's application
-- ============================================
CREATE OR REPLACE FUNCTION user_can_access_storage_path(path TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  app_id TEXT;
BEGIN
  -- Extract application ID from path
  app_id := extract_application_id_from_path(path);
  
  IF app_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user owns the application
  RETURN user_owns_application(app_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 5: Drop existing policies (if any)
-- ============================================
DROP POLICY IF EXISTS "Customers can upload to their applications" ON storage.objects;
DROP POLICY IF EXISTS "Customers can read their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all documents" ON storage.objects;
DROP POLICY IF EXISTS "Customers can delete their own documents" ON storage.objects;

-- ============================================
-- STEP 6: Create Storage Policies
-- ============================================

-- Policy 1: Customers can upload documents to their own application folders
CREATE POLICY "Customers can upload to their applications"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (
    -- Allow uploads to application-documents/{applicationId}/...
    (name LIKE 'application-documents/%' AND
     user_can_access_storage_path(name))
    OR
    -- Allow admins to upload anywhere
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
    -- Allow reading from application-documents/{applicationId}/...
    (name LIKE 'application-documents/%' AND
     user_can_access_storage_path(name))
    OR
    -- Allow reading payment proofs for their applications
    (name LIKE 'payment-proofs/%' AND
     user_can_access_storage_path(name))
    OR
    -- Allow admins to read everything
    is_admin()
  )
);

-- Policy 3: Customers can update their own documents (for resubmissions)
CREATE POLICY "Customers can update their own documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (
    (name LIKE 'application-documents/%' AND
     user_can_access_storage_path(name))
    OR
    is_admin()
  )
)
WITH CHECK (
  bucket_id = 'documents' AND
  (
    (name LIKE 'application-documents/%' AND
     user_can_access_storage_path(name))
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
    (name LIKE 'application-documents/%' AND
     user_can_access_storage_path(name))
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
-- STEP 7: Verify policies are created
-- ============================================
-- Run this query to verify:
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- ============================================
-- NOTES:
-- ============================================
-- 1. Make sure the 'documents' bucket exists in Supabase Dashboard -> Storage
-- 2. The bucket should be PRIVATE (not public) for security
-- 3. File size limit should be set appropriately (e.g., 50MB)
-- 4. Allowed MIME types: image/*, application/pdf
-- 5. After running this script, test uploads from both customer and admin accounts
-- 6. If you need to allow public read access to certain documents, create a separate public bucket
-- ============================================

