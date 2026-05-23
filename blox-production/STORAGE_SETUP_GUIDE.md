# Supabase Storage Setup Guide

## Problem
When customers try to upload documents, they get this error:
```
StorageApiError: new row violates row-level security policy
```

This happens because the `documents` storage bucket doesn't have RLS policies configured to allow customer uploads.

## Solution

### Step 1: Create the Storage Bucket (if it doesn't exist)

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"**
4. Configure:
   - **Name**: `documents`
   - **Public**: `false` (private bucket)
   - **File size limit**: `50MB` (or as needed)
   - **Allowed MIME types**: `image/*, application/pdf`
5. Click **"Create bucket"**

### Step 2: Run the Storage Policies SQL Script

1. Go to **SQL Editor** in Supabase Dashboard
2. Open the file `supabase-storage-policies.sql`
3. Copy and paste the entire script
4. Click **"Run"** to execute

This script will:
- Create helper functions to check application ownership
- Create RLS policies that allow:
  - Customers to upload/read/update/delete documents in their own application folders
  - Admins to manage all documents
  - Secure access based on application ownership

### Step 3: Verify the Setup

After running the script, test by:

1. **As a Customer**:
   - Try uploading a document to an application you own
   - Should work without errors

2. **As an Admin**:
   - Try uploading/reading documents for any application
   - Should work without errors

### Step 4: Troubleshooting

If you still get RLS errors:

1. **Check bucket exists**:
   ```sql
   SELECT * FROM storage.buckets WHERE name = 'documents';
   ```

2. **Check policies are created**:
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'objects' 
   AND schemaname = 'storage';
   ```

3. **Verify user owns application**:
   ```sql
   -- Replace with actual values
   SELECT user_owns_application('your-application-id');
   ```

4. **Check application customer email**:
   ```sql
   SELECT id, customer_email 
   FROM applications 
   WHERE id = 'your-application-id';
   ```

5. **Verify user email matches**:
   ```sql
   SELECT auth.jwt() ->> 'email' as current_user_email;
   ```

## Alternative: Simpler Policy (Less Secure)

If the above doesn't work, you can use a simpler policy that allows all authenticated users to upload to the documents bucket. **⚠️ WARNING: This is less secure and should only be used for testing.**

```sql
-- Simple policy: Allow all authenticated users to manage documents
CREATE POLICY "Authenticated users can manage documents"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');
```

## File Path Structure

The storage policies expect files to be organized as:
- `application-documents/{applicationId}/{filename}` - Customer documents
- `payment-proofs/{applicationId}-{index}-{timestamp}.{ext}` - Payment proofs

Make sure your code uses these path formats when uploading files.

## Security Notes

- The policies ensure customers can only access documents for applications they own
- Admins have full access to all documents
- All access is logged and auditable through Supabase
- Files are stored in a private bucket (not publicly accessible)

