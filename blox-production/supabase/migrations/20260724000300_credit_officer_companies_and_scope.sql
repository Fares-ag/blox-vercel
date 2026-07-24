-- ─────────────────────────────────────────────────────────────────────────────
-- Partner Ops: credit officers assignable to one or many dealers
-- - users.credit_scope: 'all' (BLOX central) | 'assigned' (partner-scoped)
-- - credit_officer_companies M2M for assigned officers
-- - RLS on applications: scoped officers only see their dealers' apps
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Scope column on users ────────────────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS credit_scope text NOT NULL DEFAULT 'assigned'
  CHECK (credit_scope IN ('all', 'assigned'));

COMMENT ON COLUMN public.users.credit_scope IS
  'Credit officers: all = platform-wide queue; assigned = only credit_officer_companies.';

-- Existing credit officers become platform-wide so today's queue keeps working.
UPDATE public.users
SET credit_scope = 'all'
WHERE role = 'credit_officer'
  AND credit_scope = 'assigned'
  AND (company_id IS NULL OR email ILIKE '%@blox%' OR email ILIKE '%admin%');

-- Prefer: any credit_officer who already has a company_id stays 'assigned'
-- (partner officers). Ones without company stay 'all'.
UPDATE public.users
SET credit_scope = 'all'
WHERE role = 'credit_officer'
  AND company_id IS NULL;

UPDATE public.users
SET credit_scope = 'assigned'
WHERE role = 'credit_officer'
  AND company_id IS NOT NULL;

-- ── M2M membership ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_officer_companies (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_credit_officer_companies_company
  ON public.credit_officer_companies (company_id);

ALTER TABLE public.credit_officer_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage credit officer companies" ON public.credit_officer_companies;
CREATE POLICY "Admins manage credit officer companies"
  ON public.credit_officer_companies
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Credit officers read own company assignments" ON public.credit_officer_companies;
CREATE POLICY "Credit officers read own company assignments"
  ON public.credit_officer_companies
  FOR SELECT
  USING (
    public.is_credit_officer()
    AND user_id = auth.uid()
  );

-- Backfill: partner credit officers with users.company_id get that membership.
INSERT INTO public.credit_officer_companies (user_id, company_id)
SELECT u.id, u.company_id
FROM public.users u
WHERE u.role = 'credit_officer'
  AND u.company_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ── Helper ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.current_user_credit_company_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT coc.company_id
  FROM public.credit_officer_companies coc
  WHERE coc.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.credit_officer_has_all_scope()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'credit_officer'
      AND u.credit_scope = 'all'
  );
$$;

-- ── Tighten credit RLS on applications ───────────────────────────────────────
-- Replace broad credit SELECT/UPDATE with scope-aware policies.
DROP POLICY IF EXISTS "Credit officers select pipeline applications" ON public.applications;
DROP POLICY IF EXISTS "Credit officers update pipeline applications" ON public.applications;
DROP POLICY IF EXISTS "Credit officers can select applications" ON public.applications;
DROP POLICY IF EXISTS "Credit officers can update applications" ON public.applications;
DROP POLICY IF EXISTS "Credit officers manage pipeline applications" ON public.applications;

-- Keep any older named policies from showroom migration if present.
DO $$
DECLARE
  pol text;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'applications'
      AND policyname ILIKE '%credit%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.applications', pol);
  END LOOP;
END $$;

CREATE POLICY "Credit officers select assigned applications"
  ON public.applications
  FOR SELECT
  USING (
    public.is_credit_officer()
    AND (
      public.credit_officer_has_all_scope()
      OR company_id IN (SELECT public.current_user_credit_company_ids())
    )
  );

CREATE POLICY "Credit officers update assigned applications"
  ON public.applications
  FOR UPDATE
  USING (
    public.is_credit_officer()
    AND (
      public.credit_officer_has_all_scope()
      OR company_id IN (SELECT public.current_user_credit_company_ids())
    )
  )
  WITH CHECK (
    public.is_credit_officer()
    AND (
      public.credit_officer_has_all_scope()
      OR company_id IN (SELECT public.current_user_credit_company_ids())
    )
  );

-- Audi seed credit officer: ensure assigned scope + Audi membership.
INSERT INTO public.credit_officer_companies (user_id, company_id)
SELECT u.id, c.id
FROM public.users u
CROSS JOIN public.companies c
WHERE lower(u.email) = 'credit@audi.qa'
  AND c.name = 'Audi'
ON CONFLICT DO NOTHING;

UPDATE public.users
SET credit_scope = 'assigned'
WHERE lower(email) = 'credit@audi.qa';
