-- 1) Duplicate applications_pkey: MAX(application-n) returns 0 when existing rows are UUIDs,
--    so every insert tried application-1. Use a sequence instead.
-- 2) Guest signup + email confirm: no JWT, so RLS blocks direct INSERT. RPC (SECURITY DEFINER)
--    inserts after verifying auth.users.id matches payload customer_email.

CREATE SEQUENCE IF NOT EXISTS public.applications_id_seq;

SELECT setval(
  'public.applications_id_seq',
  COALESCE(
    (
      SELECT MAX(
        CAST(SUBSTRING(id::text FROM 'application-([0-9]+)') AS integer)
      )
      FROM public.applications
      WHERE id::text ~ '^application-[0-9]+$'
    ),
    0
  )
);

CREATE OR REPLACE FUNCTION public.set_application_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    NEW.id := 'application-' || nextval('public.applications_id_seq')::text;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_application_id_trigger ON public.applications;
CREATE TRIGGER set_application_id_trigger
  BEFORE INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_application_id();

-- Insert application for a user who just signed up but has no session (e.g. email confirm pending).
CREATE OR REPLACE FUNCTION public.create_application_after_signup(
  p_user_id uuid,
  p_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_email text;
  v_payload_email text;
  inserted public.applications%ROWTYPE;
BEGIN
  SELECT email INTO v_auth_email FROM auth.users WHERE id = p_user_id;
  v_payload_email := lower(trim(p_payload->>'customer_email'));

  IF v_auth_email IS NULL THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;
  IF lower(trim(v_auth_email)) IS DISTINCT FROM v_payload_email THEN
    RAISE EXCEPTION 'email_mismatch';
  END IF;

  INSERT INTO public.applications
  SELECT *
  FROM jsonb_populate_record(
    NULL::public.applications,
    p_payload || jsonb_build_object('id', NULL)
  )
  RETURNING * INTO inserted;

  RETURN row_to_json(inserted)::jsonb;
END;
$$;

REVOKE ALL ON FUNCTION public.create_application_after_signup(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_application_after_signup(uuid, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.create_application_after_signup(uuid, jsonb) TO authenticated;

COMMENT ON FUNCTION public.create_application_after_signup(uuid, jsonb) IS
  'Insert one application row for a newly registered auth user when no JWT (email confirmation).';
