-- ============================================
-- Secure RLS Policies for Production
-- Replaces permissive policies with role-based access control
-- ============================================
-- Run this script in Supabase Dashboard -> SQL Editor
-- ============================================

-- ============================================
-- HELPER FUNCTION: Check if user is admin
-- ============================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_email TEXT;
BEGIN
  -- Fast path: check JWT claims (if present)
  IF (auth.jwt() ->> 'role') = 'admin' OR (auth.jwt() ->> 'user_role') = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- PRIMARY: Check the public.users table (where we store roles)
  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();

  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Fallback: check by email in public.users table
  user_email := auth.jwt() ->> 'email';
  IF user_email IS NOT NULL THEN
    SELECT role INTO user_role
    FROM public.users
    WHERE LOWER(email) = LOWER(user_email);

    IF user_role = 'admin' THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- Legacy fallback: check auth.users.raw_user_meta_data (for backwards compatibility)
  SELECT COALESCE(raw_user_meta_data->>'role', raw_user_meta_data->>'user_role')
    INTO user_role
  FROM auth.users
  WHERE id = auth.uid();

  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Get current user email
-- ============================================
CREATE OR REPLACE FUNCTION current_user_email()
RETURNS TEXT AS $$
BEGIN
  RETURN auth.jwt() ->> 'email';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DROP EXISTING PERMISSIVE POLICIES
-- ============================================

-- ============================================
-- DROP EXISTING ROLE-BASED POLICIES (re-run safe)
-- ============================================

-- Products (role-based)
DROP POLICY IF EXISTS "Public can read active products" ON products;
DROP POLICY IF EXISTS "Authenticated can read all products" ON products;
DROP POLICY IF EXISTS "Admins can manage products" ON products;

-- Insurance rates (role-based)
DROP POLICY IF EXISTS "Public can read active insurance rates" ON insurance_rates;
DROP POLICY IF EXISTS "Authenticated can read all insurance rates" ON insurance_rates;
DROP POLICY IF EXISTS "Admins can manage insurance rates" ON insurance_rates;

-- Offers (role-based)
DROP POLICY IF EXISTS "Public can read active offers" ON offers;
DROP POLICY IF EXISTS "Authenticated can read all offers" ON offers;
DROP POLICY IF EXISTS "Admins can manage offers" ON offers;

-- Packages (role-based)
DROP POLICY IF EXISTS "Public can read active packages" ON packages;
DROP POLICY IF EXISTS "Authenticated can read all packages" ON packages;
DROP POLICY IF EXISTS "Admins can manage packages" ON packages;

-- Promotions (role-based)
DROP POLICY IF EXISTS "Public can read active promotions" ON promotions;
DROP POLICY IF EXISTS "Authenticated can read all promotions" ON promotions;
DROP POLICY IF EXISTS "Admins can manage promotions" ON promotions;

-- Applications (role-based)
DROP POLICY IF EXISTS "Customers can read own applications" ON applications;
DROP POLICY IF EXISTS "Customers can create applications" ON applications;
DROP POLICY IF EXISTS "Customers can update own draft applications" ON applications;
DROP POLICY IF EXISTS "Admins can read all applications" ON applications;
DROP POLICY IF EXISTS "Admins can update all applications" ON applications;
DROP POLICY IF EXISTS "Admins can delete applications" ON applications;

-- Payment schedules (role-based)
DROP POLICY IF EXISTS "Customers can read own payment schedules" ON payment_schedules;
DROP POLICY IF EXISTS "Admins can read all payment schedules" ON payment_schedules;
DROP POLICY IF EXISTS "Admins can manage payment schedules" ON payment_schedules;

-- Payment transactions (role-based)
DROP POLICY IF EXISTS "Customers can read own payment transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Customers can create payment transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Admins can read all payment transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Admins can update payment transactions" ON payment_transactions;

-- Payment deferrals (role-based)
DROP POLICY IF EXISTS "Customers can read own payment deferrals" ON payment_deferrals;
DROP POLICY IF EXISTS "Customers can create payment deferrals" ON payment_deferrals;
DROP POLICY IF EXISTS "Admins can read all payment deferrals" ON payment_deferrals;
DROP POLICY IF EXISTS "Admins can manage payment deferrals" ON payment_deferrals;

-- Ledgers (role-based)
DROP POLICY IF EXISTS "Admins can read ledgers" ON ledgers;
DROP POLICY IF EXISTS "Admins can manage ledgers" ON ledgers;

-- Products
DROP POLICY IF EXISTS "Allow public read access" ON products;
DROP POLICY IF EXISTS "Allow public insert" ON products;
DROP POLICY IF EXISTS "Allow public update" ON products;
DROP POLICY IF EXISTS "Allow public delete" ON products;

-- Insurance Rates
DROP POLICY IF EXISTS "Allow public read access" ON insurance_rates;
DROP POLICY IF EXISTS "Allow public insert" ON insurance_rates;
DROP POLICY IF EXISTS "Allow public update" ON insurance_rates;
DROP POLICY IF EXISTS "Allow public delete" ON insurance_rates;

