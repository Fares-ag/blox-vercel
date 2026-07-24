-- Finance officer role + pending_finance_activation handoff.
-- Credit officers approve into pending_finance_activation; finance activates.
-- Also: finance company scope (mirror credit) + read RLS for financial tables.
-- Does NOT change SkipCash, settlement discount math, or payment completion RPCs.

-- ── Role helpers ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_finance_officer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.current_user_role() = 'finance_officer';
$$;

CREATE OR REPLACE FUNCTION public.is_ops_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_admin()
      OR public.is_dealer_agent()
      OR public.is_credit_officer()
      OR public.is_finance_officer();
$$;

-- ── Allow assigning finance_officer ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_set_user_role(p_user_id uuid, p_role text)
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

  IF p_role NOT IN (
    'customer',
    'admin',
    'super_admin',
    'dealer_agent',
    'credit_officer',
    'finance_officer'
  ) THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

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

-- ── Finance company scope (default ALL so platform finance keeps working) ────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS finance_scope text NOT NULL DEFAULT 'all';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_finance_scope_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_finance_scope_check
      CHECK (finance_scope IN ('all', 'assigned'));
  END IF;
END $$;

COMMENT ON COLUMN public.users.finance_scope IS
  'Finance officers: all = platform-wide; assigned = only finance_officer_companies.';

-- New finance officers stay platform-wide unless explicitly scoped.
UPDATE public.users
SET finance_scope = 'all'
WHERE role = 'finance_officer'
  AND finance_scope IS DISTINCT FROM 'assigned';

CREATE TABLE IF NOT EXISTS public.finance_officer_companies (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_finance_officer_companies_company
  ON public.finance_officer_companies (company_id);

ALTER TABLE public.finance_officer_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage finance officer companies" ON public.finance_officer_companies;
CREATE POLICY "Admins manage finance officer companies"
  ON public.finance_officer_companies
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Finance officers read own company assignments" ON public.finance_officer_companies;
CREATE POLICY "Finance officers read own company assignments"
  ON public.finance_officer_companies
  FOR SELECT
  USING (
    public.is_finance_officer()
    AND user_id = auth.uid()
  );

CREATE OR REPLACE FUNCTION public.current_user_finance_company_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT foc.company_id
  FROM public.finance_officer_companies foc
  WHERE foc.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.finance_officer_has_all_scope()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'finance_officer'
      AND u.finance_scope = 'all'
  );
$$;

CREATE OR REPLACE FUNCTION public.finance_can_access_application(p_application_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_finance_officer()
    AND (
      public.finance_officer_has_all_scope()
      OR EXISTS (
        SELECT 1
        FROM public.applications a
        WHERE a.id = p_application_id
          AND a.company_id IN (SELECT public.current_user_finance_company_ids())
      )
    );
$$;

-- ── Status transition enforcement ────────────────────────────────────────────
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
  ELSIF v_role = 'finance_officer' THEN
    v_actor := 'finance_officer';
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
      WHEN 'pending_finance_activation' THEN NEW.status IN ('submission_cancelled')
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
        'contract_signing_required', 'resubmission_required', 'rejected',
        'pending_finance_activation', 'submission_cancelled'
      )
      WHEN 'resubmission_required' THEN NEW.status IN ('under_review', 'rejected', 'submission_cancelled')
      WHEN 'contract_signing_required' THEN NEW.status IN (
        'contracts_submitted', 'resubmission_required', 'rejected', 'under_review'
      )
      WHEN 'contracts_submitted' THEN NEW.status IN (
        'contract_under_review', 'pending_finance_activation',
        'contract_signing_required', 'rejected', 'resubmission_required'
      )
      WHEN 'contract_under_review' THEN NEW.status IN (
        'pending_finance_activation', 'contract_signing_required',
        'rejected', 'down_payment_required'
      )
      WHEN 'down_payment_required' THEN NEW.status IN (
        'down_payment_submitted', 'pending_finance_activation', 'rejected'
      )
      WHEN 'down_payment_submitted' THEN NEW.status IN (
        'pending_finance_activation', 'rejected', 'down_payment_required'
      )
      WHEN 'rejected' THEN NEW.status IN ('under_review')
      ELSE false
    END;
  ELSIF v_actor = 'finance_officer' THEN
    v_ok := CASE OLD.status
      WHEN 'pending_finance_activation' THEN NEW.status IN ('active', 'rejected', 'under_review')
      WHEN 'contracts_submitted' THEN NEW.status IN ('pending_finance_activation', 'active', 'rejected')
      WHEN 'contract_under_review' THEN NEW.status IN ('pending_finance_activation', 'active', 'rejected')
      WHEN 'down_payment_submitted' THEN NEW.status IN ('pending_finance_activation', 'active', 'rejected')
      WHEN 'rejected' THEN NEW.status IN ('under_review')
      ELSE false
    END;
  ELSE
    -- admin / super_admin
    v_ok := CASE OLD.status
      WHEN 'draft' THEN NEW.status IN (
        'under_review', 'active', 'pending_finance_activation', 'rejected', 'submission_cancelled'
      )
      WHEN 'under_review' THEN NEW.status IN (
        'contract_signing_required', 'resubmission_required', 'rejected',
        'active', 'pending_finance_activation', 'submission_cancelled'
      )
      WHEN 'resubmission_required' THEN NEW.status IN ('under_review', 'rejected', 'submission_cancelled')
      WHEN 'contract_signing_required' THEN NEW.status IN (
        'contracts_submitted', 'resubmission_required', 'rejected', 'under_review'
      )
      WHEN 'contracts_submitted' THEN NEW.status IN (
        'contract_under_review', 'active', 'pending_finance_activation',
        'contract_signing_required', 'rejected', 'resubmission_required'
      )
      WHEN 'contract_under_review' THEN NEW.status IN (
        'active', 'pending_finance_activation', 'contract_signing_required',
        'rejected', 'down_payment_required'
      )
      WHEN 'down_payment_required' THEN NEW.status IN (
        'down_payment_submitted', 'active', 'pending_finance_activation', 'rejected'
      )
      WHEN 'down_payment_submitted' THEN NEW.status IN (
        'active', 'pending_finance_activation', 'rejected', 'down_payment_required'
      )
      WHEN 'pending_finance_activation' THEN NEW.status IN (
        'active', 'rejected', 'under_review', 'submission_cancelled'
      )
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

