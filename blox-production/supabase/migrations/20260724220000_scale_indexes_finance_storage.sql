-- Scale indexes for credit/finance scoped queues + finance document read access.

CREATE INDEX IF NOT EXISTS idx_applications_company_id
  ON public.applications (company_id);

CREATE INDEX IF NOT EXISTS idx_applications_company_status_updated
  ON public.applications (company_id, status, updated_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_applications_vehicle_id
  ON public.applications (vehicle_id)
  WHERE vehicle_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_applications_status_pending_finance
  ON public.applications (status, updated_at DESC NULLS LAST)
  WHERE status = 'pending_finance_activation';

-- Finance officers need read access to application docs during activation review.
DROP POLICY IF EXISTS "Finance officers read application files" ON storage.objects;
CREATE POLICY "Finance officers read application files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND public.is_finance_officer()
  AND (name LIKE 'application-documents/%' OR name LIKE 'vehicle-images/%')
);
