-- Products list indexes + facet RPCs for server-side catalog pagination (10k-ready).
-- Apply: npx supabase db push (from blox-production/)

-- ── Indexes (browse / ops hot paths) ─────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_products_status_created_id
  ON public.products (status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_products_status_make_model
  ON public.products (status, make, model);

CREATE INDEX IF NOT EXISTS idx_products_status_price
  ON public.products (status, price);

CREATE INDEX IF NOT EXISTS idx_products_company_status_created
  ON public.products (company_id, status, created_at DESC);

-- ── Facet RPCs (SECURITY INVOKER — rely on products RLS) ─────────────────────

CREATE OR REPLACE FUNCTION public.product_distinct_makes(
  p_status text DEFAULT 'active'
)
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT make
  FROM public.products
  WHERE (p_status IS NULL OR status = p_status)
    AND make IS NOT NULL
    AND btrim(make) <> ''
  ORDER BY 1;
$$;

CREATE OR REPLACE FUNCTION public.product_distinct_models(
  p_make text,
  p_status text DEFAULT 'active'
)
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT model
  FROM public.products
  WHERE make = p_make
    AND (p_status IS NULL OR status = p_status)
    AND model IS NOT NULL
    AND btrim(model) <> ''
  ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION public.product_distinct_makes(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.product_distinct_models(text, text) TO anon, authenticated;