-- ── RLS: finance applications (scope-aware) ──────────────────────────────────
DROP POLICY IF EXISTS "Finance officers read applications" ON public.applications;
DROP POLICY IF EXISTS "Finance officers update applications" ON public.applications;
DROP POLICY IF EXISTS "Finance officers select assigned applications" ON public.applications;
DROP POLICY IF EXISTS "Finance officers update assigned applications" ON public.applications;

CREATE POLICY "Finance officers select assigned applications"
  ON public.applications
  FOR SELECT
  USING (
    public.is_finance_officer()
    AND (
      public.finance_officer_has_all_scope()
      OR company_id IN (SELECT public.current_user_finance_company_ids())
    )
  );

CREATE POLICY "Finance officers update assigned applications"
  ON public.applications
  FOR UPDATE
  USING (
    public.is_finance_officer()
    AND (
      public.finance_officer_has_all_scope()
      OR company_id IN (SELECT public.current_user_finance_company_ids())
    )
  )
  WITH CHECK (
    public.is_finance_officer()
    AND (
      public.finance_officer_has_all_scope()
      OR company_id IN (SELECT public.current_user_finance_company_ids())
    )
  );

DROP POLICY IF EXISTS "Finance officers read companies" ON public.companies;
CREATE POLICY "Finance officers read companies"
  ON public.companies
  FOR SELECT
  USING (public.is_finance_officer());

DROP POLICY IF EXISTS "Finance officers read products" ON public.products;
CREATE POLICY "Finance officers read products"
  ON public.products
  FOR SELECT
  USING (public.is_finance_officer());

-- Financial tables: SELECT only (no approve/math/SkipCash changes)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payment_schedules'
  ) THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS "Finance officers read payment schedules" ON public.payment_schedules;
      CREATE POLICY "Finance officers read payment schedules"
        ON public.payment_schedules
        FOR SELECT
        USING (public.finance_can_access_application(application_id));
    $p$;
    EXECUTE $p$
      DROP POLICY IF EXISTS "Finance officers manage payment schedules" ON public.payment_schedules;
      CREATE POLICY "Finance officers manage payment schedules"
        ON public.payment_schedules
        FOR ALL
        USING (public.finance_can_access_application(application_id))
        WITH CHECK (public.finance_can_access_application(application_id));
    $p$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payment_transactions'
  ) THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS "Finance officers read payment transactions" ON public.payment_transactions;
      CREATE POLICY "Finance officers read payment transactions"
        ON public.payment_transactions
        FOR SELECT
        USING (public.finance_can_access_application(application_id));
    $p$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'application_settlements'
  ) THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS "Finance officers read application settlements" ON public.application_settlements;
      CREATE POLICY "Finance officers read application settlements"
        ON public.application_settlements
        FOR SELECT
        USING (public.finance_can_access_application(application_id));
    $p$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ledgers'
  ) THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS "Finance officers read ledgers" ON public.ledgers;
      CREATE POLICY "Finance officers read ledgers"
        ON public.ledgers
        FOR SELECT
        USING (public.finance_can_access_application(application_id));
    $p$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_credits'
  ) THEN
    -- Balances are email-keyed (not company-scoped). Platform finance may read all.
    -- Assigned-scope officers also get read (operational overview); no write.
    EXECUTE $p$
      DROP POLICY IF EXISTS "Finance officers read user credits" ON public.user_credits;
      CREATE POLICY "Finance officers read user credits"
        ON public.user_credits
        FOR SELECT
        USING (public.is_finance_officer());
    $p$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'credit_transactions'
  ) THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS "Finance officers read credit transactions" ON public.credit_transactions;
      CREATE POLICY "Finance officers read credit transactions"
        ON public.credit_transactions
        FOR SELECT
        USING (public.is_finance_officer());
    $p$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payments'
  ) THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS "Finance officers read payments" ON public.payments;
      CREATE POLICY "Finance officers read payments"
        ON public.payments
        FOR SELECT
        USING (public.is_finance_officer());
    $p$;
  END IF;
END $$;
