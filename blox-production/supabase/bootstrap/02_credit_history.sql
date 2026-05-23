-- Table required by customer_claim_payment_credits (see 20250215100000 migration).
CREATE TABLE IF NOT EXISTS public.credit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_history_user_email ON public.credit_history(user_email);

ALTER TABLE public.credit_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public credit_history" ON public.credit_history;
CREATE POLICY "Allow public credit_history" ON public.credit_history
  FOR ALL USING (true) WITH CHECK (true);
