-- BLOX Backend P0/P1 fixes (BE-02, BE-03, BE-04, BE-05, BE-07)
-- Apply to project zqwsxewuppexvjyakuqf. Idempotent where possible.
-- Does NOT print or rotate SkipCash secrets.

-- Edge functions (service_role) must pass is_admin() guards inside SECURITY DEFINER RPCs.
-- Source of truth for humans: public.users.role only (never client metadata).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role TEXT;
  user_email TEXT;
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') = 'service_role' THEN
    RETURN TRUE;
  END IF;

  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();

  IF user_role IN ('admin', 'super_admin') THEN
    RETURN TRUE;
  END IF;

  user_email := auth.jwt() ->> 'email';
  IF user_email IS NOT NULL THEN
    SELECT role INTO user_role
    FROM public.users
    WHERE LOWER(email) = LOWER(user_email);

    IF user_role IN ('admin', 'super_admin') THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;

-- =============================================================================
-- BE-02: Stop privilege escalation via client-controlled auth metadata
-- =============================================================================

-- New users always start as customer; never copy role from raw_user_meta_data.
CREATE OR REPLACE FUNCTION public.sync_user_to_public_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    'customer',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    -- Never escalate/demote role from auth metadata on sync
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Metadata updates must NOT change public.users.role
CREATE OR REPLACE FUNCTION public.update_user_role_from_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Intentionally no-op for role. Role changes only via admin_set_user_role.
  UPDATE public.users
  SET
    email = COALESCE(NEW.email, public.users.email),
    updated_at = NOW()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- Trusted role change path (admin / super_admin only)
CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  p_user_id uuid,
  p_role text
)
RETURNS TABLE(id uuid, email text, role text, company_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'not authorized: admin_set_user_role is admin-only';
  END IF;

  IF p_role NOT IN ('customer', 'admin', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  -- Only super_admin may grant super_admin
  IF p_role = 'super_admin' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'super_admin'
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'only super_admin may assign super_admin';
    END IF;
  END IF;

  UPDATE public.users
  SET role = p_role, updated_at = NOW()
  WHERE public.users.id = p_user_id;

  RETURN QUERY
  SELECT u.id, u.email, u.role, u.company_id
  FROM public.users u
  WHERE u.id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, text) TO service_role;

-- =============================================================================
-- BE-03: Fix users SELECT policy (remove OR true)
-- =============================================================================

DROP POLICY IF EXISTS "Users can read profiles" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;

CREATE POLICY "Users can read own profile"
  ON public.users
  FOR SELECT
  TO public
  USING (
    (SELECT auth.uid()) = id
    OR (SELECT public.is_admin())
  );

-- No direct client UPDATE on users.role (fail closed). Profile updates go via
-- controlled paths / admin RPCs. Allow self update of non-role columns if needed later.

-- =============================================================================
-- BE-04: activity_logs — drop forge INSERT; fix log_activity_secure schema
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated users can create activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Users can insert their own activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Allow authenticated insert activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert_authenticated" ON public.activity_logs;

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
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_role text;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = v_uid;
  SELECT pu.role INTO v_role FROM public.users pu WHERE pu.id = v_uid;

  INSERT INTO public.activity_logs (
    user_id,
    user_email,
    user_role,
    action_type,
    resource_type,
    resource_id,
    resource_name,
    description,
    metadata,
    created_at
  ) VALUES (
    v_uid,
    COALESCE(v_email, ''),
    COALESCE(v_role, COALESCE(p_metadata->>'user_role', 'unknown')),
    p_action,
    p_resource_type,
    p_resource_id,
    p_resource_name,
    p_description,
    COALESCE(p_metadata, '{}'::jsonb),
    now()
  )
  RETURNING activity_logs.id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_activity_secure(text, text, text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_activity_secure(text, text, text, text, text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.log_activity_secure(text, text, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_activity_secure(text, text, text, text, text, jsonb) TO service_role;

-- =============================================================================
-- BE-05: Application status transition enforcement + customer update paths
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enforce_application_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor text;
  v_ok boolean := false;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF public.is_admin() THEN
    v_actor := 'admin';
  ELSIF (SELECT auth.role()) = 'authenticated'
        AND lower(NEW.customer_email) = lower(public.current_user_email()) THEN
    v_actor := 'customer';
  ELSE
    -- service_role / system paths
    IF COALESCE(auth.jwt()->>'role', '') = 'service_role' THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Unauthorized status transition';
  END IF;

  -- Prevent ownership hijack on status change
  IF v_actor = 'customer' AND lower(NEW.customer_email) IS DISTINCT FROM lower(OLD.customer_email) THEN
    RAISE EXCEPTION 'Customers cannot change application ownership';
  END IF;

  IF v_actor = 'customer' THEN
    v_ok := CASE OLD.status
      WHEN 'draft' THEN NEW.status IN ('under_review', 'submission_cancelled')
      WHEN 'resubmission_required' THEN NEW.status IN ('under_review')
      WHEN 'contract_signing_required' THEN NEW.status IN ('contracts_submitted', 'submission_cancelled')
      WHEN 'under_review' THEN NEW.status IN ('submission_cancelled')
      WHEN 'down_payment_required' THEN NEW.status IN ('submission_cancelled')
      ELSE false
    END;
  ELSE
    -- admin / super_admin matrix (aligned with application-status-transitions.ts)
    v_ok := CASE OLD.status
      WHEN 'draft' THEN NEW.status IN ('under_review', 'active', 'rejected', 'submission_cancelled')
      WHEN 'under_review' THEN NEW.status IN ('contract_signing_required', 'resubmission_required', 'rejected', 'active', 'submission_cancelled')
      WHEN 'resubmission_required' THEN NEW.status IN ('under_review', 'rejected', 'submission_cancelled')
      WHEN 'contract_signing_required' THEN NEW.status IN ('contracts_submitted', 'resubmission_required', 'rejected', 'under_review')
      WHEN 'contracts_submitted' THEN NEW.status IN ('contract_under_review', 'active', 'contract_signing_required', 'rejected', 'resubmission_required')
      WHEN 'contract_under_review' THEN NEW.status IN ('active', 'contract_signing_required', 'rejected', 'down_payment_required')
      WHEN 'down_payment_required' THEN NEW.status IN ('down_payment_submitted', 'active', 'rejected')
      WHEN 'down_payment_submitted' THEN NEW.status IN ('active', 'rejected', 'down_payment_required')
      WHEN 'active' THEN NEW.status IN ('completed', 'submission_cancelled')
      WHEN 'rejected' THEN NEW.status IN ('under_review')
      WHEN 'completed' THEN false
      WHEN 'submission_cancelled' THEN NEW.status IN ('under_review')
      ELSE false
    END;
  END IF;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'Illegal status transition for %: % → %', v_actor, OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_application_status_transition ON public.applications;
CREATE TRIGGER trg_enforce_application_status_transition
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_application_status_transition();

DROP POLICY IF EXISTS "Users can update applications" ON public.applications;
DROP POLICY IF EXISTS "Customers can update for resubmission" ON public.applications;
DROP POLICY IF EXISTS "Customers can update for contract signing" ON public.applications;
DROP POLICY IF EXISTS "Customers can update own draft applications" ON public.applications;

-- Customers may update own applications in actionable statuses; trigger enforces status matrix.
-- Admins may update all.
CREATE POLICY "Users can update applications"
  ON public.applications
  FOR UPDATE
  TO public
  USING (
    (SELECT public.is_admin())
    OR (
      (SELECT auth.role()) = 'authenticated'
      AND lower(customer_email) = lower((SELECT public.current_user_email()))
      AND status IN (
        'draft',
        'under_review',
        'resubmission_required',
        'contract_signing_required',
        'down_payment_required',
        'contracts_submitted',
        'down_payment_submitted'
      )
    )
  )
  WITH CHECK (
    (SELECT public.is_admin())
    OR (
      (SELECT auth.role()) = 'authenticated'
      AND lower(customer_email) = lower((SELECT public.current_user_email()))
    )
  );

-- =============================================================================
-- BE-07: Tighten admin_* EXECUTE grants (keep is_admin() guards)
-- =============================================================================

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname LIKE 'admin_%'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.oid::regprocedure);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.oid::regprocedure);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.oid::regprocedure);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.oid::regprocedure);
  END LOOP;
END $$;

-- Storage BE-10: allow admins to manage vehicle-images (already covered by admin ALL on documents).
-- Explicit comment only — Admins can manage all documents policy already permits any path under documents.


-- Activity logs SELECT: trust public.users.role only (not JWT user_metadata)
DROP POLICY IF EXISTS "Super admins can read all activity logs" ON public.activity_logs;
CREATE POLICY "Super admins can read all activity logs"
  ON public.activity_logs
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid())
        AND u.role = 'super_admin'
    )
  );
