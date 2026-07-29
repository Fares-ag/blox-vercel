-- Credit/finance officers must attach installment_plan.schedule when approving
-- or activating applications. The field guard previously allowed only admins.

CREATE OR REPLACE FUNCTION public.enforce_customer_application_field_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.installment_plan IS DISTINCT FROM OLD.installment_plan THEN
    IF NOT (public.is_credit_officer() OR public.is_finance_officer()) THEN
      RAISE EXCEPTION 'Customers cannot modify installment_plan';
    END IF;
  END IF;

  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'Customers cannot modify company_id';
  END IF;

  IF NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id THEN
    RAISE EXCEPTION 'Customers cannot modify vehicle_id';
  END IF;

  IF NEW.customer_email IS DISTINCT FROM OLD.customer_email THEN
    RAISE EXCEPTION 'Customers cannot modify customer_email';
  END IF;

  RETURN NEW;
END;
$$;
