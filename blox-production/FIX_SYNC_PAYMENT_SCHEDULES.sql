-- OPS: apply live (same body as migration 20260718040000).
-- Applied live 2026-07-18 (function body only).
--
-- OPTIONAL backfill (explicit approve before running) — nudges active apps that
-- have installment_plan.schedule but zero payment_schedules rows:
--   UPDATE public.applications
--   SET updated_at = now()
--   WHERE status = 'active'
--     AND installment_plan ? 'schedule'
--     AND jsonb_typeof(installment_plan->'schedule') = 'array'
--     AND jsonb_array_length(installment_plan->'schedule') > 0
--     AND NOT EXISTS (
--       SELECT 1 FROM public.payment_schedules ps WHERE ps.application_id = applications.id
--     )
--   RETURNING id;

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
