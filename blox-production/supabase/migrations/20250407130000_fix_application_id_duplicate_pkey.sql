-- Fix duplicate key on applications_pkey when IDs are assigned as application-{n}.
-- get_next_application_number() uses MAX(...) without serialization; concurrent INSERTs
-- can read the same MAX and collide. Serialize ID generation per transaction.

CREATE OR REPLACE FUNCTION public.set_application_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    -- Block concurrent inserts until this transaction finishes (same lock id for all app rows)
    PERFORM pg_advisory_xact_lock(90842001);
    next_num := public.get_next_application_number();
    NEW.id := 'application-' || next_num::TEXT;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_application_id_trigger ON public.applications;
CREATE TRIGGER set_application_id_trigger
  BEFORE INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_application_id();
