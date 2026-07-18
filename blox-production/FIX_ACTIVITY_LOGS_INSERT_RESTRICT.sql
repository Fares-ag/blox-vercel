-- P0-9: Stop forgeable activity_logs inserts from any authenticated client.
-- Prefer inserts via service role / trusted RPC only.
-- Apply in Supabase SQL Editor after reviewing.

DROP POLICY IF EXISTS "Users can insert their own activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Allow authenticated insert activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert_authenticated" ON public.activity_logs;

-- Fail closed: no direct client INSERT. Edge/service role bypasses RLS.
-- If the app currently inserts as the user JWT, switch activity-tracking to an RPC
-- with SECURITY DEFINER that validates auth.uid() matches user_id.

CREATE OR REPLACE FUNCTION public.log_activity_secure(
  p_action text,
  p_resource_type text,
  p_resource_id text DEFAULT NULL,
  p_resource_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  INSERT INTO public.activity_logs (
    user_id,
    user_email,
    action,
    resource_type,
    resource_id,
    resource_name,
    description,
    metadata,
    created_at
  ) VALUES (
    v_uid,
    COALESCE(v_email, ''),
    p_action,
    p_resource_type,
    p_resource_id,
    p_resource_name,
    p_description,
    COALESCE(p_metadata, '{}'::jsonb),
    now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_activity_secure FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_activity_secure TO authenticated;
