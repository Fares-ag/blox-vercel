-- ============================================
-- Supabase Connection Pooling Configuration
-- ============================================
-- Note: Connection pooling is handled by Supabase automatically
-- This file documents best practices and optimization settings
-- ============================================

-- ============================================
-- QUERY OPTIMIZATION HINTS
-- ============================================

-- Enable query statistics (for monitoring)
-- This helps identify slow queries
ALTER DATABASE postgres SET log_min_duration_statement = 1000; -- Log queries > 1 second

-- ============================================
-- MATERIALIZED VIEWS FOR COMMON QUERIES
-- ============================================

-- Dashboard statistics view (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_stats AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'active') as active_applications,
  COUNT(*) FILTER (WHERE status = 'draft') as draft_applications,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_applications,
  SUM(loan_amount) FILTER (WHERE status = 'active') as total_active_loans,
  AVG(loan_amount) FILTER (WHERE status = 'active') as avg_loan_amount
FROM applications;

CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_stats ON dashboard_stats (1);

-- Refresh function (call periodically or via cron)
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DASHBOARD STATS RPC FOR ADMIN UI
-- ============================================
-- Aggregates high-level metrics for the admin dashboard.
-- You can tune the logic as your business rules evolve.
CREATE OR REPLACE FUNCTION get_dashboard_stats(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  projected_insurance NUMERIC,
  projected_funding NUMERIC,
  projected_revenue NUMERIC,
  real_revenue NUMERIC,
  paid_installments INTEGER,
  unpaid_installments INTEGER,
  user_blox_percentage NUMERIC,
  company_blox_percentage NUMERIC,
  total_assets_ownership NUMERIC,
  customer_ownership_percentage NUMERIC,
  blox_ownership_percentage NUMERIC,
  active_applications INTEGER,
  monthly_payable NUMERIC,
  monthly_receivable NUMERIC,
  profitability NUMERIC,
  deferrals_in_period INTEGER,
  customers_near_deferral_limit INTEGER
) AS $$
DECLARE
  -- Range-based aggregates (respect start_date/end_date)
  total_paid NUMERIC := 0;
  total_due  NUMERIC := 0;
  -- Global aggregates for ownership-style metrics
  total_loan NUMERIC := 0;
  total_paid_all_time NUMERIC := 0;
  deferrals_count INTEGER := 0;
  customers_near_limit INTEGER := 0;
