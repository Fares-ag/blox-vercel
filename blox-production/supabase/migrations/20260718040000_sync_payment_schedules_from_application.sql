-- Replace placeholder trg_sync_payment_schedules body.
-- Safest policy: when an application is active and has installment_plan.schedule
-- but ZERO payment_schedules rows, materialize rows from JSON.
-- Never deletes or rewrites existing schedule rows (preserves paid history).

CREATE OR REPLACE FUNCTION public.sync_payment_schedules_from_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sched jsonb;
  item jsonb;
  existing_count integer;
  due text;
  amt numeric;
  st text;
  paid_amt numeric;
BEGIN
  IF NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;

  sched := NEW.installment_plan -> 'schedule';
  IF sched IS NULL
     OR jsonb_typeof(sched) <> 'array'
     OR jsonb_array_length(sched) = 0 THEN
    RETURN NEW;
  END IF;

  SELECT count(*)::integer INTO existing_count
  FROM public.payment_schedules
  WHERE application_id = NEW.id;

  -- Only bootstrap empty schedules — never wipe / rebuild.
  IF existing_count > 0 THEN
    RETURN NEW;
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(sched)
  LOOP
    due := COALESCE(item ->> 'dueDate', item ->> 'due_date');
    IF due IS NULL OR btrim(due) = '' THEN
      CONTINUE;
    END IF;

    BEGIN
      amt := COALESCE((item ->> 'amount')::numeric, 0);
    EXCEPTION WHEN others THEN
      amt := 0;
    END;

    st := lower(COALESCE(NULLIF(btrim(item ->> 'status'), ''), 'upcoming'));
    IF st IN ('paid', 'completed') THEN
      st := 'paid';
    ELSIF st IN ('partially_paid', 'partial', 'partially paid') THEN
      st := 'partially_paid';
    ELSE
      st := 'upcoming';
    END IF;

    BEGIN
      paid_amt := COALESCE(
        (item ->> 'paidAmount')::numeric,
        (item ->> 'paid_amount')::numeric,
        CASE WHEN st = 'paid' THEN amt ELSE 0 END
      );
    EXCEPTION WHEN others THEN
      paid_amt := CASE WHEN st = 'paid' THEN amt ELSE 0 END;
    END;

    INSERT INTO public.payment_schedules (
      application_id,
      due_date,
      amount,
      status,
      paid_amount,
      remaining_amount,
      paid_date,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      due::date,
      amt,
      st,
      paid_amt,
      GREATEST(0, amt - paid_amt),
      CASE WHEN st = 'paid' THEN now() ELSE NULL END,
      now(),
      now()
    );
  END LOOP;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_payment_schedules_from_application() IS
  'Bootstraps payment_schedules from installment_plan.schedule when active and schedules are empty. Never mutates existing rows.';
