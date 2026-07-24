-- ─────────────────────────────────────────────────────────────────────────────
-- Partner Garage: products.company_id ownership + dealer-scoped RLS
-- Adds company ownership to inventory so a dealer_agent can manage ONLY their
-- own company's vehicles. Backfills legacy stock to QAuto and seeds Audi.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Ownership column ─────────────────────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

CREATE INDEX IF NOT EXISTS idx_products_company_id
  ON public.products (company_id);

COMMENT ON COLUMN public.products.company_id IS
  'Owning partner/dealer company. NULL = platform/legacy stock (admin-managed).';

-- ── Backfill legacy stock to QAuto (the only pre-existing company) ────────────
-- Ownership should always be set so Partner Hub counts and dealer RLS are exact.
UPDATE public.products p
SET company_id = c.id
FROM public.companies c
WHERE p.company_id IS NULL
  AND c.name = 'QAuto';

-- ── Seed Audi partner company (idempotent by name) ───────────────────────────
INSERT INTO public.companies (id, name, code, description, can_pay, status, created_at, updated_at)
SELECT gen_random_uuid(), 'Audi', 'AUDI', 'Audi partner dealership', true, 'active', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.companies WHERE name = 'Audi'
);

-- ── Dealer RLS: manage only own-company inventory ────────────────────────────
-- Admin/super_admin keep full manage via existing policies. Public keeps reading
-- active products. This adds company-scoped ALL access for dealer_agent.
DROP POLICY IF EXISTS "Dealer agents manage company products" ON public.products;
CREATE POLICY "Dealer agents manage company products"
  ON public.products
  FOR ALL
  USING (
    public.is_dealer_agent()
    AND company_id IS NOT NULL
    AND company_id = (SELECT u.company_id FROM public.users u WHERE u.id = auth.uid())
  )
  WITH CHECK (
    public.is_dealer_agent()
    AND company_id IS NOT NULL
    AND company_id = (SELECT u.company_id FROM public.users u WHERE u.id = auth.uid())
  );
