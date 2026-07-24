-- ─────────────────────────────────────────────────────────────────────────────
-- Showroom dealer + credit officer workflow
-- Roles, deal pricing columns, status transitions, RLS
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Helper: current user role from public.users ───────────────────────────────
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role TEXT;
  user_email TEXT;
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') = 'service_role' THEN
    RETURN 'service_role';
  END IF;

  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();

  IF user_role IS NOT NULL THEN
    RETURN lower(user_role);
  END IF;

  user_email := auth.jwt() ->> 'email';
  IF user_email IS NOT NULL THEN
    SELECT role INTO user_role
    FROM public.users
    WHERE LOWER(email) = LOWER(user_email);
    IF user_role IS NOT NULL THEN
      RETURN lower(user_role);
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_dealer_agent()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.current_user_role() = 'dealer_agent';
$$;

CREATE OR REPLACE FUNCTION public.is_credit_officer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.current_user_role() = 'credit_officer';
$$;

-- Staff who may operate the admin shell (full admin OR dealer OR credit)
CREATE OR REPLACE FUNCTION public.is_ops_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_admin()
      OR public.is_dealer_agent()
      OR public.is_credit_officer();
$$;

-- ── Deal pricing + agent columns ─────────────────────────────────────────────
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS agent_user_id uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS list_price numeric,
  ADD COLUMN IF NOT EXISTS selling_price numeric,
  ADD COLUMN IF NOT EXISTS internal_annual_rate numeric,
  ADD COLUMN IF NOT EXISTS hide_interest boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS customer_display_price numeric,
  ADD COLUMN IF NOT EXISTS customer_display_rate numeric,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS pricing_snapshot jsonb;

CREATE INDEX IF NOT EXISTS idx_applications_agent_user_id
  ON public.applications (agent_user_id);

CREATE INDEX IF NOT EXISTS idx_applications_status_submitted_at
  ON public.applications (status, submitted_at DESC NULLS LAST);

