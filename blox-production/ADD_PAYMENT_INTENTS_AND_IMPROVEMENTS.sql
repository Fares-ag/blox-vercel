-- ============================================
-- Payment System Improvements:
-- 1. Add payment_intents table for tracking
-- 2. Add skipcash_payment_id column for idempotency
-- 3. Add indexes for performance
-- ============================================
-- Run in Supabase SQL Editor (production).
-- Safe to re-run.
-- ============================================

-- 1. Create payment_intents table
-- Tracks payment initiation before redirect to SkipCash
-- Helps identify abandoned payments and provides audit trail
CREATE TABLE IF NOT EXISTS public.payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT NOT NULL UNIQUE,
  application_id TEXT,
  user_email TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'QAR',
  payment_type TEXT NOT NULL, -- 'installment', 'settlement', 'credit_topup'
  status TEXT NOT NULL DEFAULT 'initiated', -- 'initiated', 'redirected', 'completed', 'failed', 'abandoned'
  metadata JSONB DEFAULT '{}'::jsonb, -- Store custom1 data, payment_schedule_id, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour'), -- Auto-expire after 1 hour
  
  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('initiated', 'redirected', 'completed', 'failed', 'abandoned')),
  CONSTRAINT valid_payment_type CHECK (payment_type IN ('installment', 'settlement', 'credit_topup')),
  CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_intents_transaction_id ON public.payment_intents(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_user_email ON public.payment_intents(user_email);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON public.payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_payment_intents_created_at ON public.payment_intents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_intents_expires_at ON public.payment_intents(expires_at) WHERE status IN ('initiated', 'redirected');

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.update_payment_intents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_payment_intents_updated_at ON public.payment_intents;
CREATE TRIGGER set_payment_intents_updated_at
  BEFORE UPDATE ON public.payment_intents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_intents_updated_at();

-- Enable RLS
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own payment intents
DROP POLICY IF EXISTS "Users can view own payment intents" ON public.payment_intents;
CREATE POLICY "Users can view own payment intents"
  ON public.payment_intents
  FOR SELECT
  TO authenticated
  USING (LOWER(user_email) = LOWER(auth.jwt() ->> 'email') OR is_admin());

-- Only system (service role) can insert/update payment intents
DROP POLICY IF EXISTS "Service role can manage payment intents" ON public.payment_intents;
CREATE POLICY "Service role can manage payment intents"
  ON public.payment_intents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Add skipcash_payment_id to payment_transactions for idempotency
-- Check if column exists before adding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'payment_transactions' 
    AND column_name = 'skipcash_payment_id'
  ) THEN
    ALTER TABLE public.payment_transactions
    ADD COLUMN skipcash_payment_id TEXT;
    
    -- Add unique index for idempotency
    CREATE UNIQUE INDEX idx_payment_transactions_skipcash_payment_id 
    ON public.payment_transactions(skipcash_payment_id) 
    WHERE skipcash_payment_id IS NOT NULL;
  END IF;
END $$;

-- 3. Add rate_limit_log table for tracking API calls
CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  endpoint TEXT NOT NULL, -- 'skipcash-payment', 'skipcash-verify', etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for rate limit queries (cleanup old entries periodically)
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_user_created 
ON public.rate_limit_log(user_id, endpoint, created_at DESC);

-- Auto-cleanup function (delete entries older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.rate_limit_log
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON public.payment_intents TO authenticated;
GRANT ALL ON public.payment_intents TO service_role;
GRANT ALL ON public.rate_limit_log TO service_role;

-- Enable RLS on rate_limit_log
ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limit_log;
CREATE POLICY "Service role can manage rate limits"
  ON public.rate_limit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.payment_intents IS 'Tracks payment initiation before SkipCash redirect. Helps identify abandoned payments.';
COMMENT ON TABLE public.rate_limit_log IS 'Tracks API calls for rate limiting. Auto-cleaned every hour.';
COMMENT ON COLUMN public.payment_transactions.skipcash_payment_id IS 'SkipCash PaymentId for idempotency (prevents duplicate webhook processing)';
