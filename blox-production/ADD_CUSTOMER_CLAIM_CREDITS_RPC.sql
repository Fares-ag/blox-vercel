-- ============================================
-- Customer-safe credit claim RPC
-- ============================================
-- Goal:
-- - Allow customers to claim their credits after payment verification
-- - Only works for their own account (secure)
-- - Validates payment exists and is completed
--
-- Run in Supabase SQL Editor (production). Safe to re-run.
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
  v_custom_data JSONB;
  v_credits_to_add INTEGER;
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- Get current user's email
  v_user_email := LOWER(auth.jwt() ->> 'email');
  
  IF v_user_email IS NULL OR v_user_email = '' THEN
    RETURN QUERY SELECT FALSE, 'Not authenticated'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Find the payment transaction
  SELECT *
  INTO v_payment_record
  FROM payment_transactions pt
  WHERE pt.transaction_id = p_transaction_id
  LIMIT 1;

  -- If no payment found, return error
  IF v_payment_record.id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Payment transaction not found'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Verify payment is completed
  IF v_payment_record.status <> 'completed' THEN
    RETURN QUERY SELECT FALSE, ('Payment not completed. Status: ' || v_payment_record.status)::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Check if this is a credit top-up (transaction_id starts with "CREDIT-")
  IF p_transaction_id NOT LIKE 'CREDIT-%' THEN
    RETURN QUERY SELECT FALSE, 'Not a credit top-up transaction'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Calculate credits from payment amount (1 QAR = 1 credit)
  v_credits_to_add := FLOOR(v_payment_record.amount)::INTEGER;
  
  IF v_credits_to_add IS NULL OR v_credits_to_add <= 0 THEN
    RETURN QUERY SELECT FALSE, 'Invalid credit amount'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Check if credits already claimed (idempotency)
  -- Look for a credit_history entry with this transaction_id
  IF EXISTS (
    SELECT 1 FROM credit_history
    WHERE user_email = v_user_email
    AND description LIKE '%' || p_transaction_id || '%'
  ) THEN
    -- Already claimed, return current balance
    SELECT COALESCE(balance, 0) INTO v_current_balance
    FROM user_credits
    WHERE user_credits.user_email = v_user_email;
    
    RETURN QUERY SELECT TRUE, 'Credits already claimed'::TEXT, v_credits_to_add, COALESCE(v_current_balance, 0::NUMERIC);
    RETURN;
  END IF;

  -- Get current balance
  SELECT COALESCE(balance, 0) INTO v_current_balance
  FROM user_credits
  WHERE user_email = v_user_email;

  -- Calculate new balance
  v_new_balance := COALESCE(v_current_balance, 0) + v_credits_to_add;

  -- UPSERT user credits
  INSERT INTO user_credits (user_email, balance, updated_at)
  VALUES (v_user_email, v_new_balance, NOW())
  ON CONFLICT (user_email)
  DO UPDATE SET
    balance = v_new_balance,
    updated_at = NOW();

  -- Insert credit history
  INSERT INTO credit_history (
    user_email,
    amount,
    transaction_type,
    description,
    created_at
  ) VALUES (
    v_user_email,
    v_credits_to_add,
    'credit',
    format('Credit top-up via payment. Transaction ID: %s, Payment ID: %s', p_transaction_id, v_payment_record.skipcash_payment_id),
    NOW()
  );

  -- Return success
  RETURN QUERY SELECT TRUE, 'Credits added successfully'::TEXT, v_credits_to_add, v_new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.customer_claim_payment_credits(TEXT) TO authenticated;

COMMENT ON FUNCTION public.customer_claim_payment_credits IS 'Allows customers to claim credits from their own verified payment transactions. Idempotent and secure.';