-- ── Status transition enforcement (dealer + credit + admin + customer) ───────
CREATE OR REPLACE FUNCTION public.enforce_application_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor text;
  v_role text;
  v_ok boolean := false;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF COALESCE(auth.jwt() ->> 'role', '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  v_role := public.current_user_role();

  IF public.is_admin() THEN
    v_actor := 'admin';
  ELSIF v_role = 'credit_officer' THEN
    v_actor := 'credit_officer';
  ELSIF v_role = 'dealer_agent' THEN
    v_actor := 'dealer_agent';
  ELSIF (SELECT auth.role()) = 'authenticated'
        AND lower(NEW.customer_email) = lower(public.current_user_email()) THEN
    v_actor := 'customer';
  ELSE
    RAISE EXCEPTION 'Unauthorized status transition';
  END IF;

  IF v_actor = 'customer' AND lower(NEW.customer_email) IS DISTINCT FROM lower(OLD.customer_email) THEN
    RAISE EXCEPTION 'Customers cannot change application ownership';
  END IF;

  -- Stamp submit metadata when entering under_review from draft/resubmission
  IF NEW.status = 'under_review'
     AND OLD.status IN ('draft', 'resubmission_required')
     AND NEW.submitted_at IS NULL THEN
    NEW.submitted_at := now();
    NEW.submitted_by := auth.uid();
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
  ELSIF v_actor = 'dealer_agent' THEN
    v_ok := CASE OLD.status
      WHEN 'draft' THEN NEW.status IN ('under_review', 'submission_cancelled')
      WHEN 'resubmission_required' THEN NEW.status IN ('under_review')
      ELSE false
    END;
  ELSIF v_actor = 'credit_officer' THEN
    v_ok := CASE OLD.status
      WHEN 'under_review' THEN NEW.status IN (
        'contract_signing_required', 'resubmission_required', 'rejected', 'active', 'submission_cancelled'
      )
      WHEN 'resubmission_required' THEN NEW.status IN ('under_review', 'rejected', 'submission_cancelled')
      WHEN 'contract_signing_required' THEN NEW.status IN (
        'contracts_submitted', 'resubmission_required', 'rejected', 'under_review'
      )
      WHEN 'contracts_submitted' THEN NEW.status IN (
        'contract_under_review', 'active', 'contract_signing_required', 'rejected', 'resubmission_required'
      )
      WHEN 'contract_under_review' THEN NEW.status IN (
        'active', 'contract_signing_required', 'rejected', 'down_payment_required'
      )
      WHEN 'down_payment_required' THEN NEW.status IN ('down_payment_submitted', 'active', 'rejected')
      WHEN 'down_payment_submitted' THEN NEW.status IN ('active', 'rejected', 'down_payment_required')
      WHEN 'rejected' THEN NEW.status IN ('under_review')
      ELSE false
    END;
  ELSE
    -- admin / super_admin (full matrix)
    v_ok := CASE OLD.status
      WHEN 'draft' THEN NEW.status IN ('under_review', 'active', 'rejected', 'submission_cancelled')
      WHEN 'under_review' THEN NEW.status IN (
        'contract_signing_required', 'resubmission_required', 'rejected', 'active', 'submission_cancelled'
      )
      WHEN 'resubmission_required' THEN NEW.status IN ('under_review', 'rejected', 'submission_cancelled')
      WHEN 'contract_signing_required' THEN NEW.status IN (
        'contracts_submitted', 'resubmission_required', 'rejected', 'under_review'
      )
      WHEN 'contracts_submitted' THEN NEW.status IN (
        'contract_under_review', 'active', 'contract_signing_required', 'rejected', 'resubmission_required'
      )
      WHEN 'contract_under_review' THEN NEW.status IN (
        'active', 'contract_signing_required', 'rejected', 'down_payment_required'
      )
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
    RAISE EXCEPTION 'Illegal status transition for %: % -> %', v_actor, OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

-- ── RLS: dealer (company-scoped) + credit officer (pipeline) ─────────────────
-- Keep existing admin/customer policies; add complementary ones.

DROP POLICY IF EXISTS "Dealer agents manage company applications" ON public.applications;
CREATE POLICY "Dealer agents manage company applications"
  ON public.applications
  FOR ALL
  USING (
    public.is_dealer_agent()
    AND company_id IS NOT NULL
    AND company_id = (
      SELECT u.company_id FROM public.users u WHERE u.id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_dealer_agent()
    AND company_id IS NOT NULL
    AND company_id = (
      SELECT u.company_id FROM public.users u WHERE u.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Credit officers read pipeline applications" ON public.applications;
CREATE POLICY "Credit officers read pipeline applications"
  ON public.applications
  FOR SELECT
  USING (
    public.is_credit_officer()
    AND status IN (
      'under_review',
      'resubmission_required',
      'contract_signing_required',
      'contracts_submitted',
      'contract_under_review',
      'down_payment_required',
      'down_payment_submitted',
      'rejected',
      'active'
    )
  );

DROP POLICY IF EXISTS "Credit officers update pipeline applications" ON public.applications;
CREATE POLICY "Credit officers update pipeline applications"
  ON public.applications
  FOR UPDATE
  USING (
    public.is_credit_officer()
    AND status IN (
      'under_review',
      'resubmission_required',
      'contract_signing_required',
      'contracts_submitted',
      'contract_under_review',
      'down_payment_required',
      'down_payment_submitted',
      'rejected'
    )
  )
  WITH CHECK (public.is_credit_officer());

-- Dealers/credit need to read products & offers for quoting
DROP POLICY IF EXISTS "Ops staff read products" ON public.products;
CREATE POLICY "Ops staff read products"
  ON public.products
  FOR SELECT
  USING (public.is_ops_staff());

DROP POLICY IF EXISTS "Ops staff read offers" ON public.offers;
CREATE POLICY "Ops staff read offers"
  ON public.offers
  FOR SELECT
  USING (public.is_ops_staff());

-- Dealers can read teammate users in same company (agent dropdown)
DROP POLICY IF EXISTS "Dealer agents read company users" ON public.users;
CREATE POLICY "Dealer agents read company users"
  ON public.users
  FOR SELECT
  USING (
    public.is_dealer_agent()
    AND company_id IS NOT NULL
    AND company_id = (SELECT u.company_id FROM public.users u WHERE u.id = auth.uid())
  );

-- Credit officers can read users (to show agent name)
DROP POLICY IF EXISTS "Credit officers read users" ON public.users;
CREATE POLICY "Credit officers read users"
  ON public.users
  FOR SELECT
  USING (public.is_credit_officer());

COMMENT ON COLUMN public.applications.agent_user_id IS 'Showroom dealer agent responsible for this application';
COMMENT ON COLUMN public.applications.hide_interest IS 'When true, customer UI shows display price at 0% while internal rate applies';
COMMENT ON COLUMN public.applications.selling_price IS 'Negotiated vehicle amount for this deal (may differ from catalog)';
