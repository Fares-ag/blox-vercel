-- Narrow credit payment_schedules access: rebuild (insert/delete) only — not mark-paid

DROP POLICY IF EXISTS "Credit officers manage payment schedules" ON public.payment_schedules;
DROP POLICY IF EXISTS "Credit officers read payment schedules" ON public.payment_schedules;
DROP POLICY IF EXISTS "Credit officers insert payment schedules" ON public.payment_schedules;
DROP POLICY IF EXISTS "Credit officers delete payment schedules" ON public.payment_schedules;

CREATE POLICY "Credit officers read payment schedules"
  ON public.payment_schedules
  FOR SELECT
  USING (public.credit_can_access_application(application_id));

CREATE POLICY "Credit officers insert payment schedules"
  ON public.payment_schedules
  FOR INSERT
  WITH CHECK (public.credit_can_access_application(application_id));

CREATE POLICY "Credit officers delete payment schedules"
  ON public.payment_schedules
  FOR DELETE
  USING (public.credit_can_access_application(application_id));