BEGIN
  -- Basic application metrics
  active_applications := COALESCE((
    SELECT COUNT(*) FROM applications 
    WHERE status = 'active'
  ), 0);

  -- Installment metrics within the selected date range
  -- Real revenue should be based on when payments were actually PAID (paid_date),
  -- while outstanding amounts (payable) are based on due_date for non-paid items.
  SELECT 
    COALESCE(SUM(CASE WHEN status = 'paid' AND paid_date BETWEEN start_date AND end_date THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status <> 'paid' AND due_date BETWEEN start_date AND end_date THEN amount ELSE 0 END), 0),
    COALESCE(COUNT(*) FILTER (WHERE status = 'paid' AND paid_date BETWEEN start_date AND end_date), 0),
    COALESCE(COUNT(*) FILTER (WHERE status <> 'paid' AND due_date BETWEEN start_date AND end_date), 0)
  INTO total_paid, total_due, paid_installments, unpaid_installments
  FROM payment_schedules;

  -- Projected funding = total loan amount for active applications
  SELECT COALESCE(SUM(loan_amount), 0)
  INTO total_loan
  FROM applications
  WHERE status = 'active';

  projected_funding := total_loan;

  projected_insurance := 0; -- You can join insurance_rates here if needed
  -- Projected revenue = outstanding (unpaid) amounts in the selected range
  projected_revenue := total_due;
  -- Real revenue = amounts already paid in the selected range
  real_revenue := total_paid;

  -- Global ownership based on all-time payments vs total loan value.
  -- We treat "ownership" as: (sum of all paid installments + down payments) / total loan.
  -- For now we approximate down payments as (loan_amount - SUM(schedule.amount)) being small;
  -- the dominant factor is installments actually paid.
  SELECT COALESCE(SUM(amount), 0)
  INTO total_paid_all_time
  FROM payment_schedules
  WHERE status = 'paid';

  total_assets_ownership := 100;

  IF total_loan > 0 THEN
    customer_ownership_percentage := LEAST(100, GREATEST(0, (total_paid_all_time / total_loan) * 100));
  ELSE
    customer_ownership_percentage := 0;
  END IF;

  blox_ownership_percentage := 100 - customer_ownership_percentage;
  user_blox_percentage := customer_ownership_percentage;
  company_blox_percentage := blox_ownership_percentage;

  -- Monthly payable / receivable: use paid vs unpaid amounts
  monthly_payable := total_due;
  monthly_receivable := total_paid;

  -- Profitability as a simple ratio (avoid division by zero)
  IF (monthly_payable + monthly_receivable) > 0 THEN
    profitability := ROUND(
      (monthly_receivable - monthly_payable) 
      / NULLIF(monthly_receivable + monthly_payable, 0) * 100,
      2
    );
  ELSE
    profitability := 0;
  END IF;

  -- Deferrals usage within the selected date range
  -- Counts how many deferral events happened between start_date and end_date.
  SELECT COALESCE(COUNT(*), 0)
  INTO deferrals_count
  FROM payment_deferrals
  WHERE deferred_date BETWEEN start_date AND end_date;

  -- Customers close to the 3 deferrals/year rule.
  -- We consider "close" as having 2 or more deferrals in the current calendar year.
  SELECT COALESCE(COUNT(*), 0)
  INTO customers_near_limit
  FROM (
    SELECT a.customer_email, COUNT(*) AS deferral_count
    FROM payment_deferrals d
    JOIN applications a ON a.id = d.application_id
    WHERE EXTRACT(YEAR FROM d.deferred_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    GROUP BY a.customer_email
    HAVING COUNT(*) >= 2
  ) AS deferral_summary;

  deferrals_in_period := deferrals_count;
  customers_near_deferral_limit := customers_near_limit;

  RETURN QUERY SELECT
    projected_insurance,
    projected_funding,
    projected_revenue,
    real_revenue,
    paid_installments,
    unpaid_installments,
    user_blox_percentage,
    company_blox_percentage,
    total_assets_ownership,
    customer_ownership_percentage,
    blox_ownership_percentage,
    active_applications,
    monthly_payable,
    monthly_receivable,
    profitability,
    deferrals_in_period,
    customers_near_deferral_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION FOR EFFICIENT APPLICATION COUNTS
-- ============================================
CREATE OR REPLACE FUNCTION get_user_application_count(user_email_param TEXT)
RETURNS TABLE(
  total_count BIGINT,
  active_count BIGINT,
  draft_count BIGINT,
  completed_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_count,
    COUNT(*) FILTER (WHERE status = 'active')::BIGINT as active_count,
    COUNT(*) FILTER (WHERE status = 'draft')::BIGINT as draft_count,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_count
  FROM applications
  WHERE customer_email = user_email_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INDEXES FOR COMMON QUERY PATTERNS
-- ============================================

-- Composite index for application filtering
CREATE INDEX IF NOT EXISTS idx_applications_email_status_date 
ON applications(customer_email, status, created_at DESC);

-- Partial index for active products (most common query)
CREATE INDEX IF NOT EXISTS idx_products_active 
ON products(make, model, price) 
WHERE status = 'active';

-- Index for payment schedules by due date and status
CREATE INDEX IF NOT EXISTS idx_payment_schedules_due_status 
ON payment_schedules(due_date, status) 
WHERE status IN ('due', 'upcoming');

-- ============================================
-- VACUUM AND ANALYZE SCHEDULE
-- ============================================
-- Run these periodically (weekly recommended):
-- VACUUM ANALYZE applications;
-- VACUUM ANALYZE products;
-- VACUUM ANALYZE payment_schedules;

-- ============================================
-- QUERY PERFORMANCE MONITORING
-- ============================================

-- View to identify slow queries (if pg_stat_statements is enabled)
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE mean_time > 100 -- Queries taking > 100ms on average
ORDER BY mean_time DESC
LIMIT 20;

-- ============================================
-- CONNECTION POOLING BEST PRACTICES
-- ============================================
-- 
-- 1. Use connection pooling for serverless functions
--    - Transaction mode: For transactions
--    - Session mode: For long-lived connections
--
-- 2. Connection string format:
--    - Direct: postgresql://[user]:[password]@[host]:[port]/[database]
--    - Pooled: postgresql://[user]:[password]@[host]:[port]/[database]?pgbouncer=true
--
-- 3. Supabase automatically handles pooling for:
--    - REST API requests
--    - Realtime subscriptions
--    - Edge Functions
--
-- 4. For direct connections (admin operations):
--    - Use service role key (bypasses RLS)
--    - Limit connection lifetime
--    - Use connection pooling library
--
-- ============================================

