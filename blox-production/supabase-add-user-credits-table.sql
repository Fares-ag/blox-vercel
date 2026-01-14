-- ============================================
-- USER CREDITS TABLE
-- ============================================
-- This table stores Blox Credits balance for each user
-- ============================================

CREATE TABLE IF NOT EXISTS user_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email VARCHAR(255) NOT NULL UNIQUE,
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_credits_email ON user_credits(user_email);

-- Enable RLS
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR USER_CREDITS
-- ============================================

-- Customers can read their own credits
CREATE POLICY "Customers can read own credits" ON user_credits
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    user_email = current_user_email()
  );

-- Admins can read all credits
CREATE POLICY "Admins can read all credits" ON user_credits
  FOR SELECT USING (is_admin());

-- Admins can insert credits
CREATE POLICY "Admins can insert credits" ON user_credits
  FOR INSERT WITH CHECK (is_admin());

-- Admins can update credits
CREATE POLICY "Admins can update credits" ON user_credits
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

-- Admins can delete credits
CREATE POLICY "Admins can delete credits" ON user_credits
  FOR DELETE USING (is_admin());

-- ============================================
-- CREDIT TRANSACTIONS TABLE
-- ============================================
-- This table tracks all credit transactions (add, subtract, set)
-- ============================================

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email VARCHAR(255) NOT NULL,
  transaction_type VARCHAR(20) CHECK (transaction_type IN ('add', 'subtract', 'set', 'topup', 'payment')) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  balance_before DECIMAL(12, 2) NOT NULL,
  balance_after DECIMAL(12, 2) NOT NULL,
  description TEXT,
  admin_email VARCHAR(255), -- Admin who made the change (if admin action)
  payment_transaction_id VARCHAR(255), -- Link to payment transaction if from payment
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_credit_transactions_email ON credit_transactions(user_email);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON credit_transactions(created_at DESC);

-- Enable RLS
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR CREDIT_TRANSACTIONS
-- ============================================

-- Customers can read their own transactions
CREATE POLICY "Customers can read own credit transactions" ON credit_transactions
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    user_email = current_user_email()
  );

-- Admins can read all transactions
CREATE POLICY "Admins can read all credit transactions" ON credit_transactions
  FOR SELECT USING (is_admin());

-- Only admins can insert transactions (system will also insert via triggers)
CREATE POLICY "Admins can insert credit transactions" ON credit_transactions
  FOR INSERT WITH CHECK (is_admin() OR auth.role() = 'service_role');

-- ============================================
-- FUNCTION: Update updated_at timestamp
-- ============================================

CREATE OR REPLACE FUNCTION update_user_credits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS trigger_update_user_credits_updated_at ON user_credits;
CREATE TRIGGER trigger_update_user_credits_updated_at
  BEFORE UPDATE ON user_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_user_credits_updated_at();

-- ============================================
-- ADMIN RPC FUNCTIONS FOR CREDITS MANAGEMENT
-- ============================================

