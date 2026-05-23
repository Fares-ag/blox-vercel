-- ============================================
-- Blox Frontend - Supabase Database Schema
-- ============================================
-- Run this script in Supabase Dashboard -> SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PRODUCTS TABLE
-- ============================================
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INSURANCE RATES TABLE
-- ============================================
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

-- ============================================
-- OFFERS TABLE
-- ============================================
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

-- ============================================
-- PACKAGES TABLE
-- ============================================
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

-- ============================================
-- PROMOTIONS TABLE
-- ============================================
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

-- ============================================
-- APPLICATIONS TABLE
-- ============================================
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
  cancelled_by_customer BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMPTZ,
  blox_membership JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PAYMENT SCHEDULES TABLE
-- ============================================
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

-- ============================================
-- PAYMENT TRANSACTIONS TABLE
-- ============================================
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

-- ============================================
-- PAYMENT DEFERRALS TABLE
-- ============================================
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

-- ============================================
-- LEDGERS TABLE
-- ============================================
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

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
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

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
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

-- ============================================
-- POLICIES - Allow public read/write for now
-- (You should restrict these later with proper authentication)
-- ============================================

-- Products Policies
CREATE POLICY "Allow public read access" ON products FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON products FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON products FOR DELETE USING (true);

-- Insurance Rates Policies
CREATE POLICY "Allow public read access" ON insurance_rates FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON insurance_rates FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON insurance_rates FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON insurance_rates FOR DELETE USING (true);

-- Offers Policies
CREATE POLICY "Allow public read access" ON offers FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON offers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON offers FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON offers FOR DELETE USING (true);

-- Packages Policies
CREATE POLICY "Allow public read access" ON packages FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON packages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON packages FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON packages FOR DELETE USING (true);

-- Promotions Policies
CREATE POLICY "Allow public read access" ON promotions FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON promotions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON promotions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON promotions FOR DELETE USING (true);

-- Applications Policies
CREATE POLICY "Allow public read access" ON applications FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON applications FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON applications FOR DELETE USING (true);

-- Payment Schedules Policies
CREATE POLICY "Allow public read access" ON payment_schedules FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON payment_schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON payment_schedules FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON payment_schedules FOR DELETE USING (true);

-- Payment Transactions Policies
CREATE POLICY "Allow public read access" ON payment_transactions FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON payment_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON payment_transactions FOR UPDATE USING (true);

-- Payment Deferrals Policies
CREATE POLICY "Allow public read access" ON payment_deferrals FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON payment_deferrals FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON payment_deferrals FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON payment_deferrals FOR DELETE USING (true);

-- Ledgers Policies
CREATE POLICY "Allow public read access" ON ledgers FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON ledgers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON ledgers FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON ledgers FOR DELETE USING (true);

-- ============================================
-- FUNCTIONS FOR AUTO-UPDATING updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_insurance_rates_updated_at BEFORE UPDATE ON insurance_rates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON offers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON promotions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_schedules_updated_at BEFORE UPDATE ON payment_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMPLETED!
-- ============================================
-- Your database schema is now ready!
-- You can now use the Supabase API service in your application.
-- ============================================

