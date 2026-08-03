-- Allow credit officers to rebuild payment_schedules on Activate Financing

CREATE OR REPLACE FUNCTION public.credit_can_access_application(p_application_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO off
AS $$
  SELECT public.is_credit_officer()
    AND (
      public.credit_officer_has_all_scope()
      OR EXISTS (
        SELECT 1
        FROM public.applications a
        WHERE a.id = p_application_id
          AND a.company_id IN (SELECT public.current_user_credit_company_ids())
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.credit_can_access_application(text) TO authenticated;

DROP POLICY IF EXISTS "Credit officers manage payment schedules" ON public.payment_schedules;
DROP POLICY IF EXISTS "Credit officers read payment schedules" ON public.payment_schedules;
DROP POLICY IF EXISTS "Credit officers insert payment schedules" ON public.payment_schedules;
DROP POLICY IF EXISTS "Credit officers delete payment schedules" ON public.payment_schedules;

-- Rebuild on Activate: insert/delete only (mark-paid stays finance/admin via their policies)
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
