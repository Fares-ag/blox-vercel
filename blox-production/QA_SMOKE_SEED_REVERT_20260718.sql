-- Revert QA smoke seeds from 2026-07-18 (fares* test apps only).
-- Safe to run after interactive smoke is done.

BEGIN;
ALTER TABLE public.applications DISABLE TRIGGER trg_enforce_application_status_transition;

UPDATE applications
SET
  status = 'under_review',
  contract_generated = false,
  contract_signed = false,
  contract_signature = NULL,
  updated_at = now()
WHERE id = 'application-58'
  AND customer_email = 'fares@fares.com'
  AND status = 'contract_signing_required';

UPDATE applications
SET
  status = 'under_review',
  resubmission_comments = NULL,
  resubmission_date = NULL,
  updated_at = now()
WHERE id = 'application-49'
  AND customer_email = 'faresm5485@gmail.com'
  AND status = 'resubmission_required'
  AND resubmission_comments LIKE 'QA smoke seed 2026-07-18%';

ALTER TABLE public.applications ENABLE TRIGGER trg_enforce_application_status_transition;
COMMIT;
