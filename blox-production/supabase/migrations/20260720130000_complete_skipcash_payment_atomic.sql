-- =============================================================================
-- Atomic SkipCash payment completion (idempotent, service-role safe)
-- - complete_skipcash_payment: txn + schedule + credits in one transaction
-- - grant_payment_credits_internal: credits without is_admin() gate
-- - ledger_applied_at: apply-once marker
-- - status 'refunded' supported (no schedule advance)
-- =============================================================================

ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS ledger_applied_at TIMESTAMPTZ;

ALTER TABLE public.payment_transactions
  DROP CONSTRAINT IF EXISTS payment_transactions_status_check;

ALTER TABLE public.payment_transactions
  ADD CONSTRAINT payment_transactions_status_check
  CHECK (status IN (
    'pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'
  ));

-- ---------------------------------------------------------------------------
-- Internal credit grant (callable by service_role / SECURITY DEFINER parents)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grant_payment_credits_internal(
  p_user_email TEXT,
  p_amount NUMERIC,
  p_transaction_id TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  credits_added INTEGER,
  new_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email TEXT;
  v_credits INTEGER;
  v_current NUMERIC;
  v_new NUMERIC;
BEGIN
  v_email := lower(nullif(trim(coalesce(p_user_email, '')), ''));
  IF v_email IS NULL THEN
    RETURN QUERY SELECT false, 'Missing user email'::text, 0, 0::numeric;
    RETURN;
  END IF;

  v_credits := floor(coalesce(p_amount, 0))::integer;
  IF v_credits IS NULL OR v_credits <= 0 THEN
    RETURN QUERY SELECT false, 'Invalid credit amount'::text, 0, 0::numeric;
    RETURN;
  END IF;

  IF p_transaction_id IS NULL OR trim(p_transaction_id) = '' THEN
    RETURN QUERY SELECT false, 'Missing transaction id'::text, 0, 0::numeric;
    RETURN;
  END IF;

  -- Idempotency
  IF EXISTS (
    SELECT 1
    FROM public.credit_transactions ct
    WHERE ct.payment_transaction_id = p_transaction_id
       OR (
         lower(ct.user_email) = v_email
         AND ct.description ILIKE '%' || p_transaction_id || '%'
       )
  ) THEN
    SELECT coalesce(balance, 0) INTO v_current
    FROM public.user_credits
    WHERE lower(user_email) = v_email;
    RETURN QUERY SELECT true, 'Credits already added'::text, 0, coalesce(v_current, 0::numeric);
    RETURN;
  END IF;

  INSERT INTO public.user_credits (user_email, balance, updated_at)
  VALUES (v_email, 0, now())
  ON CONFLICT (user_email) DO NOTHING;

  SELECT coalesce(balance, 0) INTO v_current
  FROM public.user_credits
  WHERE lower(user_email) = v_email
  FOR UPDATE;

  v_new := coalesce(v_current, 0) + v_credits;

  UPDATE public.user_credits
  SET balance = v_new, updated_at = now()
  WHERE lower(user_email) = v_email;

  INSERT INTO public.credit_transactions (
    user_email,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    description,
    admin_email,
    payment_transaction_id,
    created_at
  ) VALUES (
    v_email,
    'topup',
    v_credits,
    coalesce(v_current, 0),
    v_new,
    coalesce(p_description, 'Credit top-up via SkipCash. Transaction ID: ' || p_transaction_id),
    NULL,
    p_transaction_id,
    now()
  );

  RETURN QUERY SELECT true, 'Credits added'::text, v_credits, v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_payment_credits_internal(TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_payment_credits_internal(TEXT, NUMERIC, TEXT, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- Apply schedule for one completed payment (locked, once per txn via caller)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_payment_schedule_locked(
  p_application_id TEXT,
  p_amount NUMERIC,
  p_payment_schedule_id TEXT DEFAULT NULL,
  p_due_date TEXT DEFAULT NULL,
  p_is_settlement BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_paid_at TIMESTAMPTZ := now();
  v_paid_date TEXT := to_char(now(), 'YYYY-MM-DD');
  v_pay NUMERIC := coalesce(p_amount, 0);
  v_app RECORD;
  v_row RECORD;
  v_due TEXT;
  v_original NUMERIC;
  v_existing_paid NUMERIC;
  v_new_paid NUMERIC;
  v_remaining NUMERIC;
  v_ip JSONB;
  v_schedule JSONB;
  v_new_schedule JSONB;
  v_total_remaining NUMERIC;
  v_cover_all BOOLEAN;
BEGIN
  IF p_application_id IS NULL OR trim(p_application_id) = '' THEN
    RETURN;
  END IF;

  SELECT id, installment_plan INTO v_app
  FROM public.applications
  WHERE id::text = p_application_id
  FOR UPDATE;

  IF v_app.id IS NULL THEN
    RAISE EXCEPTION 'Application not found: %', p_application_id;
  END IF;

  v_ip := v_app.installment_plan;

  IF coalesce(p_is_settlement, false) THEN
    SELECT coalesce(sum(
      GREATEST(
        0,
        coalesce(ps.remaining_amount, ps.amount - coalesce(ps.paid_amount, 0))
      )
    ), 0)
    INTO v_total_remaining
    FROM public.payment_schedules ps
    WHERE ps.application_id::text = p_application_id
      AND ps.status IS DISTINCT FROM 'paid';

    v_cover_all := (v_pay + 1) >= v_total_remaining;

    IF v_cover_all THEN
      UPDATE public.payment_schedules ps
      SET
        status = 'paid',
        paid_date = v_paid_at,
        paid_amount = ps.amount,
        remaining_amount = 0,
        updated_at = v_paid_at
      WHERE ps.application_id::text = p_application_id
        AND ps.status IS DISTINCT FROM 'paid';

      IF v_ip IS NOT NULL AND v_ip ? 'schedule' THEN
        SELECT jsonb_agg(
          CASE WHEN (elem->>'status') IS DISTINCT FROM 'paid' THEN
            elem || jsonb_build_object(
              'status', 'paid',
              'paidAmount', coalesce((elem->>'amount')::numeric, 0),
              'remainingAmount', 0,
              'paidDate', v_paid_date
            )
          ELSE elem END
        ) INTO v_new_schedule
        FROM jsonb_array_elements(v_ip->'schedule') AS elem;

        IF v_new_schedule IS NOT NULL THEN
          UPDATE public.applications
          SET installment_plan = jsonb_set(v_ip, '{schedule}', v_new_schedule),
              updated_at = v_paid_at
          WHERE id = v_app.id;
        END IF;
      END IF;
    END IF;
    RETURN;
  END IF;

  -- Resolve target row
  v_due := nullif(trim(coalesce(p_due_date, '')), '');

  IF p_payment_schedule_id IS NOT NULL
     AND p_payment_schedule_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT * INTO v_row
    FROM public.payment_schedules ps
    WHERE ps.id::text = p_payment_schedule_id
      AND ps.application_id::text = p_application_id
    FOR UPDATE;
    IF v_row.id IS NOT NULL THEN
      v_due := v_row.due_date::text;
    END IF;
  END IF;

  IF v_row.id IS NULL AND v_due IS NOT NULL THEN
    SELECT * INTO v_row
    FROM public.payment_schedules ps
    WHERE ps.application_id::text = p_application_id
      AND ps.due_date::text = v_due
    FOR UPDATE;
  END IF;

  IF v_row.id IS NULL THEN
    -- Subquery so FOR UPDATE + ORDER BY LIMIT is valid across PG versions
    SELECT * INTO v_row
    FROM public.payment_schedules ps
    WHERE ps.id = (
      SELECT id
      FROM public.payment_schedules
      WHERE application_id::text = p_application_id
        AND status IS DISTINCT FROM 'paid'
        AND GREATEST(0, coalesce(remaining_amount, amount - coalesce(paid_amount, 0))) > 0.001
      ORDER BY due_date ASC
      LIMIT 1
    )
    FOR UPDATE;
    IF v_row.id IS NOT NULL THEN
      v_due := v_row.due_date::text;
    END IF;
  END IF;

  -- Already fully paid → no-op (idempotent)
  IF v_row.id IS NOT NULL AND v_row.status = 'paid' THEN
    RETURN;
  END IF;

  IF v_row.id IS NOT NULL THEN
    v_original := coalesce(v_row.amount, 0);
    v_existing_paid := coalesce(v_row.paid_amount, 0);
    v_new_paid := v_existing_paid + v_pay;
    v_remaining := GREATEST(0, v_original - v_new_paid);

    UPDATE public.payment_schedules
    SET
      status = CASE WHEN v_remaining <= 0.01 THEN 'paid' ELSE 'partially_paid' END,
      paid_date = CASE WHEN v_remaining <= 0.01 THEN v_paid_at ELSE paid_date END,
      paid_amount = v_new_paid,
      remaining_amount = v_remaining,
      updated_at = v_paid_at
    WHERE id = v_row.id;
  END IF;

  IF v_due IS NOT NULL AND v_ip IS NOT NULL AND v_ip ? 'schedule' THEN
    v_schedule := v_ip->'schedule';
    -- Skip if JSON already paid for this due date
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_schedule) e
      WHERE (e->>'dueDate') = v_due AND (e->>'status') = 'paid'
    ) THEN
      RETURN;
    END IF;

    SELECT jsonb_agg(
      CASE WHEN (elem->>'dueDate') = v_due THEN
        elem || jsonb_build_object(
          'status', CASE
            WHEN GREATEST(
              0,
              coalesce((elem->>'amount')::numeric, 0)
                - (coalesce((elem->>'paidAmount')::numeric, 0) + v_pay)
            ) <= 0.01 THEN 'paid'
            ELSE 'partially_paid'
          END,
          'paidAmount', coalesce((elem->>'paidAmount')::numeric, 0) + v_pay,
          'remainingAmount', GREATEST(
            0,
            coalesce((elem->>'amount')::numeric, 0)
              - (coalesce((elem->>'paidAmount')::numeric, 0) + v_pay)
          ),
          'paidDate', CASE
            WHEN GREATEST(
              0,
              coalesce((elem->>'amount')::numeric, 0)
                - (coalesce((elem->>'paidAmount')::numeric, 0) + v_pay)
            ) <= 0.01 THEN v_paid_date
            ELSE coalesce(elem->>'paidDate', v_paid_date)
          END
        )
      ELSE elem END
    ) INTO v_new_schedule
    FROM jsonb_array_elements(v_schedule) AS elem;

    IF v_new_schedule IS NOT NULL THEN
      UPDATE public.applications
      SET installment_plan = jsonb_set(v_ip, '{schedule}', v_new_schedule),
          updated_at = v_paid_at
      WHERE id = v_app.id;
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_payment_schedule_locked(TEXT, NUMERIC, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_payment_schedule_locked(TEXT, NUMERIC, TEXT, TEXT, BOOLEAN) TO service_role;

-- ---------------------------------------------------------------------------
-- Main atomic completer used by skipcash-verify + skipcash-webhook
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_skipcash_payment(
  p_transaction_id TEXT,
  p_skipcash_payment_id TEXT DEFAULT NULL,
  p_amount NUMERIC DEFAULT NULL,
  p_status TEXT DEFAULT 'completed',
  p_application_id TEXT DEFAULT NULL,
  p_payment_schedule_id TEXT DEFAULT NULL,
  p_due_date TEXT DEFAULT NULL,
  p_is_settlement BOOLEAN DEFAULT FALSE,
  p_is_credit_topup BOOLEAN DEFAULT FALSE,
  p_credits_amount NUMERIC DEFAULT NULL,
  p_customer_email TEXT DEFAULT NULL,
  p_failure_reason TEXT DEFAULT NULL,
  p_amount_tolerance NUMERIC DEFAULT 0.05
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_txn public.payment_transactions%ROWTYPE;
  v_status TEXT := lower(coalesce(nullif(trim(p_status), ''), 'completed'));
  v_amount NUMERIC;
  v_app_id TEXT;
  v_email TEXT;
  v_credit_result RECORD;
  v_credits NUMERIC;
BEGIN
  IF p_transaction_id IS NULL OR trim(p_transaction_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'transaction_id required', 'code', 'missing_transaction_id');
  END IF;

  SELECT * INTO v_txn
  FROM public.payment_transactions
  WHERE transaction_id = p_transaction_id
  FOR UPDATE;

  IF v_txn.id IS NULL AND p_skipcash_payment_id IS NOT NULL THEN
    SELECT * INTO v_txn
    FROM public.payment_transactions
    WHERE skipcash_payment_id = p_skipcash_payment_id
    FOR UPDATE;
  END IF;

  -- Upsert path when webhook arrives before local insert
  IF v_txn.id IS NULL THEN
    INSERT INTO public.payment_transactions (
      transaction_id,
      skipcash_payment_id,
      application_id,
      payment_schedule_id,
      amount,
      method,
      status,
      payer_email,
      failure_reason,
      completed_at,
      created_at
    ) VALUES (
      p_transaction_id,
      p_skipcash_payment_id,
      CASE WHEN p_application_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN p_application_id::uuid ELSE NULL END,
      CASE WHEN p_payment_schedule_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN p_payment_schedule_id::uuid ELSE NULL END,
      coalesce(p_amount, 0),
      'card',
      CASE WHEN v_status IN ('pending','processing','completed','failed','cancelled','refunded')
        THEN v_status ELSE 'pending' END,
      lower(nullif(trim(coalesce(p_customer_email, '')), '')),
      p_failure_reason,
      CASE WHEN v_status IN ('completed', 'refunded') THEN now() ELSE NULL END,
      now()
    )
    RETURNING * INTO v_txn;
  END IF;

  -- Amount bind (reject mismatched webhook amounts vs pending row)
  IF p_amount IS NOT NULL
     AND v_txn.amount IS NOT NULL
     AND v_txn.amount > 0
     AND v_status = 'completed'
     AND abs(p_amount - v_txn.amount) > coalesce(p_amount_tolerance, 0.05) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Amount mismatch: webhook %s vs pending %s', p_amount, v_txn.amount),
      'code', 'amount_mismatch'
    );
  END IF;

  v_amount := coalesce(NULLIF(p_amount, 0), v_txn.amount, 0);
  v_app_id := coalesce(nullif(trim(p_application_id), ''), v_txn.application_id::text);
  v_email := lower(nullif(trim(coalesce(p_customer_email, v_txn.payer_email, '')), ''));

  -- Refunded: record only, never advance schedule / credits
  IF v_status = 'refunded' OR v_status = '6' THEN
    UPDATE public.payment_transactions
    SET
      status = 'refunded',
      skipcash_payment_id = coalesce(p_skipcash_payment_id, skipcash_payment_id),
      failure_reason = coalesce(p_failure_reason, 'SkipCash refunded'),
      completed_at = coalesce(completed_at, now())
    WHERE id = v_txn.id;
    RETURN jsonb_build_object(
      'success', true,
      'status', 'refunded',
      'ledger_applied', false,
      'message', 'Refund recorded; schedule not advanced'
    );
  END IF;

  -- Non-completed terminal / intermediate statuses
  IF v_status IN ('failed', 'cancelled', 'pending', 'processing') THEN
    -- Do not downgrade completed → failed
    IF v_txn.status = 'completed' AND v_status = 'failed' THEN
      RETURN jsonb_build_object('success', true, 'status', 'completed', 'message', 'Ignored failed after completed');
    END IF;

    UPDATE public.payment_transactions
    SET
      status = v_status,
      skipcash_payment_id = coalesce(p_skipcash_payment_id, skipcash_payment_id),
      failure_reason = CASE
        WHEN v_status IN ('failed', 'cancelled') THEN coalesce(p_failure_reason, failure_reason)
        ELSE failure_reason
      END,
      payer_email = coalesce(payer_email, v_email)
    WHERE id = v_txn.id;

    RETURN jsonb_build_object('success', true, 'status', v_status, 'ledger_applied', false);
  END IF;

  -- Completed path
  IF v_status <> 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unsupported status: ' || v_status, 'code', 'bad_status');
  END IF;

  -- Idempotent: already fully applied
  IF v_txn.status = 'completed' AND v_txn.ledger_applied_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', 'completed',
      'ledger_applied', true,
      'message', 'Already applied'
    );
  END IF;

  UPDATE public.payment_transactions
  SET
    status = 'completed',
    skipcash_payment_id = coalesce(p_skipcash_payment_id, skipcash_payment_id),
    completed_at = coalesce(completed_at, now()),
    payer_email = coalesce(payer_email, v_email),
    amount = CASE WHEN amount IS NULL OR amount = 0 THEN v_amount ELSE amount END,
    failure_reason = NULL
  WHERE id = v_txn.id;

  -- Credit top-up
  IF coalesce(p_is_credit_topup, false)
     OR (p_transaction_id LIKE 'CREDIT-%') THEN
    v_credits := coalesce(NULLIF(p_credits_amount, 0), v_amount);
    IF v_email IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Credit top-up missing customer email',
        'code', 'missing_email'
      );
    END IF;

    SELECT * INTO v_credit_result
    FROM public.grant_payment_credits_internal(
      v_email,
      v_credits,
      p_transaction_id,
      format('Credit top-up via SkipCash. Transaction ID: %s, Payment ID: %s',
        p_transaction_id, coalesce(p_skipcash_payment_id, ''))
    );

    IF NOT coalesce(v_credit_result.success, false) THEN
      RAISE EXCEPTION 'Credit grant failed: %', v_credit_result.message;
    END IF;
  ELSIF v_app_id IS NOT NULL THEN
    PERFORM public.apply_payment_schedule_locked(
      v_app_id,
      v_amount,
      coalesce(p_payment_schedule_id, v_txn.payment_schedule_id::text),
      p_due_date,
      coalesce(p_is_settlement, false)
    );
  END IF;

  UPDATE public.payment_transactions
  SET ledger_applied_at = now()
  WHERE id = v_txn.id
    AND ledger_applied_at IS NULL;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'completed',
    'ledger_applied', true,
    'transaction_id', p_transaction_id,
    'credits', CASE WHEN v_credit_result.credits_added IS NOT NULL
      THEN v_credit_result.credits_added ELSE 0 END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_skipcash_payment(
  TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, NUMERIC, TEXT, TEXT, NUMERIC
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_skipcash_payment(
  TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, NUMERIC, TEXT, TEXT, NUMERIC
) TO service_role;

COMMENT ON FUNCTION public.complete_skipcash_payment IS
  'Atomically complete a SkipCash payment once: txn status + schedule dual-write OR credit grant. Idempotent via ledger_applied_at.';
