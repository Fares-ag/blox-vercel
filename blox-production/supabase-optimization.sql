-- ============================================
-- Database Optimization Script
-- Add indexes for frequently queried columns
-- Optimize RLS policies
-- ============================================

-- ============================================
-- INDEXES FOR PRODUCTS TABLE
-- ============================================
-- Note: Some indexes may already exist from supabase-schema.sql
-- Using IF NOT EXISTS to avoid conflicts
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_make_model ON products(make, model);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
-- Partial index for active products (optimization)
CREATE INDEX IF NOT EXISTS idx_products_active_filter ON products(make, model, price) WHERE status = 'active';

-- ============================================
-- INDEXES FOR APPLICATIONS TABLE
-- ============================================
-- Note: Some indexes may already exist from supabase-schema.sql
CREATE INDEX IF NOT EXISTS idx_applications_customer_email ON applications(customer_email);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_vehicle_id ON applications(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_applications_offer_id ON applications(offer_id);
CREATE INDEX IF NOT EXISTS idx_applications_submission_date ON applications(submission_date);

-- Composite index for common queries (customer email + status + date)
CREATE INDEX IF NOT EXISTS idx_applications_email_status_date ON applications(customer_email, status, created_at DESC);

-- ============================================
-- INDEXES FOR OFFERS TABLE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_is_default ON offers(is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_offers_insurance_rate_id ON offers(insurance_rate_id);

-- ============================================
-- INDEXES FOR INSURANCE RATES TABLE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_insurance_rates_status ON insurance_rates(status);
CREATE INDEX IF NOT EXISTS idx_insurance_rates_is_default ON insurance_rates(is_default) WHERE is_default = true;

-- ============================================
-- INDEXES FOR LEDGERS TABLE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_ledgers_date ON ledgers(date DESC);
CREATE INDEX IF NOT EXISTS idx_ledgers_application_id ON ledgers(application_id);
CREATE INDEX IF NOT EXISTS idx_ledgers_type ON ledgers(type);

-- ============================================
-- INDEXES FOR NOTIFICATIONS TABLE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_email ON notifications(user_email);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_email, read);

-- ============================================
-- OPTIMIZE RLS POLICIES
-- ============================================

-- Enable RLS on all tables (if not already enabled)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ANALYZE TABLES FOR QUERY OPTIMIZATION
-- ============================================
ANALYZE products;
ANALYZE applications;
ANALYZE offers;
ANALYZE packages;
ANALYZE promotions;
ANALYZE insurance_rates;
ANALYZE ledgers;
ANALYZE notifications;

-- ============================================
-- VACUUM TABLES (run periodically)
-- ============================================
-- VACUUM ANALYZE products;
-- VACUUM ANALYZE applications;
-- VACUUM ANALYZE offers;
-- VACUUM ANALYZE packages;
-- VACUUM ANALYZE promotions;
-- VACUUM ANALYZE insurance_rates;
-- VACUUM ANALYZE ledgers;
-- VACUUM ANALYZE notifications;

