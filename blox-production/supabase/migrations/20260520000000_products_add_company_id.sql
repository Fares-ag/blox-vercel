-- Add optional company_id to products so vehicles can be linked to a specific company.
-- The badge on Browse Vehicles reads companies.name via a join.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'products'
      AND column_name  = 'company_id'
  ) THEN
    ALTER TABLE public.products
      ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_products_company_id ON public.products(company_id);
  END IF;
END $$;
