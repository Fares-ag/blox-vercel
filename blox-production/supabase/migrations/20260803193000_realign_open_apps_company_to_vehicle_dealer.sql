-- Realign open applications.company_id to the vehicle's brand dealer after
-- QAuto brand split (Audi / Volkswagen / Skoda).
--
-- SAFETY (narrow scope):
--   * ONLY apps currently on QAuto
--   * ONLY when vehicle.company is Audi, Volkswagen, or Skoda
--   * ONLY live statuses: draft, under_review, active, approved, pending
--   * Does NOT touch rejected / cancelled / other terminal statuses
--   * Does NOT change vehicle_id, status, payments, or updated_at
--   * Idempotent: re-run is a no-op once aligned
--
-- Temporary disable of customer field guard mirrors
-- 20260802000000_data_integrity_and_push_url_guc.sql (company_id backfill).

DO $$
DECLARE
  v_qauto uuid;
  v_updated int;
  v_remaining int;
BEGIN
  SELECT id INTO v_qauto FROM public.companies WHERE name = 'QAuto' LIMIT 1;
  IF v_qauto IS NULL THEN
    RAISE EXCEPTION 'QAuto company missing — aborting application company realign';
  END IF;

  -- Preview count (must be > 0 only on first apply)
  SELECT count(*) INTO v_updated
  FROM public.applications a
  JOIN public.products p ON p.id = a.vehicle_id
  JOIN public.companies pc ON pc.id = p.company_id
  WHERE a.company_id = v_qauto
    AND pc.name IN ('Audi', 'Volkswagen', 'Skoda')
    AND a.status IN ('draft', 'under_review', 'active', 'approved', 'pending');

  RAISE NOTICE 'qauto_app_company_realign: will update % open application(s)', v_updated;

  ALTER TABLE public.applications DISABLE TRIGGER trg_enforce_customer_application_field_guard;

  UPDATE public.applications a
  SET company_id = p.company_id
      -- intentionally leave updated_at unchanged to avoid reshuffling queues
  FROM public.products p
  JOIN public.companies pc ON pc.id = p.company_id
  WHERE a.vehicle_id = p.id
    AND a.company_id = v_qauto
    AND pc.name IN ('Audi', 'Volkswagen', 'Skoda')
    AND a.status IN ('draft', 'under_review', 'active', 'approved', 'pending')
    AND p.company_id IS NOT NULL
    AND a.company_id IS DISTINCT FROM p.company_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  ALTER TABLE public.applications ENABLE TRIGGER trg_enforce_customer_application_field_guard;

  -- Post-condition: no remaining open QAuto↔brand mismatches
  SELECT count(*) INTO v_remaining
  FROM public.applications a
  JOIN public.products p ON p.id = a.vehicle_id
  JOIN public.companies pc ON pc.id = p.company_id
  JOIN public.companies c ON c.id = a.company_id
  WHERE c.name = 'QAuto'
    AND pc.name IN ('Audi', 'Volkswagen', 'Skoda')
    AND a.status IN ('draft', 'under_review', 'active', 'approved', 'pending');

  IF v_remaining <> 0 THEN
    RAISE EXCEPTION 'qauto_app_company_realign: % open mismatches remain after update', v_remaining;
  END IF;

  RAISE NOTICE 'qauto_app_company_realign: updated % row(s); remaining open mismatches = 0', v_updated;
END $$;