-- Function to get user credits balance
CREATE OR REPLACE FUNCTION admin_get_user_credits(p_user_email TEXT)
RETURNS TABLE (
  user_email TEXT,
  balance DECIMAL(12, 2),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'not authorized: admin_get_user_credits is admin-only';
  END IF;

  RETURN QUERY
  SELECT 
    uc.user_email::TEXT,
    uc.balance::DECIMAL(12, 2),
    uc.created_at::TIMESTAMPTZ,
    uc.updated_at::TIMESTAMPTZ
  FROM user_credits uc
  WHERE uc.user_email = p_user_email;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_user_credits(TEXT) TO authenticated;

-- Function to add credits to user
CREATE OR REPLACE FUNCTION admin_add_user_credits(
  p_user_email TEXT,
  p_amount DECIMAL(12, 2),
  p_description TEXT DEFAULT NULL,
  p_admin_email TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  new_balance DECIMAL(12, 2),
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_before DECIMAL(12, 2);
  v_balance_after DECIMAL(12, 2);
  v_current_balance DECIMAL(12, 2);
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'not authorized: admin_add_user_credits is admin-only';
  END IF;

  IF p_amount <= 0 THEN
    RETURN QUERY SELECT false, 0::DECIMAL, 'Amount must be greater than 0'::TEXT;
    RETURN;
  END IF;

  -- Get or create user credits record
  INSERT INTO user_credits (user_email, balance)
  VALUES (p_user_email, 0)
  ON CONFLICT (user_email) DO NOTHING;

  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM user_credits
  WHERE user_email = p_user_email;

  v_balance_before := COALESCE(v_current_balance, 0);
  v_balance_after := v_balance_before + p_amount;

  -- Update balance
  UPDATE user_credits
  SET balance = v_balance_after,
      updated_at = NOW()
  WHERE user_email = p_user_email;

  -- Record transaction
  INSERT INTO credit_transactions (
    user_email,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    description,
    admin_email
  ) VALUES (
    p_user_email,
    'add',
    p_amount,
    v_balance_before,
    v_balance_after,
    COALESCE(p_description, 'Admin added credits'),
    p_admin_email
  );

  RETURN QUERY SELECT true, v_balance_after, 'Credits added successfully'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_add_user_credits(TEXT, DECIMAL, TEXT, TEXT) TO authenticated;

-- Function to subtract credits from user
CREATE OR REPLACE FUNCTION admin_subtract_user_credits(
  p_user_email TEXT,
  p_amount DECIMAL(12, 2),
  p_description TEXT DEFAULT NULL,
  p_admin_email TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  new_balance DECIMAL(12, 2),
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_before DECIMAL(12, 2);
  v_balance_after DECIMAL(12, 2);
  v_current_balance DECIMAL(12, 2);
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'not authorized: admin_subtract_user_credits is admin-only';
  END IF;

  IF p_amount <= 0 THEN
    RETURN QUERY SELECT false, 0::DECIMAL, 'Amount must be greater than 0'::TEXT;
    RETURN;
  END IF;

  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM user_credits
  WHERE user_email = p_user_email;

  v_balance_before := COALESCE(v_current_balance, 0);

  IF v_balance_before < p_amount THEN
    RETURN QUERY SELECT false, v_balance_before, 'Insufficient credits balance'::TEXT;
    RETURN;
  END IF;

  v_balance_after := v_balance_before - p_amount;

  -- Update balance (create record if doesn't exist)
  INSERT INTO user_credits (user_email, balance)
  VALUES (p_user_email, 0)
  ON CONFLICT (user_email) DO NOTHING;

  UPDATE user_credits
  SET balance = v_balance_after,
      updated_at = NOW()
  WHERE user_email = p_user_email;

  -- Record transaction
  INSERT INTO credit_transactions (
    user_email,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    description,
    admin_email
  ) VALUES (
    p_user_email,
    'subtract',
    p_amount,
    v_balance_before,
    v_balance_after,
    COALESCE(p_description, 'Admin subtracted credits'),
    p_admin_email
  );

  RETURN QUERY SELECT true, v_balance_after, 'Credits subtracted successfully'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_subtract_user_credits(TEXT, DECIMAL, TEXT, TEXT) TO authenticated;

-- Function to set user credits to a specific amount
CREATE OR REPLACE FUNCTION admin_set_user_credits(
  p_user_email TEXT,
  p_amount DECIMAL(12, 2),
  p_description TEXT DEFAULT NULL,
  p_admin_email TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  new_balance DECIMAL(12, 2),
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_before DECIMAL(12, 2);
  v_balance_after DECIMAL(12, 2);
  v_current_balance DECIMAL(12, 2);
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'not authorized: admin_set_user_credits is admin-only';
  END IF;

  IF p_amount < 0 THEN
    RETURN QUERY SELECT false, 0::DECIMAL, 'Amount cannot be negative'::TEXT;
    RETURN;
  END IF;

  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM user_credits
  WHERE user_email = p_user_email;

  v_balance_before := COALESCE(v_current_balance, 0);
  v_balance_after := p_amount;

  -- Insert or update balance
  INSERT INTO user_credits (user_email, balance)
  VALUES (p_user_email, p_amount)
  ON CONFLICT (user_email) DO UPDATE
  SET balance = p_amount,
      updated_at = NOW();

  -- Record transaction
  INSERT INTO credit_transactions (
    user_email,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    description,
    admin_email
  ) VALUES (
    p_user_email,
    'set',
    ABS(v_balance_after - v_balance_before),
    v_balance_before,
    v_balance_after,
    COALESCE(p_description, 'Admin set credits balance'),
    p_admin_email
  );

  RETURN QUERY SELECT true, v_balance_after, 'Credits balance set successfully'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_set_user_credits(TEXT, DECIMAL, TEXT, TEXT) TO authenticated;

-- Function to get credit transactions for a user
CREATE OR REPLACE FUNCTION admin_get_user_credit_transactions(
  p_user_email TEXT,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  user_email TEXT,
  transaction_type TEXT,
  amount DECIMAL(12, 2),
  balance_before DECIMAL(12, 2),
  balance_after DECIMAL(12, 2),
  description TEXT,
  admin_email TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'not authorized: admin_get_user_credit_transactions is admin-only';
  END IF;

  RETURN QUERY
  SELECT 
    ct.id,
    ct.user_email::TEXT,
    ct.transaction_type::TEXT,
    ct.amount,
    ct.balance_before,
    ct.balance_after,
    ct.description,
    ct.admin_email::TEXT,
    ct.created_at
  FROM credit_transactions ct
  WHERE ct.user_email = p_user_email
  ORDER BY ct.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_user_credit_transactions(TEXT, INTEGER) TO authenticated;
