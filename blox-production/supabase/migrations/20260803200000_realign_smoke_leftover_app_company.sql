-- Realign leftover smoke applications still on QAuto with brand vehicles
-- (created before smoke scripts scoped products to dealer.company_id).
-- Also covers pending_finance_activation (omitted from prior realign).

DO $$
DECLARE
  v_qauto uuid;
  v_updated int;
  v_remaining int;
BEGIN
  SELECT id INTO v_qauto FROM public.companies WHERE name = 'QAuto' LIMIT 1;
  IF v_qauto IS NULL THEN
    RAISE EXCEPTION 'QAuto company missing — aborting smoke leftover realign';
  END IF;

  ALTER TABLE public.applications DISABLE TRIGGER trg_enforce_customer_application_field_guard;

  UPDATE public.applications a
  SET company_id = p.company_id
  FROM public.products p
  JOIN public.companies pc ON pc.id = p.company_id
  WHERE a.vehicle_id = p.id
    AND a.company_id = v_qauto
    AND pc.name IN ('Audi', 'Volkswagen', 'Skoda')
    AND a.status IN (
      'draft',
      'under_review',
      'active',
      'approved',
      'pending',
      'pending_finance_activation'
    )
    AND p.company_id IS NOT NULL
    AND a.company_id IS DISTINCT FROM p.company_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  ALTER TABLE public.applications ENABLE TRIGGER trg_enforce_customer_application_field_guard;

  SELECT count(*) INTO v_remaining
  FROM public.applications a
  JOIN public.products p ON p.id = a.vehicle_id
  WHERE a.status IN (
      'draft',
      'under_review',
      'active',
      'approved',
      'pending',
      'pending_finance_activation'
    )
    AND a.company_id IS DISTINCT FROM p.company_id;

  IF v_remaining <> 0 THEN
    RAISE EXCEPTION 'smoke leftover realign: % open mismatches remain', v_remaining;
  END IF;

  RAISE NOTICE 'smoke leftover realign: updated % row(s)', v_updated;
END $$;
