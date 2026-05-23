-- ============================================
-- Enhanced Analytics Functions for Dashboard
-- ============================================
-- This file contains database functions for advanced analytics:
-- - Revenue forecasting
-- - Application conversion funnel
-- - Payment collection rates
-- - Customer lifetime value
-- ============================================

-- ============================================
-- REVENUE FORECASTING FUNCTION
-- ============================================
-- Returns projected revenue for the next N months based on historical data
CREATE OR REPLACE FUNCTION get_revenue_forecast(
  start_date DATE,
  end_date DATE,
  forecast_months INTEGER DEFAULT 6
)
RETURNS TABLE (
  period TEXT,
  projected_revenue NUMERIC,
  actual_revenue NUMERIC,
  forecasted_revenue NUMERIC
) AS $$
DECLARE
  historical_avg NUMERIC;
  growth_rate NUMERIC;
BEGIN
  -- Calculate historical average monthly revenue
  SELECT COALESCE(AVG(monthly_revenue), 0)
  INTO historical_avg
  FROM (
    SELECT 
      DATE_TRUNC('month', paid_date) as month,
      SUM(amount) as monthly_revenue
    FROM payment_schedules
    WHERE status = 'paid' 
      AND paid_date BETWEEN start_date AND end_date
    GROUP BY DATE_TRUNC('month', paid_date)
  ) AS monthly_data;

  -- Calculate growth rate (simple average of month-over-month growth)
  WITH monthly_revenues AS (
    SELECT 
      DATE_TRUNC('month', paid_date) as month,
      SUM(amount) as revenue
    FROM payment_schedules
    WHERE status = 'paid' 
      AND paid_date BETWEEN start_date AND end_date
    GROUP BY DATE_TRUNC('month', paid_date)
    ORDER BY month
  ),
  growth_calc AS (
    SELECT 
      month,
      revenue,
      LAG(revenue) OVER (ORDER BY month) as prev_revenue
    FROM monthly_revenues
  )
  SELECT COALESCE(AVG(
    CASE 
      WHEN prev_revenue > 0 THEN (revenue - prev_revenue) / prev_revenue
      ELSE 0
    END
  ), 0) * 100
  INTO growth_rate
  FROM growth_calc
  WHERE prev_revenue IS NOT NULL;

  -- Return historical data
  RETURN QUERY
  SELECT 
    TO_CHAR(DATE_TRUNC('month', paid_date), 'YYYY-MM') as period,
    SUM(amount) FILTER (WHERE status = 'upcoming' OR status = 'due') as projected_revenue,
    SUM(amount) FILTER (WHERE status = 'paid') as actual_revenue,
    0::NUMERIC as forecasted_revenue
  FROM payment_schedules
  WHERE due_date BETWEEN start_date AND end_date
  GROUP BY DATE_TRUNC('month', paid_date)
  ORDER BY period;

  -- Generate forecast for future months
  -- This is a simplified forecast - you can enhance with more sophisticated models
  FOR i IN 1..forecast_months LOOP
    RETURN QUERY
    SELECT 
      TO_CHAR(CURRENT_DATE + (i || ' months')::INTERVAL, 'YYYY-MM') as period,
      0::NUMERIC as projected_revenue,
      0::NUMERIC as actual_revenue,
      historical_avg * POWER(1 + COALESCE(growth_rate, 0) / 100, i) as forecasted_revenue;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- APPLICATION CONVERSION FUNNEL
-- ============================================
-- Tracks applications through different stages
CREATE OR REPLACE FUNCTION get_conversion_funnel(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  stage TEXT,
  count BIGINT,
  percentage NUMERIC,
  drop_off_rate NUMERIC
) AS $$
DECLARE
  total_applications BIGINT;
  prev_count BIGINT := 0;
BEGIN
  -- Get total applications created in period
  SELECT COUNT(*)
  INTO total_applications
  FROM applications
  WHERE created_at::DATE BETWEEN start_date AND end_date;

  -- Draft stage
  SELECT COUNT(*)
  INTO prev_count
  FROM applications
  WHERE created_at::DATE BETWEEN start_date AND end_date
    AND status = 'draft';

  RETURN QUERY
  SELECT 
    'Draft'::TEXT,
    prev_count,
    CASE WHEN total_applications > 0 THEN (prev_count::NUMERIC / total_applications * 100) ELSE 0 END,
    0::NUMERIC;

  -- Submitted stage
  SELECT COUNT(*)
  INTO prev_count
  FROM applications
  WHERE created_at::DATE BETWEEN start_date AND end_date
    AND status IN ('submitted', 'under_review', 'pending_approval');

  RETURN QUERY
  SELECT 
    'Submitted'::TEXT,
    prev_count,
    CASE WHEN total_applications > 0 THEN (prev_count::NUMERIC / total_applications * 100) ELSE 0 END,
    CASE WHEN total_applications > 0 THEN ((total_applications - prev_count)::NUMERIC / total_applications * 100) ELSE 0 END;

  -- Approved stage
  SELECT COUNT(*)
  INTO prev_count
  FROM applications
  WHERE created_at::DATE BETWEEN start_date AND end_date
    AND status IN ('approved', 'contract_signing_required', 'contracts_submitted', 'contract_under_review');

  RETURN QUERY
  SELECT 
    'Approved'::TEXT,
    prev_count,
    CASE WHEN total_applications > 0 THEN (prev_count::NUMERIC / total_applications * 100) ELSE 0 END,
    CASE WHEN total_applications > 0 THEN ((total_applications - prev_count)::NUMERIC / total_applications * 100) ELSE 0 END;

  -- Active stage (contracts signed, active payments)
  SELECT COUNT(*)
  INTO prev_count
  FROM applications
  WHERE created_at::DATE BETWEEN start_date AND end_date
    AND status = 'active';

  RETURN QUERY
  SELECT 
    'Active'::TEXT,
    prev_count,
    CASE WHEN total_applications > 0 THEN (prev_count::NUMERIC / total_applications * 100) ELSE 0 END,
    CASE WHEN total_applications > 0 THEN ((total_applications - prev_count)::NUMERIC / total_applications * 100) ELSE 0 END;

  -- Completed stage
  SELECT COUNT(*)
  INTO prev_count
  FROM applications
  WHERE created_at::DATE BETWEEN start_date AND end_date
    AND status = 'completed';

  RETURN QUERY
  SELECT 
    'Completed'::TEXT,
    prev_count,
    CASE WHEN total_applications > 0 THEN (prev_count::NUMERIC / total_applications * 100) ELSE 0 END,
    CASE WHEN total_applications > 0 THEN ((total_applications - prev_count)::NUMERIC / total_applications * 100) ELSE 0 END;

  -- Rejected/Cancelled stage
  SELECT COUNT(*)
  INTO prev_count
  FROM applications
  WHERE created_at::DATE BETWEEN start_date AND end_date
    AND status IN ('rejected', 'cancelled');

  RETURN QUERY
  SELECT 
    'Rejected/Cancelled'::TEXT,
    prev_count,
    CASE WHEN total_applications > 0 THEN (prev_count::NUMERIC / total_applications * 100) ELSE 0 END,
    0::NUMERIC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PAYMENT COLLECTION RATES
