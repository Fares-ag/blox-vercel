-- P0-7: Allow customer uploads/reads for signed-contracts/ and receipts/
-- Apply in Supabase SQL Editor after reviewing. Paths used by:
--   ContractSigningPage → signed-contracts/{applicationId}/...
--   PaymentPage         → receipts/{applicationId}/...
--
-- Relies on existing helpers: user_can_access_storage_path(name), is_admin()
-- from supabase-storage-policies.sql (extract_application_id_from_path must
-- accept these prefixes — see ALTER below).

-- Extend path extractor to support signed-contracts/ and receipts/
CREATE OR REPLACE FUNCTION public.extract_application_id_from_path(path text)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF path ~ '^application-documents/([^/]+)/' THEN
    RETURN (regexp_match(path, '^application-documents/([^/]+)/'))[1];
  END IF;
  IF path ~ '^signed-contracts/([^/]+)/' THEN
    RETURN (regexp_match(path, '^signed-contracts/([^/]+)/'))[1];
  END IF;
  IF path ~ '^receipts/([^/]+)/' THEN
    RETURN (regexp_match(path, '^receipts/([^/]+)/'))[1];
  END IF;
  IF path ~ '^payment-proofs/([^/]+)' THEN
    -- payment-proofs may be flat or nested; try nested first
    IF path ~ '^payment-proofs/([^/]+)/' THEN
      RETURN (regexp_match(path, '^payment-proofs/([^/]+)/'))[1];
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

-- Recreate upload policy with extra prefixes
DROP POLICY IF EXISTS "Customers can upload to their applications" ON storage.objects;
CREATE POLICY "Customers can upload to their applications"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (
    (
      (
        name LIKE 'application-documents/%'
        OR name LIKE 'signed-contracts/%'
        OR name LIKE 'receipts/%'
        OR name LIKE 'payment-proofs/%'
      )
      AND user_can_access_storage_path(name)
    )
    OR is_admin()
  )
);

DROP POLICY IF EXISTS "Customers can read their own documents" ON storage.objects;
CREATE POLICY "Customers can read their own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (
    (
      (
        name LIKE 'application-documents/%'
        OR name LIKE 'signed-contracts/%'
        OR name LIKE 'receipts/%'
        OR name LIKE 'payment-proofs/%'
      )
      AND user_can_access_storage_path(name)
    )
    OR is_admin()
  )
);
