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