-- ============================================
-- Calculates collection rates by period
CREATE OR REPLACE FUNCTION get_payment_collection_rates(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  period TEXT,
  total_due NUMERIC,
  total_collected NUMERIC,
  collection_rate NUMERIC,
  overdue_amount NUMERIC,
  overdue_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(DATE_TRUNC('month', ps.due_date), 'YYYY-MM') as period,
    COALESCE(SUM(ps.amount), 0) as total_due,
    COALESCE(SUM(ps.amount) FILTER (WHERE ps.status = 'paid'), 0) as total_collected,
    CASE 
      WHEN SUM(ps.amount) > 0 THEN 
        (SUM(ps.amount) FILTER (WHERE ps.status = 'paid')::NUMERIC / SUM(ps.amount) * 100)
      ELSE 0 
    END as collection_rate,
    COALESCE(SUM(ps.amount) FILTER (
      WHERE ps.status IN ('due', 'overdue') 
        AND ps.due_date < CURRENT_DATE
    ), 0) as overdue_amount,
    CASE 
      WHEN SUM(ps.amount) > 0 THEN 
        (SUM(ps.amount) FILTER (
          WHERE ps.status IN ('due', 'overdue') 
            AND ps.due_date < CURRENT_DATE
        )::NUMERIC / SUM(ps.amount) * 100)
      ELSE 0 
    END as overdue_rate
  FROM payment_schedules ps
  WHERE ps.due_date BETWEEN start_date AND end_date
  GROUP BY DATE_TRUNC('month', ps.due_date)
  ORDER BY period;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CUSTOMER LIFETIME VALUE (CLV)
-- ============================================
-- Calculates CLV for all customers
CREATE OR REPLACE FUNCTION get_customer_lifetime_value(
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  customer_email TEXT,
  customer_name TEXT,
  total_revenue NUMERIC,
  total_applications BIGINT,
  average_application_value NUMERIC,
  average_payment_amount NUMERIC,
  total_payments BIGINT,
  last_payment_date TIMESTAMPTZ,
  customer_since TIMESTAMPTZ,
  clv NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.customer_email::TEXT as customer_email,
    COALESCE(a.customer_name, a.customer_email)::TEXT as customer_name,
    COALESCE(SUM(ps.amount) FILTER (WHERE ps.status = 'paid'), 0)::NUMERIC as total_revenue,
    COUNT(DISTINCT a.id)::BIGINT as total_applications,
    COALESCE(AVG(a.loan_amount), 0)::NUMERIC as average_application_value,
    COALESCE(
      CASE 
        WHEN COUNT(ps.id) FILTER (WHERE ps.status = 'paid') > 0 
        THEN AVG(ps.amount) FILTER (WHERE ps.status = 'paid')
        ELSE 0::NUMERIC
      END, 
      0::NUMERIC
    ) as average_payment_amount,
    COALESCE(COUNT(ps.id) FILTER (WHERE ps.status = 'paid'), 0)::BIGINT as total_payments,
    MAX(ps.paid_date)::TIMESTAMPTZ as last_payment_date,
    MIN(a.created_at)::TIMESTAMPTZ as customer_since,
    -- CLV calculation: total revenue + projected future value
    -- Simplified: total_revenue * (1 + expected_repeat_rate)
    (COALESCE(SUM(ps.amount) FILTER (WHERE ps.status = 'paid'), 0) * (1 + CASE 
      WHEN COUNT(DISTINCT a.id) > 1 THEN 0.3 -- 30% chance of repeat if multiple apps
      ELSE 0.1 -- 10% chance if single app
    END))::NUMERIC as clv
  FROM applications a
  LEFT JOIN payment_schedules ps ON ps.application_id = a.id
  WHERE a.customer_email IS NOT NULL
  GROUP BY a.customer_email, a.customer_name
  HAVING COALESCE(SUM(ps.amount) FILTER (WHERE ps.status = 'paid'), 0) > 0
  ORDER BY total_revenue DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION get_revenue_forecast(DATE, DATE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversion_funnel(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_payment_collection_rates(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_lifetime_value(INTEGER) TO authenticated;

