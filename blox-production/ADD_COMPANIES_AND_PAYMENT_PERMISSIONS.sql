-- ============================================
-- Companies + Payment Permissions (company-based)
-- ============================================
-- Goal:
-- - Create `public.companies` with a `can_pay` flag
-- - Add `company_id` to `public.users` (and optionally to `public.applications`)
-- - Allow the frontend to read `users.company_id` + `companies.can_pay`
-- - Provide helper function `current_user_can_pay()`
--
-- Run in Supabase Dashboard -> SQL Editor
-- Safe to re-run.
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1) Companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE,
  description TEXT,
  can_pay BOOLEAN NOT NULL DEFAULT TRUE,
  status VARCHAR(20) CHECK (status IN ('active', 'inactive')) NOT NULL DEFAULT 'active',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);

-- 2) Add company_id to users (your app profile table)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_company_id ON public.users(company_id);

-- Optional: add company_id to applications as well (useful for reporting / assignment)
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_applications_company_id ON public.applications(company_id);

-- 3) RLS for companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage companies" ON public.companies;
CREATE POLICY "Admins can manage companies" ON public.companies
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Users can read their own company" ON public.companies;
CREATE POLICY "Users can read their own company" ON public.companies
  FOR SELECT
  TO authenticated
  USING (
    is_admin()
    OR id = (
      SELECT u.company_id
      FROM public.users u
      WHERE u.id = auth.uid()
      LIMIT 1
    )
  );

-- 4) Grants (so the client can read needed columns)
GRANT SELECT ON public.companies TO authenticated;
GRANT SELECT (id, name, code, can_pay, status) ON public.companies TO authenticated;

-- Existing script grants (id, email, role). Add company_id too:
GRANT SELECT (id, email, role, company_id) ON public.users TO authenticated;

-- 5) Helper function: can current user pay?
-- Enforcement behavior:
-- - If user has no company_id -> FALSE
-- - If company is inactive -> FALSE
-- - Else -> companies.can_pay
CREATE OR REPLACE FUNCTION public.current_user_can_pay()
RETURNS BOOLEAN AS $$
DECLARE
  cid UUID;
  allowed BOOLEAN;
  company_status TEXT;
BEGIN
  SELECT company_id INTO cid
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1;

  IF cid IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT can_pay, status INTO allowed, company_status
  FROM public.companies
  WHERE id = cid
  LIMIT 1;

  IF company_status = 'inactive' THEN
    RETURN FALSE;
  END IF;

  RETURN COALESCE(allowed, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.current_user_can_pay() TO authenticated;

-- 6) (Optional) Seed example company
-- NOTE: uncomment and adjust to your needs.
-- INSERT INTO public.companies (name, code, can_pay, status)
-- VALUES ('Q-Auto', 'QAUTO', TRUE, 'active')
-- ON CONFLICT (code) DO UPDATE
-- SET can_pay = EXCLUDED.can_pay, status = EXCLUDED.status, updated_at = NOW();

-- 7) (Optional) Assign a user to a company
-- UPDATE public.users
-- SET company_id = (SELECT id FROM public.companies WHERE code = 'QAUTO')
-- WHERE LOWER(email) = LOWER('mshaker@q-auto.com');

