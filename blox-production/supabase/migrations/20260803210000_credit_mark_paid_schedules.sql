-- Allow credit officers to mark installments paid (UPDATE payment_schedules)
-- Scoped by credit_can_access_application; insert/delete/read policies unchanged.

DROP POLICY IF EXISTS "Credit officers update payment schedules" ON public.payment_schedules;

CREATE POLICY "Credit officers update payment schedules"
  ON public.payment_schedules
  FOR UPDATE
  USING (public.credit_can_access_application(application_id))
  WITH CHECK (public.credit_can_access_application(application_id));
