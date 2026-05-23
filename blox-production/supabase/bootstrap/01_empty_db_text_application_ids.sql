-- Convert applications.id (and referencing FKs) from UUID to TEXT for application-{n} IDs.
-- SAFE ONLY on a brand-new database: no application rows and no related payment rows.
-- After supabase-schema.sql; before repo migrations that expect TEXT application ids.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.applications LIMIT 1) THEN
    RAISE EXCEPTION
      'bootstrap/01_empty_db_text_application_ids: applications must be empty. '
      'If you have data, use supabase-migration-simple-ids.sql (Supabase SQL Editor) instead.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.payment_schedules LIMIT 1)
     OR EXISTS (SELECT 1 FROM public.payment_transactions LIMIT 1)
     OR EXISTS (SELECT 1 FROM public.payment_deferrals LIMIT 1)
     OR EXISTS (SELECT 1 FROM public.ledgers LIMIT 1) THEN
    RAISE EXCEPTION
      'bootstrap/01_empty_db_text_application_ids: payment_schedules, payment_transactions, '
      'payment_deferrals, and ledgers must be empty.';
  END IF;
END $$;

-- Used by supabase/migrations/20250407130000 before 20250408120000 switches to a sequence.
CREATE OR REPLACE FUNCTION public.get_next_application_number()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  max_num INTEGER;
BEGIN
  SELECT COALESCE(
    MAX(
      CASE
        WHEN id::TEXT ~ '^application-[0-9]+$' THEN
          CAST(SUBSTRING(id::TEXT FROM 'application-([0-9]+)') AS INTEGER)
        ELSE 0
      END
    ),
    0
  ) INTO max_num
  FROM public.applications;

  RETURN max_num + 1;
END;
$$;

ALTER TABLE public.payment_schedules DROP CONSTRAINT IF EXISTS payment_schedules_application_id_fkey;
ALTER TABLE public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_application_id_fkey;
ALTER TABLE public.payment_deferrals DROP CONSTRAINT IF EXISTS payment_deferrals_application_id_fkey;
ALTER TABLE public.ledgers DROP CONSTRAINT IF EXISTS ledgers_application_id_fkey;

ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_pkey;

ALTER TABLE public.applications ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.applications ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE public.applications ADD PRIMARY KEY (id);

ALTER TABLE public.payment_schedules ALTER COLUMN application_id TYPE TEXT USING application_id::TEXT;
ALTER TABLE public.payment_transactions ALTER COLUMN application_id TYPE TEXT USING application_id::TEXT;
ALTER TABLE public.payment_deferrals ALTER COLUMN application_id TYPE TEXT USING application_id::TEXT;
ALTER TABLE public.ledgers ALTER COLUMN application_id TYPE TEXT USING application_id::TEXT;

ALTER TABLE public.payment_schedules
  ADD CONSTRAINT payment_schedules_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;

ALTER TABLE public.payment_transactions
  ADD CONSTRAINT payment_transactions_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;

ALTER TABLE public.payment_deferrals
  ADD CONSTRAINT payment_deferrals_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;

ALTER TABLE public.ledgers
  ADD CONSTRAINT ledgers_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE SET NULL;
