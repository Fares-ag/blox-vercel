-- QA scale seed for preview branch / local only — DO NOT run against production.
-- Generates ~25k applications across key statuses for queue/list stress tests.
--
-- Prerequisites:
--   - At least one product id and company id exist
--   - Run as a privileged role on a disposable database
--
-- Usage (local/branch):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/qa-scale-seed-applications.sql

DO $$
DECLARE
  v_product_id text;
  v_company_id uuid;
  v_batch int := 25000;
  v_i int;
  v_status text;
  v_id text;
BEGIN
  SELECT id::text, company_id INTO v_product_id, v_company_id
  FROM public.products
  WHERE company_id IS NOT NULL
  LIMIT 1;

  IF v_product_id IS NULL OR v_company_id IS NULL THEN
    RAISE EXCEPTION 'Need a product with company_id before seeding';
  END IF;

  FOR v_i IN 1..v_batch LOOP
    v_status := CASE (v_i % 10)
      WHEN 0 THEN 'active'
      WHEN 1 THEN 'pending_finance_activation'
      WHEN 2 THEN 'under_review'
      WHEN 3 THEN 'under_review'
      WHEN 4 THEN 'contract_signing_required'
      WHEN 5 THEN 'contracts_submitted'
      WHEN 6 THEN 'rejected'
      WHEN 7 THEN 'draft'
      WHEN 8 THEN 'down_payment_submitted'
      ELSE 'resubmission_required'
    END;

    v_id := 'qa-scale-' || lpad(v_i::text, 6, '0');

    INSERT INTO public.applications (
      id,
      status,
      customer_name,
      customer_email,
      customer_phone,
      vehicle_id,
      company_id,
      selling_price,
      loan_amount,
      down_payment,
      submitted_at,
      created_at,
      updated_at
    ) VALUES (
      v_id,
      v_status,
      'QA Scale ' || v_i,
      'qa-scale-' || (v_i % 200) || '@example.test',
      '9740000' || lpad((v_i % 10000)::text, 4, '0'),
      v_product_id,
      v_company_id,
      45000,
      40000,
      5000,
      CASE WHEN v_status = 'draft' THEN NULL ELSE now() - ((v_i % 30) || ' days')::interval END,
      now() - ((v_i % 60) || ' days')::interval,
      now() - ((v_i % 10) || ' hours')::interval
    )
    ON CONFLICT (id) DO NOTHING;

    -- Lightweight schedule rows for a subset of active apps (~2.5k × 12 ≈ 30k rows)
    IF v_status = 'active' AND (v_i % 10) = 0 THEN
      INSERT INTO public.payment_schedules (
        application_id,
        due_date,
        amount,
        remaining_amount,
        status
      )
      SELECT
        v_id,
        (current_date + (g || ' months')::interval)::date,
        2000,
        2000,
        CASE WHEN g = 1 THEN 'due' ELSE 'upcoming' END
      FROM generate_series(1, 12) AS g;
    END IF;
  END LOOP;

  RAISE NOTICE 'Seeded up to % applications (qa-scale-* ids)', v_batch;
END $$;

-- Cleanup helper (run manually after QA):
-- DELETE FROM public.payment_schedules WHERE application_id LIKE 'qa-scale-%';
-- DELETE FROM public.applications WHERE id LIKE 'qa-scale-%';
