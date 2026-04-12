-- ============================================
-- Fix: Prevent double-adding credits on top-up
-- ============================================
-- The webhook adds credits via admin_add_user_credits (writes to credit_transactions).
-- The callback page calls customer_claim_payment_credits (checks credit_history, writes there).
-- If both run, credits were added twice. This migration adds idempotency by also
-- checking credit_transactions so claim is a no-op when webhook already added.
-- ============================================

CREATE OR REPLACE FUNCTION public.customer_claim_payment_credits(
  p_transaction_id TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  credits_added INTEGER,
  new_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email TEXT;
  v_payment_record RECORD;
  v_credits_to_add INTEGER;
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  v_user_email := LOWER(auth.jwt() ->> 'email');

  IF v_user_email IS NULL OR v_user_email = '' THEN
    RETURN QUERY SELECT FALSE, 'Not authenticated'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  SELECT * INTO v_payment_record
  FROM payment_transactions pt
  WHERE pt.transaction_id = p_transaction_id
  LIMIT 1;

  IF v_payment_record.id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Payment transaction not found'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  IF v_payment_record.status <> 'completed' THEN
    RETURN QUERY SELECT FALSE, ('Payment not completed. Status: ' || v_payment_record.status)::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  IF p_transaction_id NOT LIKE 'CREDIT-%' THEN
    RETURN QUERY SELECT FALSE, 'Not a credit top-up transaction'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  v_credits_to_add := FLOOR(v_payment_record.amount)::INTEGER;
  IF v_credits_to_add IS NULL OR v_credits_to_add <= 0 THEN
    RETURN QUERY SELECT FALSE, 'Invalid credit amount'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Idempotency: already claimed via this RPC (credit_history)
  IF EXISTS (
    SELECT 1 FROM credit_history
    WHERE user_email = v_user_email
    AND description LIKE '%' || p_transaction_id || '%'
  ) THEN
    SELECT COALESCE(balance, 0) INTO v_current_balance FROM user_credits WHERE user_email = v_user_email;
    RETURN QUERY SELECT TRUE, 'Credits already claimed'::TEXT, v_credits_to_add, COALESCE(v_current_balance, 0::NUMERIC);
    RETURN;
  END IF;

  -- Idempotency: already added by webhook (admin_add_user_credits -> credit_transactions)
  IF EXISTS (
    SELECT 1 FROM credit_transactions
    WHERE user_email = v_user_email
    AND description LIKE '%' || p_transaction_id || '%'
  ) THEN
    SELECT COALESCE(balance, 0) INTO v_current_balance FROM user_credits WHERE user_email = v_user_email;
    RETURN QUERY SELECT TRUE, 'Credits already added (e.g. via webhook)'::TEXT, 0, COALESCE(v_current_balance, 0::NUMERIC);
    RETURN;
  END IF;

  SELECT COALESCE(balance, 0) INTO v_current_balance FROM user_credits WHERE user_email = v_user_email;
  v_new_balance := COALESCE(v_current_balance, 0) + v_credits_to_add;

  INSERT INTO user_credits (user_email, balance, updated_at)
  VALUES (v_user_email, v_new_balance, NOW())
  ON CONFLICT (user_email)
  DO UPDATE SET balance = v_new_balance, updated_at = NOW();

  INSERT INTO credit_history (
    user_email, amount, transaction_type, description, created_at
  ) VALUES (
    v_user_email,
    v_credits_to_add,
    'credit',
    format('Credit top-up via payment. Transaction ID: %s, Payment ID: %s', p_transaction_id, v_payment_record.skipcash_payment_id),
    NOW()
  );

  RETURN QUERY SELECT TRUE, 'Credits added successfully'::TEXT, v_credits_to_add, v_new_balance;
END;
$$;

COMMENT ON FUNCTION public.customer_claim_payment_credits(TEXT) IS 'Claim credits from completed credit top-up payment. Idempotent: checks both credit_history and credit_transactions to avoid double-add with webhook.';
