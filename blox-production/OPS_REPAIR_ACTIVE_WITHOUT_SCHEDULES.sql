-- PROPOSAL ONLY — do not run without explicit approval.
-- Live QA found active applications with zero payment_schedules rows:
--   application-50, application-54
--
-- Intent: regenerate schedules from applications.installment_plan.schedule JSON
-- (same shape used by admin activate / sync triggers). Review JSON first.

-- 1) Inspect
-- SELECT id, status, installment_plan
-- FROM applications
-- WHERE id IN ('application-50', 'application-54');

-- SELECT application_id, count(*)
-- FROM payment_schedules
-- WHERE application_id IN ('application-50', 'application-54')
-- GROUP BY 1;

-- 2) If installment_plan.schedule is populated, prefer using the existing
--    admin/ops path that syncs schedules (trg_sync_payment_schedules) by
--    re-saving installment_plan via service_role / admin update — OR insert
--    schedule rows from JSON in a controlled script after backup.

-- 3) Do NOT delete or force-status-change without ops sign-off.