-- Offers
DROP POLICY IF EXISTS "Allow public read access" ON offers;
DROP POLICY IF EXISTS "Allow public insert" ON offers;
DROP POLICY IF EXISTS "Allow public update" ON offers;
DROP POLICY IF EXISTS "Allow public delete" ON offers;

-- Packages
DROP POLICY IF EXISTS "Allow public read access" ON packages;
DROP POLICY IF EXISTS "Allow public insert" ON packages;
DROP POLICY IF EXISTS "Allow public update" ON packages;
DROP POLICY IF EXISTS "Allow public delete" ON packages;

-- Promotions
DROP POLICY IF EXISTS "Allow public read access" ON promotions;
DROP POLICY IF EXISTS "Allow public insert" ON promotions;
DROP POLICY IF EXISTS "Allow public update" ON promotions;
DROP POLICY IF EXISTS "Allow public delete" ON promotions;

-- Applications
DROP POLICY IF EXISTS "Allow public read access" ON applications;
DROP POLICY IF EXISTS "Allow public insert" ON applications;
DROP POLICY IF EXISTS "Allow public update" ON applications;
DROP POLICY IF EXISTS "Allow public delete" ON applications;

-- Payment Schedules
DROP POLICY IF EXISTS "Allow public read access" ON payment_schedules;
DROP POLICY IF EXISTS "Allow public insert" ON payment_schedules;
DROP POLICY IF EXISTS "Allow public update" ON payment_schedules;
DROP POLICY IF EXISTS "Allow public delete" ON payment_schedules;

-- Payment Transactions
DROP POLICY IF EXISTS "Allow public read access" ON payment_transactions;
DROP POLICY IF EXISTS "Allow public insert" ON payment_transactions;
DROP POLICY IF EXISTS "Allow public update" ON payment_transactions;

-- Payment Deferrals
DROP POLICY IF EXISTS "Allow public read access" ON payment_deferrals;
DROP POLICY IF EXISTS "Allow public insert" ON payment_deferrals;
DROP POLICY IF EXISTS "Allow public update" ON payment_deferrals;
DROP POLICY IF EXISTS "Allow public delete" ON payment_deferrals;

-- Ledgers
DROP POLICY IF EXISTS "Allow public read access" ON ledgers;
DROP POLICY IF EXISTS "Allow public insert" ON ledgers;
DROP POLICY IF EXISTS "Allow public update" ON ledgers;
DROP POLICY IF EXISTS "Allow public delete" ON ledgers;

-- ============================================
-- PRODUCTS POLICIES
-- ============================================
-- Public can read active products (for browsing)
CREATE POLICY "Public can read active products" ON products
  FOR SELECT USING (status = 'active');

-- Authenticated users can read all products
CREATE POLICY "Authenticated can read all products" ON products
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can create/update/delete products
CREATE POLICY "Admins can manage products" ON products
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- INSURANCE RATES POLICIES
-- ============================================
-- Public can read active insurance rates
CREATE POLICY "Public can read active insurance rates" ON insurance_rates
  FOR SELECT USING (status = 'active');

-- Authenticated users can read all insurance rates
CREATE POLICY "Authenticated can read all insurance rates" ON insurance_rates
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can manage insurance rates
CREATE POLICY "Admins can manage insurance rates" ON insurance_rates
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- OFFERS POLICIES
-- ============================================
-- Public can read active offers
CREATE POLICY "Public can read active offers" ON offers
  FOR SELECT USING (status = 'active');

-- Authenticated users can read all offers
CREATE POLICY "Authenticated can read all offers" ON offers
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can manage offers
CREATE POLICY "Admins can manage offers" ON offers
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- PACKAGES POLICIES
-- ============================================
-- Public can read active packages
CREATE POLICY "Public can read active packages" ON packages
  FOR SELECT USING (status = 'active');

-- Authenticated users can read all packages
CREATE POLICY "Authenticated can read all packages" ON packages
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can manage packages
CREATE POLICY "Admins can manage packages" ON packages
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- PROMOTIONS POLICIES
-- ============================================
-- Public can read active promotions
CREATE POLICY "Public can read active promotions" ON promotions
  FOR SELECT USING (
    status = 'active' AND 
    (start_date IS NULL OR start_date <= CURRENT_DATE) AND
    (end_date IS NULL OR end_date >= CURRENT_DATE)
  );

-- Authenticated users can read all promotions
CREATE POLICY "Authenticated can read all promotions" ON promotions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can manage promotions
CREATE POLICY "Admins can manage promotions" ON promotions
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- APPLICATIONS POLICIES
-- ============================================
-- Customers can read their own applications (case-insensitive email matching)
CREATE POLICY "Customers can read own applications" ON applications
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    LOWER(customer_email) = LOWER(current_user_email())
  );

-- Customers can create their own applications (case-insensitive email matching)
CREATE POLICY "Customers can create applications" ON applications
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    LOWER(customer_email) = LOWER(current_user_email())
  );

