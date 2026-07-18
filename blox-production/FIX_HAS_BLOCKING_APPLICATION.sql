-- Ops paste: guest apply blocking check (anon-safe)
-- See supabase/migrations/20260718030000_has_blocking_application.sql

CREATE OR REPLACE FUNCTION public.has_blocking_application(p_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id text;
  v_email text := lower(trim(COALESCE(p_email, '')));
BEGIN
  IF v_email = '' THEN
    RETURN NULL;
  END IF;

  SELECT a.id INTO v_id
  FROM public.applications a
  WHERE lower(trim(a.customer_email)) = v_email
    AND a.status IN (
      'under_review',
      'contract_signing_required',
      'resubmission_required',
      'contracts_submitted',
      'contract_under_review',
      'down_payment_required',
      'down_payment_submitted',
      'completed'
    )
  ORDER BY a.created_at DESC NULLS LAST
  LIMIT 1;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.has_blocking_application(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_blocking_application(text) TO anon;
GRANT EXECUTE ON FUNCTION public.has_blocking_application(text) TO authenticated;
