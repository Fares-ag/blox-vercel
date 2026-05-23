-- ============================================================
-- BLOX FULL DATABASE SETUP
-- Paste this entire file into Supabase → SQL Editor → Run
-- Target: brand-new / empty project
-- Last updated: 2026-05-20
-- ============================================================


-- ============================================================
-- STEP 1: Core schema (tables, indexes, RLS, updated_at triggers)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  trim VARCHAR(100),
  model_year INTEGER NOT NULL,
  condition VARCHAR(10) CHECK (condition IN ('new', 'old')) NOT NULL,
  engine VARCHAR(100),
  color VARCHAR(50),
  mileage INTEGER DEFAULT 0,
  price DECIMAL(12, 2) NOT NULL,
  status VARCHAR(10) CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  images JSONB DEFAULT '[]'::jsonb,
  documents JSONB DEFAULT '[]'::jsonb,
  attributes JSONB DEFAULT '[]'::jsonb,
  description TEXT,
  chassis_number VARCHAR(100),
  engine_number VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INSURANCE RATES
CREATE TABLE IF NOT EXISTS insurance_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  annual_rate DECIMAL(5, 2) NOT NULL,
  annual_rate_provider DECIMAL(5, 2) NOT NULL,
  coverage_type VARCHAR(20) CHECK (coverage_type IN ('comprehensive', 'third-party', 'full')),
  min_vehicle_value DECIMAL(12, 2),
  max_vehicle_value DECIMAL(12, 2),
  min_tenure INTEGER,
  max_tenure INTEGER,
  status VARCHAR(10) CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- OFFERS
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  annual_rent_rate DECIMAL(5, 2) NOT NULL,
  annual_rent_rate_funder DECIMAL(5, 2) NOT NULL,
  insurance_rate_id UUID REFERENCES insurance_rates(id) ON DELETE SET NULL,
  annual_insurance_rate DECIMAL(5, 2),
  annual_insurance_rate_provider DECIMAL(5, 2),
  is_default BOOLEAN DEFAULT FALSE,
  status VARCHAR(10) CHECK (status IN ('active', 'deactive')) DEFAULT 'active',
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PACKAGES
CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  price DECIMAL(12, 2) NOT NULL,
  status VARCHAR(10) CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROMOTIONS
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  discount_percentage DECIMAL(5, 2),
  discount_amount DECIMAL(12, 2),
  start_date DATE,
  end_date DATE,
  status VARCHAR(10) CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- APPLICATIONS (id starts as UUID; converted to TEXT below)
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  vehicle_id UUID REFERENCES products(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL,
  loan_amount DECIMAL(12, 2) NOT NULL,
  down_payment DECIMAL(12, 2) NOT NULL,
  installment_plan JSONB,
  documents JSONB DEFAULT '[]'::jsonb,
  submission_date TIMESTAMPTZ,
  contract_generated BOOLEAN DEFAULT FALSE,
  contract_signed BOOLEAN DEFAULT FALSE,
  contract_data JSONB,
  contract_review_comments TEXT,
  contract_review_date TIMESTAMPTZ,
  contract_signature TEXT,
  resubmission_comments TEXT,
  resubmission_date TIMESTAMPTZ,
  customer_info JSONB DEFAULT NULL,
  cancelled_by_customer BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMPTZ,
  blox_membership JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PAYMENT SCHEDULES
CREATE TABLE IF NOT EXISTS payment_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(20) CHECK (status IN ('due', 'active', 'paid', 'unpaid', 'partially_paid', 'upcoming')) DEFAULT 'upcoming',
  paid_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PAYMENT TRANSACTIONS
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  payment_schedule_id UUID REFERENCES payment_schedules(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL,
  method VARCHAR(20) CHECK (method IN ('card', 'bank_transfer', 'wallet')) NOT NULL,
  status VARCHAR(20) CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
  transaction_id VARCHAR(255),
  receipt_url TEXT,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- PAYMENT DEFERRALS
CREATE TABLE IF NOT EXISTS payment_deferrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID REFERENCES payment_schedules(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  original_due_date DATE NOT NULL,
  deferred_to_date DATE NOT NULL,
  deferred_date TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LEDGERS
CREATE TABLE IF NOT EXISTS ledgers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  transaction_type VARCHAR(50) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  status VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_applications_customer_email ON applications(customer_email);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_vehicle_id ON applications(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_applications_offer_id ON applications(offer_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_make_model ON products(make, model);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_application_id ON payment_schedules(application_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_due_date ON payment_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_application_id ON payment_transactions(application_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_is_default ON offers(is_default);

-- RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_deferrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledgers ENABLE ROW LEVEL SECURITY;

-- Open policies (idempotent — safe to re-run)
DO $$ DECLARE t TEXT;
BEGIN FOR t IN SELECT unnest(ARRAY['products','insurance_rates','offers','packages','promotions','applications','payment_schedules','payment_transactions','payment_deferrals','ledgers']) LOOP
  EXECUTE format('DROP POLICY IF EXISTS "Allow public read access" ON %I', t);
  EXECUTE format('DROP POLICY IF EXISTS "Allow public insert" ON %I', t);
  EXECUTE format('DROP POLICY IF EXISTS "Allow public update" ON %I', t);
  EXECUTE format('DROP POLICY IF EXISTS "Allow public delete" ON %I', t);
END LOOP; END $$;

CREATE POLICY "Allow public read access" ON products FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON products FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON products FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON insurance_rates FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON insurance_rates FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON insurance_rates FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON insurance_rates FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON offers FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON offers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON offers FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON offers FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON packages FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON packages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON packages FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON packages FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON promotions FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON promotions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON promotions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON promotions FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON applications FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON applications FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON applications FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON payment_schedules FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON payment_schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON payment_schedules FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON payment_schedules FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON payment_transactions FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON payment_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON payment_transactions FOR UPDATE USING (true);

CREATE POLICY "Allow public read access" ON payment_deferrals FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON payment_deferrals FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON payment_deferrals FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON payment_deferrals FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON ledgers FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON ledgers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON ledgers FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON ledgers FOR DELETE USING (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_insurance_rates_updated_at BEFORE UPDATE ON insurance_rates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON promotions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_schedules_updated_at BEFORE UPDATE ON payment_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- STEP 1b: public.users table
-- Must exist before any function that references it (current_user_email, is_admin, etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'customer' CHECK (role IN ('admin', 'super_admin', 'customer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);


-- ============================================================
-- STEP 2: Bootstrap auth helpers (is_admin, current_user_email)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((auth.jwt() ->> 'role') = 'admin', FALSE)
      OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin'), FALSE);
$$;

CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    NULLIF(TRIM(auth.jwt() ->> 'email'), ''),
    (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
  );
$$;


-- ============================================================
-- STEP 3: Convert applications.id UUID → TEXT on empty DB
-- (enables application-1, application-2, … IDs)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.applications LIMIT 1) THEN
    RAISE EXCEPTION 'applications table must be empty for TEXT id conversion. Stop here and use supabase-migration-simple-ids.sql instead.';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_next_application_number()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  max_num INTEGER;
BEGIN
  SELECT COALESCE(
    MAX(
      CASE
        WHEN id::TEXT ~ '^application-[0-9]+$' THEN
          CAST(SUBSTRING(id::TEXT FROM 'application-([0-9]+)') AS INTEGER)
        ELSE 0
      END
    ),
    0
  ) INTO max_num
  FROM public.applications;
  RETURN max_num + 1;
END;
$$;

ALTER TABLE public.payment_schedules DROP CONSTRAINT IF EXISTS payment_schedules_application_id_fkey;
ALTER TABLE public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_application_id_fkey;
ALTER TABLE public.payment_deferrals DROP CONSTRAINT IF EXISTS payment_deferrals_application_id_fkey;
ALTER TABLE public.ledgers DROP CONSTRAINT IF EXISTS ledgers_application_id_fkey;

ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_pkey;
ALTER TABLE public.applications ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.applications ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE public.applications ADD PRIMARY KEY (id);

ALTER TABLE public.payment_schedules ALTER COLUMN application_id TYPE TEXT USING application_id::TEXT;
ALTER TABLE public.payment_transactions ALTER COLUMN application_id TYPE TEXT USING application_id::TEXT;
ALTER TABLE public.payment_deferrals ALTER COLUMN application_id TYPE TEXT USING application_id::TEXT;
ALTER TABLE public.ledgers ALTER COLUMN application_id TYPE TEXT USING application_id::TEXT;

ALTER TABLE public.payment_schedules
  ADD CONSTRAINT payment_schedules_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;

ALTER TABLE public.payment_transactions
  ADD CONSTRAINT payment_transactions_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;

ALTER TABLE public.payment_deferrals
  ADD CONSTRAINT payment_deferrals_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;

ALTER TABLE public.ledgers
  ADD CONSTRAINT ledgers_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE SET NULL;


-- ============================================================
-- STEP 4: payment_intents, skipcash_payment_id, rate_limit_log
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT NOT NULL UNIQUE,
  application_id TEXT,
  user_email TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'QAR',
  payment_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'initiated',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour'),
  CONSTRAINT valid_status CHECK (status IN ('initiated', 'redirected', 'completed', 'failed', 'abandoned')),
  CONSTRAINT valid_payment_type CHECK (payment_type IN ('installment', 'settlement', 'credit_topup')),
  CONSTRAINT positive_amount CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_payment_intents_transaction_id ON public.payment_intents(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_user_email ON public.payment_intents(user_email);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON public.payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_payment_intents_created_at ON public.payment_intents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_intents_expires_at ON public.payment_intents(expires_at) WHERE status IN ('initiated', 'redirected');

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
  FOR EACH ROW EXECUTE FUNCTION public.update_payment_intents_updated_at();

ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payment intents" ON public.payment_intents;
CREATE POLICY "Users can view own payment intents"
  ON public.payment_intents FOR SELECT TO authenticated
  USING (LOWER(user_email) = LOWER(auth.jwt() ->> 'email') OR is_admin());

DROP POLICY IF EXISTS "Service role can manage payment intents" ON public.payment_intents;
CREATE POLICY "Service role can manage payment intents"
  ON public.payment_intents FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payment_transactions' AND column_name = 'skipcash_payment_id'
  ) THEN
    ALTER TABLE public.payment_transactions ADD COLUMN skipcash_payment_id TEXT;
    CREATE UNIQUE INDEX idx_payment_transactions_skipcash_payment_id
      ON public.payment_transactions(skipcash_payment_id)
      WHERE skipcash_payment_id IS NOT NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_log_user_created
  ON public.rate_limit_log(user_id, endpoint, created_at DESC);

CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.rate_limit_log WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT SELECT ON public.payment_intents TO authenticated;
GRANT ALL ON public.payment_intents TO service_role;
GRANT ALL ON public.rate_limit_log TO service_role;

ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limit_log;
CREATE POLICY "Service role can manage rate limits"
  ON public.rate_limit_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- ============================================================
-- STEP 5: user_credits + credit_transactions tables & RPCs
-- ============================================================

CREATE TABLE IF NOT EXISTS user_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email VARCHAR(255) NOT NULL UNIQUE,
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_credits_email ON user_credits(user_email);
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can read own credits" ON user_credits
  FOR SELECT USING (auth.role() = 'authenticated' AND user_email = current_user_email());
CREATE POLICY "Admins can read all credits" ON user_credits FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert credits" ON user_credits FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update credits" ON user_credits FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can delete credits" ON user_credits FOR DELETE USING (is_admin());

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email VARCHAR(255) NOT NULL,
  transaction_type VARCHAR(20) CHECK (transaction_type IN ('add', 'subtract', 'set', 'topup', 'payment')) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  balance_before DECIMAL(12, 2) NOT NULL,
  balance_after DECIMAL(12, 2) NOT NULL,
  description TEXT,
  admin_email VARCHAR(255),
  payment_transaction_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_email ON credit_transactions(user_email);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON credit_transactions(created_at DESC);
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can read own credit transactions" ON credit_transactions
  FOR SELECT USING (auth.role() = 'authenticated' AND user_email = current_user_email());
CREATE POLICY "Admins can read all credit transactions" ON credit_transactions
  FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert credit transactions" ON credit_transactions
  FOR INSERT WITH CHECK (is_admin() OR auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION update_user_credits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_credits_updated_at ON user_credits;
CREATE TRIGGER trigger_update_user_credits_updated_at
  BEFORE UPDATE ON user_credits FOR EACH ROW EXECUTE FUNCTION update_user_credits_updated_at();

CREATE OR REPLACE FUNCTION admin_get_user_credits(p_user_email TEXT)
RETURNS TABLE (user_email TEXT, balance DECIMAL(12,2), created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'not authorized: admin_get_user_credits is admin-only';
  END IF;
  RETURN QUERY
  SELECT uc.user_email::TEXT, uc.balance::DECIMAL(12,2), uc.created_at::TIMESTAMPTZ, uc.updated_at::TIMESTAMPTZ
  FROM user_credits uc WHERE uc.user_email = p_user_email;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_get_user_credits(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION admin_add_user_credits(
  p_user_email TEXT, p_amount DECIMAL(12,2), p_description TEXT DEFAULT NULL, p_admin_email TEXT DEFAULT NULL
) RETURNS TABLE (success BOOLEAN, new_balance DECIMAL(12,2), message TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_before DECIMAL(12,2); v_after DECIMAL(12,2); v_cur DECIMAL(12,2);
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='not authorized'; END IF;
  IF p_amount <= 0 THEN RETURN QUERY SELECT false, 0::DECIMAL, 'Amount must be greater than 0'::TEXT; RETURN; END IF;
  INSERT INTO user_credits (user_email, balance) VALUES (p_user_email, 0) ON CONFLICT (user_email) DO NOTHING;
  SELECT balance INTO v_cur FROM user_credits WHERE user_email = p_user_email;
  v_before := COALESCE(v_cur, 0); v_after := v_before + p_amount;
  UPDATE user_credits SET balance = v_after, updated_at = NOW() WHERE user_email = p_user_email;
  INSERT INTO credit_transactions (user_email, transaction_type, amount, balance_before, balance_after, description, admin_email)
  VALUES (p_user_email, 'add', p_amount, v_before, v_after, COALESCE(p_description,'Admin added credits'), p_admin_email);
  RETURN QUERY SELECT true, v_after, 'Credits added successfully'::TEXT;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_add_user_credits(TEXT, DECIMAL, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION admin_subtract_user_credits(
  p_user_email TEXT, p_amount DECIMAL(12,2), p_description TEXT DEFAULT NULL, p_admin_email TEXT DEFAULT NULL
) RETURNS TABLE (success BOOLEAN, new_balance DECIMAL(12,2), message TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_before DECIMAL(12,2); v_after DECIMAL(12,2); v_cur DECIMAL(12,2);
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='not authorized'; END IF;
  IF p_amount <= 0 THEN RETURN QUERY SELECT false, 0::DECIMAL, 'Amount must be greater than 0'::TEXT; RETURN; END IF;
  SELECT balance INTO v_cur FROM user_credits WHERE user_email = p_user_email;
  v_before := COALESCE(v_cur, 0);
  IF v_before < p_amount THEN RETURN QUERY SELECT false, v_before, 'Insufficient credits balance'::TEXT; RETURN; END IF;
  v_after := v_before - p_amount;
  INSERT INTO user_credits (user_email, balance) VALUES (p_user_email, 0) ON CONFLICT (user_email) DO NOTHING;
  UPDATE user_credits SET balance = v_after, updated_at = NOW() WHERE user_email = p_user_email;
  INSERT INTO credit_transactions (user_email, transaction_type, amount, balance_before, balance_after, description, admin_email)
  VALUES (p_user_email, 'subtract', p_amount, v_before, v_after, COALESCE(p_description,'Admin subtracted credits'), p_admin_email);
  RETURN QUERY SELECT true, v_after, 'Credits subtracted successfully'::TEXT;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_subtract_user_credits(TEXT, DECIMAL, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION admin_set_user_credits(
  p_user_email TEXT, p_amount DECIMAL(12,2), p_description TEXT DEFAULT NULL, p_admin_email TEXT DEFAULT NULL
) RETURNS TABLE (success BOOLEAN, new_balance DECIMAL(12,2), message TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_before DECIMAL(12,2); v_after DECIMAL(12,2); v_cur DECIMAL(12,2);
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='not authorized'; END IF;
  IF p_amount < 0 THEN RETURN QUERY SELECT false, 0::DECIMAL, 'Amount cannot be negative'::TEXT; RETURN; END IF;
  SELECT balance INTO v_cur FROM user_credits WHERE user_email = p_user_email;
  v_before := COALESCE(v_cur, 0); v_after := p_amount;
  INSERT INTO user_credits (user_email, balance) VALUES (p_user_email, p_amount)
  ON CONFLICT (user_email) DO UPDATE SET balance = p_amount, updated_at = NOW();
  INSERT INTO credit_transactions (user_email, transaction_type, amount, balance_before, balance_after, description, admin_email)
  VALUES (p_user_email, 'set', ABS(v_after-v_before), v_before, v_after, COALESCE(p_description,'Admin set credits balance'), p_admin_email);
  RETURN QUERY SELECT true, v_after, 'Credits balance set successfully'::TEXT;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_set_user_credits(TEXT, DECIMAL, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION admin_get_user_credit_transactions(p_user_email TEXT, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID, user_email TEXT, transaction_type TEXT, amount DECIMAL(12,2),
  balance_before DECIMAL(12,2), balance_after DECIMAL(12,2), description TEXT, admin_email TEXT, created_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='not authorized'; END IF;
  RETURN QUERY
  SELECT ct.id, ct.user_email::TEXT, ct.transaction_type::TEXT, ct.amount,
         ct.balance_before, ct.balance_after, ct.description, ct.admin_email::TEXT, ct.created_at
  FROM credit_transactions ct WHERE ct.user_email = p_user_email ORDER BY ct.created_at DESC LIMIT p_limit;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_get_user_credit_transactions(TEXT, INTEGER) TO authenticated;


-- ============================================================
-- STEP 6: credit_history table (required by claim RPC)
-- ============================================================

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


-- ============================================================
-- STEP 7: Payment permission RPCs (disabled for non-admins)
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_can_pay_for_application(p_application_id TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF is_admin() THEN RETURN TRUE; END IF;
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_pay_for_any_application()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF is_admin() THEN RETURN TRUE; END IF;
  RETURN FALSE;
END;
$$;


-- ============================================================
-- STEP 8: payment_schedules paid_amount / remaining_amount columns
--         + payment_transactions method constraint + card_type
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payment_schedules' AND column_name='paid_amount') THEN
    ALTER TABLE public.payment_schedules ADD COLUMN paid_amount DECIMAL(12,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payment_schedules' AND column_name='remaining_amount') THEN
    ALTER TABLE public.payment_schedules ADD COLUMN remaining_amount DECIMAL(12,2) NULL;
  END IF;
END $$;

ALTER TABLE public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_method_check;
ALTER TABLE public.payment_transactions
  ADD CONSTRAINT payment_transactions_method_check
  CHECK (method IN ('card', 'bank_transfer', 'wallet', 'blox_credit'));

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payment_transactions' AND column_name='card_type') THEN
    ALTER TABLE public.payment_transactions ADD COLUMN card_type VARCHAR(20) NULL;
  END IF;
END $$;


-- ============================================================
-- STEP 9: customer_pay_installment_with_credits RPC (TEXT ids)
-- ============================================================

CREATE OR REPLACE FUNCTION public.customer_pay_installment_with_credits(
  p_application_id TEXT, p_due_date TEXT, p_amount DECIMAL(12,2)
) RETURNS TABLE (success BOOLEAN, message TEXT, new_balance DECIMAL(12,2))
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_email TEXT; v_app RECORD; v_schedule RECORD;
  v_balance_before DECIMAL(12,2); v_balance_after DECIMAL(12,2);
  v_original_amount DECIMAL(12,2); v_existing_paid DECIMAL(12,2);
  v_new_paid DECIMAL(12,2); v_remaining DECIMAL(12,2); v_paid_at TIMESTAMPTZ;
  v_ip JSONB; v_schedule_json JSONB; v_new_schedule JSONB; v_txn_id TEXT;
BEGIN
  v_user_email := LOWER(COALESCE(auth.jwt() ->> 'email', ''));
  IF v_user_email = '' THEN RETURN QUERY SELECT FALSE, 'Not authenticated'::TEXT, 0::DECIMAL; RETURN; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RETURN QUERY SELECT FALSE, 'Amount must be greater than 0'::TEXT, 0::DECIMAL; RETURN; END IF;
  IF NOT public.current_user_can_pay_for_application(p_application_id) THEN
    RETURN QUERY SELECT FALSE, 'Not authorized to pay for this application'::TEXT, 0::DECIMAL; RETURN;
  END IF;
  SELECT id, customer_email, installment_plan INTO v_app FROM public.applications WHERE id::text = p_application_id LIMIT 1;
  IF v_app.id IS NULL THEN RETURN QUERY SELECT FALSE, 'Application not found'::TEXT, 0::DECIMAL; RETURN; END IF;
  SELECT id, amount, COALESCE(ps.paid_amount,0) AS paid_amount, COALESCE(ps.remaining_amount,ps.amount) AS remaining_amount
  INTO v_schedule FROM public.payment_schedules ps
  WHERE ps.application_id::text = p_application_id AND ps.due_date::text = p_due_date LIMIT 1;
  IF v_schedule.id IS NULL THEN RETURN QUERY SELECT FALSE, 'Payment schedule not found for this due date'::TEXT, 0::DECIMAL; RETURN; END IF;
  v_original_amount := v_schedule.amount; v_existing_paid := v_schedule.paid_amount;
  v_new_paid := v_existing_paid + p_amount; v_remaining := GREATEST(0, v_original_amount - v_new_paid); v_paid_at := NOW();
  SELECT COALESCE(balance,0) INTO v_balance_before FROM public.user_credits WHERE user_email = v_user_email;
  IF COALESCE(v_balance_before,0) < p_amount THEN RETURN QUERY SELECT FALSE, 'Insufficient Blox Credits'::TEXT, COALESCE(v_balance_before,0); RETURN; END IF;
  v_balance_after := v_balance_before - p_amount;
  INSERT INTO public.user_credits (user_email, balance, updated_at) VALUES (v_user_email, 0, v_paid_at) ON CONFLICT (user_email) DO NOTHING;
  UPDATE public.user_credits SET balance = v_balance_after, updated_at = v_paid_at WHERE user_email = v_user_email;
  INSERT INTO public.credit_transactions (user_email, transaction_type, amount, balance_before, balance_after, description)
  VALUES (v_user_email, 'payment', p_amount, v_balance_before, v_balance_after, 'Payment for application ' || p_application_id || ', due ' || p_due_date);
  UPDATE public.payment_schedules SET
    status = CASE WHEN v_remaining <= 0 THEN 'paid' ELSE 'partially_paid' END,
    paid_date = CASE WHEN v_remaining <= 0 THEN v_paid_at ELSE paid_date END,
    paid_amount = v_new_paid, remaining_amount = v_remaining, updated_at = v_paid_at
  WHERE id = v_schedule.id;
  v_txn_id := 'BLOX-' || replace(p_application_id,'-','') || '-' || replace(p_due_date,'-','') || '-' || to_char(extract(epoch from v_paid_at)::bigint,'FM999999999999');
  v_ip := v_app.installment_plan;
  IF v_ip IS NOT NULL AND v_ip ? 'schedule' THEN
    v_schedule_json := v_ip->'schedule';
    SELECT jsonb_agg(
      CASE WHEN (elem->>'dueDate') = p_due_date THEN
        elem || jsonb_build_object('status', CASE WHEN v_remaining<=0 THEN 'paid' ELSE 'partially_paid' END,
          'paidAmount', v_new_paid, 'remainingAmount', v_remaining,
          'paidDate', CASE WHEN v_remaining<=0 THEN to_char(v_paid_at,'YYYY-MM-DD') ELSE (elem->>'paidDate') END,
          'paymentMethod', 'blox_credit', 'transactionId', v_txn_id)
      ELSE elem END
    ) INTO v_new_schedule FROM jsonb_array_elements(v_schedule_json) AS elem;
    IF v_new_schedule IS NOT NULL THEN
      UPDATE public.applications SET installment_plan = jsonb_set(v_ip,'{schedule}',v_new_schedule), updated_at = v_paid_at WHERE id = v_app.id;
    END IF;
  END IF;
  INSERT INTO public.payment_transactions (application_id, payment_schedule_id, amount, method, status, transaction_id, completed_at)
  VALUES (p_application_id, v_schedule.id, p_amount, 'blox_credit', 'completed', v_txn_id, v_paid_at);
  RETURN QUERY SELECT TRUE, 'Payment successful'::TEXT, v_balance_after;
END;
$$;
GRANT EXECUTE ON FUNCTION public.customer_pay_installment_with_credits(TEXT, TEXT, DECIMAL) TO authenticated;


-- ============================================================
-- STEP 10: customer_claim_payment_credits RPC (idempotent)
-- ============================================================

CREATE OR REPLACE FUNCTION public.customer_claim_payment_credits(p_transaction_id TEXT)
RETURNS TABLE (success BOOLEAN, message TEXT, credits_added INTEGER, new_balance NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_email TEXT; v_payment_record RECORD;
  v_credits_to_add INTEGER; v_current_balance NUMERIC; v_new_balance NUMERIC;
BEGIN
  v_user_email := LOWER(auth.jwt() ->> 'email');
  IF v_user_email IS NULL OR v_user_email = '' THEN
    RETURN QUERY SELECT FALSE, 'Not authenticated'::TEXT, 0, 0::NUMERIC; RETURN;
  END IF;
  SELECT * INTO v_payment_record FROM payment_transactions pt WHERE pt.transaction_id = p_transaction_id LIMIT 1;
  IF v_payment_record.id IS NULL THEN RETURN QUERY SELECT FALSE, 'Payment transaction not found'::TEXT, 0, 0::NUMERIC; RETURN; END IF;
  IF v_payment_record.status <> 'completed' THEN
    RETURN QUERY SELECT FALSE, ('Payment not completed. Status: ' || v_payment_record.status)::TEXT, 0, 0::NUMERIC; RETURN;
  END IF;
  IF p_transaction_id NOT LIKE 'CREDIT-%' THEN RETURN QUERY SELECT FALSE, 'Not a credit top-up transaction'::TEXT, 0, 0::NUMERIC; RETURN; END IF;
  v_credits_to_add := FLOOR(v_payment_record.amount)::INTEGER;
  IF v_credits_to_add IS NULL OR v_credits_to_add <= 0 THEN RETURN QUERY SELECT FALSE, 'Invalid credit amount'::TEXT, 0, 0::NUMERIC; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM credit_history WHERE user_email = v_user_email AND description LIKE '%' || p_transaction_id || '%') THEN
    SELECT COALESCE(balance,0) INTO v_current_balance FROM user_credits WHERE user_email = v_user_email;
    RETURN QUERY SELECT TRUE, 'Credits already claimed'::TEXT, v_credits_to_add, COALESCE(v_current_balance,0::NUMERIC); RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM credit_transactions WHERE user_email = v_user_email AND description LIKE '%' || p_transaction_id || '%') THEN
    SELECT COALESCE(balance,0) INTO v_current_balance FROM user_credits WHERE user_email = v_user_email;
    RETURN QUERY SELECT TRUE, 'Credits already added (e.g. via webhook)'::TEXT, 0, COALESCE(v_current_balance,0::NUMERIC); RETURN;
  END IF;
  SELECT COALESCE(balance,0) INTO v_current_balance FROM user_credits WHERE user_email = v_user_email;
  v_new_balance := COALESCE(v_current_balance,0) + v_credits_to_add;
  INSERT INTO user_credits (user_email, balance, updated_at) VALUES (v_user_email, v_new_balance, NOW())
  ON CONFLICT (user_email) DO UPDATE SET balance = v_new_balance, updated_at = NOW();
  INSERT INTO credit_history (user_email, amount, transaction_type, description, created_at)
  VALUES (v_user_email, v_credits_to_add, 'credit',
    format('Credit top-up via payment. Transaction ID: %s, Payment ID: %s', p_transaction_id, v_payment_record.skipcash_payment_id), NOW());
  RETURN QUERY SELECT TRUE, 'Credits added successfully'::TEXT, v_credits_to_add, v_new_balance;
END;
$$;


-- ============================================================
-- STEP 11: current_user_email() hardened (auth.users fallback)
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE(
    NULLIF(TRIM(auth.jwt() ->> 'email'), ''),
    (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
  );
$$;


-- ============================================================
-- STEP 12: current_user_email() full fallback (user_metadata + public.users)
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT NULLIF(TRIM(COALESCE(
    NULLIF(TRIM(auth.jwt() ->> 'email'), ''),
    NULLIF(TRIM(auth.jwt() -> 'user_metadata' ->> 'email'), ''),
    (SELECT NULLIF(TRIM(u.email),'') FROM auth.users u WHERE u.id = auth.uid()),
    (SELECT NULLIF(TRIM(u.email),'') FROM public.users u WHERE u.id = auth.uid())
  )),'');
$$;


-- ============================================================
-- STEP 13: set_application_id trigger (serialized with advisory lock)
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_application_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE next_num INTEGER;
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    PERFORM pg_advisory_xact_lock(90842001);
    next_num := public.get_next_application_number();
    NEW.id := 'application-' || next_num::TEXT;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_application_id_trigger ON public.applications;
CREATE TRIGGER set_application_id_trigger
  BEFORE INSERT ON public.applications FOR EACH ROW EXECUTE FUNCTION public.set_application_id();


-- ============================================================
-- STEP 14: applications_id_seq sequence + create_application_after_signup RPC
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS public.applications_id_seq;

SELECT setval('public.applications_id_seq',
  GREATEST(
    COALESCE(
      (SELECT MAX(CAST(SUBSTRING(id::text FROM 'application-([0-9]+)') AS integer))
       FROM public.applications WHERE id::text ~ '^application-[0-9]+$'),
      0
    ),
    1
  )
);

CREATE OR REPLACE FUNCTION public.set_application_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    NEW.id := 'application-' || nextval('public.applications_id_seq')::text;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_application_id_trigger ON public.applications;
CREATE TRIGGER set_application_id_trigger
  BEFORE INSERT ON public.applications FOR EACH ROW EXECUTE FUNCTION public.set_application_id();

CREATE OR REPLACE FUNCTION public.create_application_after_signup(p_user_id uuid, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_auth_email text; v_payload_email text; inserted public.applications%ROWTYPE;
BEGIN
  SELECT email INTO v_auth_email FROM auth.users WHERE id = p_user_id;
  v_payload_email := lower(trim(p_payload->>'customer_email'));
  IF v_auth_email IS NULL THEN RAISE EXCEPTION 'user_not_found'; END IF;
  IF lower(trim(v_auth_email)) IS DISTINCT FROM v_payload_email THEN RAISE EXCEPTION 'email_mismatch'; END IF;
  INSERT INTO public.applications SELECT * FROM jsonb_populate_record(NULL::public.applications, p_payload || jsonb_build_object('id', NULL)) RETURNING * INTO inserted;
  RETURN row_to_json(inserted)::jsonb;
END;
$$;

REVOKE ALL ON FUNCTION public.create_application_after_signup(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_application_after_signup(uuid, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.create_application_after_signup(uuid, jsonb) TO authenticated;


-- ============================================================
-- STEP 16: companies table + company_id on users & applications
-- ============================================================

CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE,
  description TEXT,
  can_pay BOOLEAN NOT NULL DEFAULT TRUE,
  status VARCHAR(20) CHECK (status IN ('active', 'inactive')) NOT NULL DEFAULT 'active',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_company_id ON public.users(company_id);

ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_applications_company_id ON public.applications(company_id);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage companies" ON public.companies;
CREATE POLICY "Admins can manage companies" ON public.companies FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Users can read their own company" ON public.companies;
CREATE POLICY "Users can read their own company" ON public.companies FOR SELECT TO authenticated
  USING (is_admin() OR id = (SELECT u.company_id FROM public.users u WHERE u.id = auth.uid() LIMIT 1));

GRANT SELECT ON public.companies TO authenticated;
GRANT SELECT (id, name, code, can_pay, status) ON public.companies TO authenticated;
GRANT SELECT (id, email, role, company_id) ON public.users TO authenticated;

CREATE OR REPLACE FUNCTION public.current_user_can_pay()
RETURNS BOOLEAN AS $$
DECLARE cid UUID; allowed BOOLEAN; company_status TEXT;
BEGIN
  SELECT company_id INTO cid FROM public.users WHERE id = auth.uid() LIMIT 1;
  IF cid IS NULL THEN RETURN FALSE; END IF;
  SELECT can_pay, status INTO allowed, company_status FROM public.companies WHERE id = cid LIMIT 1;
  IF company_status = 'inactive' THEN RETURN FALSE; END IF;
  RETURN COALESCE(allowed, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.current_user_can_pay() TO authenticated;


-- ============================================================
-- STEP 17: activity_logs table + is_admin / is_super_admin update
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  user_role TEXT,
  action_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  resource_name TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_email ON activity_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_type ON activity_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_role ON activity_logs(user_role);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_id ON activity_logs(resource_id);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE user_role TEXT; user_email TEXT;
BEGIN
  user_role := COALESCE(auth.jwt() ->> 'role', auth.jwt() ->> 'user_role');
  IF user_role = 'super_admin' THEN RETURN TRUE; END IF;
  SELECT role INTO user_role FROM public.users WHERE id = auth.uid();
  IF user_role = 'super_admin' THEN RETURN TRUE; END IF;
  user_email := auth.jwt() ->> 'email';
  IF user_email IS NOT NULL THEN
    SELECT role INTO user_role FROM public.users WHERE LOWER(email) = LOWER(user_email);
    IF user_role = 'super_admin' THEN RETURN TRUE; END IF;
  END IF;
  SELECT COALESCE(raw_user_meta_data->>'role', raw_user_meta_data->>'user_role') INTO user_role FROM auth.users WHERE id = auth.uid();
  IF user_role = 'super_admin' THEN RETURN TRUE; END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE user_role TEXT; user_email TEXT;
BEGIN
  user_role := COALESCE(auth.jwt() ->> 'role', auth.jwt() ->> 'user_role');
  IF user_role IN ('admin', 'super_admin') THEN RETURN TRUE; END IF;
  SELECT role INTO user_role FROM public.users WHERE id = auth.uid();
  IF user_role IN ('admin', 'super_admin') THEN RETURN TRUE; END IF;
  user_email := auth.jwt() ->> 'email';
  IF user_email IS NOT NULL THEN
    SELECT role INTO user_role FROM public.users WHERE LOWER(email) = LOWER(user_email);
    IF user_role IN ('admin', 'super_admin') THEN RETURN TRUE; END IF;
  END IF;
  SELECT COALESCE(raw_user_meta_data->>'role', raw_user_meta_data->>'user_role') INTO user_role FROM auth.users WHERE id = auth.uid();
  IF user_role IN ('admin', 'super_admin') THEN RETURN TRUE; END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Super admins can read all activity logs" ON activity_logs;
CREATE POLICY "Super admins can read all activity logs" ON activity_logs FOR SELECT USING (is_super_admin());

DROP POLICY IF EXISTS "Authenticated users can create activity logs" ON activity_logs;
CREATE POLICY "Authenticated users can create activity logs" ON activity_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- ============================================================
-- STEP 18: company_id on products (vehicle company badge feature)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.products
      ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_products_company_id ON public.products(company_id);
  END IF;
END $$;


-- ============================================================
-- DONE
-- After running: go to Authentication → URL Configuration
-- and add your app URLs so login/redirect works.
-- ============================================================
