-- Harden customer_pay_installment_with_credits: FOR UPDATE + amount ≤ remaining
CREATE OR REPLACE FUNCTION public.customer_pay_installment_with_credits(
  p_application_id TEXT,
  p_due_date TEXT,
  p_amount DECIMAL(12, 2)
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_balance DECIMAL(12, 2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email TEXT;
  v_app RECORD;
  v_schedule RECORD;
  v_balance_before DECIMAL(12, 2);
  v_balance_after DECIMAL(12, 2);
  v_original_amount DECIMAL(12, 2);
  v_existing_paid DECIMAL(12, 2);
  v_new_paid DECIMAL(12, 2);
  v_remaining DECIMAL(12, 2);
  v_schedule_remaining DECIMAL(12, 2);
  v_paid_at TIMESTAMPTZ;
  v_ip JSONB;
  v_schedule_json JSONB;
  v_new_schedule JSONB;
  v_txn_id TEXT;
BEGIN
  v_user_email := LOWER(COALESCE(auth.jwt() ->> 'email', ''));
  IF v_user_email = '' THEN
    RETURN QUERY SELECT FALSE, 'Not authenticated'::TEXT, 0::DECIMAL;
    RETURN;
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN QUERY SELECT FALSE, 'Amount must be greater than 0'::TEXT, 0::DECIMAL;
    RETURN;
  END IF;

  IF NOT public.current_user_can_pay_for_application(p_application_id) THEN
    RETURN QUERY SELECT FALSE, 'Not authorized to pay for this application'::TEXT, 0::DECIMAL;
    RETURN;
  END IF;

  SELECT id, customer_email, installment_plan INTO v_app
  FROM public.applications
  WHERE id::text = p_application_id
  FOR UPDATE;

  IF v_app.id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Application not found'::TEXT, 0::DECIMAL;
    RETURN;
  END IF;

  SELECT id, amount,
         COALESCE(ps.paid_amount, 0) AS paid_amount,
         COALESCE(ps.remaining_amount, ps.amount - COALESCE(ps.paid_amount, 0)) AS remaining_amount,
         ps.status
  INTO v_schedule
  FROM public.payment_schedules ps
  WHERE ps.application_id::text = p_application_id
    AND ps.due_date::text = p_due_date
  FOR UPDATE;

  IF v_schedule.id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Payment schedule not found for this due date'::TEXT, 0::DECIMAL;
    RETURN;
  END IF;

  IF v_schedule.status = 'paid' THEN
    RETURN QUERY SELECT FALSE, 'Installment already paid'::TEXT, 0::DECIMAL;
    RETURN;
  END IF;

  v_schedule_remaining := GREATEST(0, COALESCE(v_schedule.remaining_amount, 0));
  IF p_amount > v_schedule_remaining + 0.01 THEN
    RETURN QUERY SELECT FALSE,
      ('Amount exceeds remaining ' || v_schedule_remaining::text)::TEXT,
      0::DECIMAL;
    RETURN;
  END IF;

  v_original_amount := v_schedule.amount;
  v_existing_paid   := v_schedule.paid_amount;
  v_new_paid        := v_existing_paid + p_amount;
  v_remaining       := GREATEST(0, v_original_amount - v_new_paid);
  v_paid_at         := NOW();

  INSERT INTO public.user_credits (user_email, balance, updated_at)
  VALUES (v_user_email, 0, v_paid_at)
  ON CONFLICT (user_email) DO NOTHING;

  SELECT COALESCE(balance, 0) INTO v_balance_before
  FROM public.user_credits
  WHERE lower(user_email) = v_user_email
  FOR UPDATE;

  IF COALESCE(v_balance_before, 0) < p_amount THEN
    RETURN QUERY SELECT FALSE, 'Insufficient Blox Credits'::TEXT, COALESCE(v_balance_before, 0);
    RETURN;
  END IF;

  v_balance_after := v_balance_before - p_amount;

  UPDATE public.user_credits
  SET balance = v_balance_after, updated_at = v_paid_at
  WHERE lower(user_email) = v_user_email;

  INSERT INTO public.credit_transactions (
    user_email, transaction_type, amount, balance_before, balance_after, description
  ) VALUES (
    v_user_email, 'payment', p_amount, v_balance_before, v_balance_after,
    'Payment for application ' || p_application_id || ', due ' || p_due_date
  );

  UPDATE public.payment_schedules
  SET
    status         = CASE WHEN v_remaining <= 0.01 THEN 'paid' ELSE 'partially_paid' END,
    paid_date      = CASE WHEN v_remaining <= 0.01 THEN v_paid_at ELSE paid_date END,
    paid_amount    = v_new_paid,
    remaining_amount = v_remaining,
    updated_at     = v_paid_at
  WHERE id = v_schedule.id;

  v_txn_id := 'BLOX-' || replace(p_application_id, '-', '') || '-' || replace(p_due_date, '-', '') || '-' || to_char(extract(epoch from v_paid_at)::bigint, 'FM999999999999');
  v_ip := v_app.installment_plan;
  IF v_ip IS NOT NULL AND v_ip ? 'schedule' THEN
    v_schedule_json := v_ip->'schedule';
    SELECT jsonb_agg(
      CASE WHEN (elem->>'dueDate') = p_due_date THEN
        elem || jsonb_build_object(
          'status', CASE WHEN v_remaining <= 0.01 THEN 'paid' ELSE 'partially_paid' END,
          'paidAmount', v_new_paid,
          'remainingAmount', v_remaining,
          'paidDate', CASE WHEN v_remaining <= 0.01 THEN to_char(v_paid_at, 'YYYY-MM-DD') ELSE (elem->>'paidDate') END,
          'paymentMethod', 'blox_credit',
          'transactionId', v_txn_id
        )
      ELSE elem END
    ) INTO v_new_schedule
    FROM jsonb_array_elements(v_schedule_json) AS elem;

    IF v_new_schedule IS NOT NULL THEN
      UPDATE public.applications
      SET installment_plan = jsonb_set(v_ip, '{schedule}', v_new_schedule),
          updated_at = v_paid_at
      WHERE id = v_app.id;
    END IF;
  END IF;

  INSERT INTO public.payment_transactions (
    application_id, payment_schedule_id, amount, method, status, transaction_id, completed_at, ledger_applied_at, payer_email
  ) VALUES (
    (p_application_id::uuid), v_schedule.id, p_amount, 'blox_credit', 'completed', v_txn_id, v_paid_at, v_paid_at, v_user_email
  );

  RETURN QUERY SELECT TRUE, 'Payment successful'::TEXT, v_balance_after;
END;
$$;

GRANT EXECUTE ON FUNCTION public.customer_pay_installment_with_credits(TEXT, TEXT, DECIMAL) TO authenticated;
