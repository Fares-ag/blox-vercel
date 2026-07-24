-- ─────────────────────────────────────────────────────────────────────────────
-- Partner routing + dealer storage
-- 1) Stamp applications.company_id from the vehicle's owning partner on insert
--    so an Audi car's application always routes to Audi (customer / dealer / app).
-- 2) Let dealer_agent (and credit_officer read) upload/view vehicle images and
--    application documents — fixes the known QA hole where dealers were blocked.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1) Inherit vehicle's company on application insert (all client paths) ─────
CREATE OR REPLACE FUNCTION public.stamp_application_company_from_vehicle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only fill when not explicitly set; the vehicle's partner is authoritative.
  IF NEW.company_id IS NULL AND NEW.vehicle_id IS NOT NULL THEN
    SELECT p.company_id INTO NEW.company_id
    FROM public.products p
    WHERE p.id = NEW.vehicle_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_application_company ON public.applications;
CREATE TRIGGER trg_stamp_application_company
  BEFORE INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.stamp_application_company_from_vehicle();

-- ── 2) Dealer / credit storage access on the private `documents` bucket ───────
-- Dealers operate the same wizard as admins (flat application-documents/ and
-- vehicle-images/ prefixes), so grant them prefix-scoped access. Credit officers
-- get read-only on application documents to review submissions.

DROP POLICY IF EXISTS "Dealers manage inventory and application files" ON storage.objects;
CREATE POLICY "Dealers manage inventory and application files"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'documents'
  AND public.is_dealer_agent()
  AND (name LIKE 'application-documents/%' OR name LIKE 'vehicle-images/%')
)
WITH CHECK (
  bucket_id = 'documents'
  AND public.is_dealer_agent()
  AND (name LIKE 'application-documents/%' OR name LIKE 'vehicle-images/%')
);

DROP POLICY IF EXISTS "Credit officers read application files" ON storage.objects;
CREATE POLICY "Credit officers read application files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND public.is_credit_officer()
  AND (name LIKE 'application-documents/%' OR name LIKE 'vehicle-images/%')
);