-- Customers can update their own draft applications (case-insensitive email matching)
CREATE POLICY "Customers can update own draft applications" ON applications
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    LOWER(customer_email) = LOWER(current_user_email()) AND
    status = 'draft'
  );

-- Admins can read all applications
CREATE POLICY "Admins can read all applications" ON applications
  FOR SELECT USING (is_admin());

-- Admins can update all applications
CREATE POLICY "Admins can update all applications" ON applications
  FOR UPDATE USING (is_admin());

-- Admins can delete applications
CREATE POLICY "Admins can delete applications" ON applications
  FOR DELETE USING (is_admin());

-- Admins should have full power over applications (including INSERT).
-- This complements customer "own data" policies and prevents admin 403s.
DROP POLICY IF EXISTS "Admins can manage applications" ON applications;
CREATE POLICY "Admins can manage applications" ON applications
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- PAYMENT SCHEDULES POLICIES
-- ============================================
-- Customers can read payment schedules for their applications
CREATE POLICY "Customers can read own payment schedules" ON payment_schedules
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = payment_schedules.application_id
      AND applications.customer_email = current_user_email()
    )
  );

-- Admins can read all payment schedules
CREATE POLICY "Admins can read all payment schedules" ON payment_schedules
  FOR SELECT USING (is_admin());

-- Admins can manage payment schedules
CREATE POLICY "Admins can manage payment schedules" ON payment_schedules
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- PAYMENT TRANSACTIONS POLICIES
-- ============================================
-- Customers can read transactions for their applications
CREATE POLICY "Customers can read own payment transactions" ON payment_transactions
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = payment_transactions.application_id
      AND applications.customer_email = current_user_email()
    )
  );

-- Customers can create transactions for their applications
CREATE POLICY "Customers can create payment transactions" ON payment_transactions
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = payment_transactions.application_id
      AND applications.customer_email = current_user_email()
    )
  );

-- Admins can read all transactions
CREATE POLICY "Admins can read all payment transactions" ON payment_transactions
  FOR SELECT USING (is_admin());

-- Admins can update transactions
CREATE POLICY "Admins can update payment transactions" ON payment_transactions
  FOR UPDATE USING (is_admin());

-- Admins should have full power over payment transactions (insert/update/delete/select).
DROP POLICY IF EXISTS "Admins can manage payment transactions" ON payment_transactions;
CREATE POLICY "Admins can manage payment transactions" ON payment_transactions
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- PAYMENT DEFERRALS POLICIES
-- ============================================
-- Customers can read deferrals for their applications
CREATE POLICY "Customers can read own payment deferrals" ON payment_deferrals
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = payment_deferrals.application_id
      AND applications.customer_email = current_user_email()
    )
  );

-- Customers can create deferrals for their applications (if they have Blox membership)
CREATE POLICY "Customers can create payment deferrals" ON payment_deferrals
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = payment_deferrals.application_id
      AND applications.customer_email = current_user_email()
      AND applications.blox_membership->>'isActive' = 'true'
    )
  );

-- Admins can read all deferrals
CREATE POLICY "Admins can read all payment deferrals" ON payment_deferrals
  FOR SELECT USING (is_admin());

-- Admins can manage deferrals
CREATE POLICY "Admins can manage payment deferrals" ON payment_deferrals
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- LEDGERS POLICIES
-- ============================================
-- Only admins can access ledgers
CREATE POLICY "Admins can read ledgers" ON ledgers
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can manage ledgers" ON ledgers
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- NOTIFICATIONS POLICIES (if table exists)
-- ============================================
-- Users can read their own notifications
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    -- Drop existing policies if any
    DROP POLICY IF EXISTS "Users can read their own notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
    DROP POLICY IF EXISTS "Allow authenticated insert" ON notifications;
    DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
    DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;
    DROP POLICY IF EXISTS "Admins can manage notifications" ON notifications;
    
    -- Create new policies
    EXECUTE 'CREATE POLICY "Users can read own notifications" ON notifications
      FOR SELECT USING (
        auth.role() = ''authenticated'' AND
        user_email = current_user_email()
      )';
    
    EXECUTE 'CREATE POLICY "Users can update own notifications" ON notifications
      FOR UPDATE USING (
        auth.role() = ''authenticated'' AND
        user_email = current_user_email()
      )';
    
    EXECUTE 'CREATE POLICY "Admins can create notifications" ON notifications
      FOR INSERT WITH CHECK (is_admin())';

    -- Admins should have full power over notifications too.
    EXECUTE 'CREATE POLICY "Admins can manage notifications" ON notifications
      FOR ALL
      USING (is_admin())
      WITH CHECK (is_admin())';
  END IF;
END $$;

-- ============================================
-- COMPLETED!
-- ============================================
-- Your RLS policies are now secure and role-based.
-- Make sure to set user roles in Supabase Auth metadata:
-- auth.users.user_metadata.role = 'admin' or 'customer'
-- ============================================


