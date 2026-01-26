-- ============================================
-- Activity Logs Table for User Activity Tracking
-- ============================================
-- This table tracks all user actions in the application
-- ============================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  user_role TEXT, -- 'customer', 'admin', 'super_admin'
  action_type TEXT NOT NULL, -- 'create', 'update', 'delete', 'view', 'login', 'logout', etc.
  resource_type TEXT NOT NULL, -- 'application', 'product', 'offer', 'payment', 'user', etc.
  resource_id TEXT, -- ID of the resource being acted upon
  resource_name TEXT, -- Human-readable name (e.g., "Application #12345")
  description TEXT, -- Human-readable description of the action
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional context (old values, new values, etc.)
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_email ON activity_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_type ON activity_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_role ON activity_logs(user_role);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_id ON activity_logs(resource_id);

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins can read all activity logs
DROP POLICY IF EXISTS "Super admins can read all activity logs" ON activity_logs;
CREATE POLICY "Super admins can read all activity logs"
  ON activity_logs FOR SELECT
  USING (is_super_admin());

-- Policy: System can insert activity logs (via service role or authenticated users)
CREATE POLICY "Authenticated users can create activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: No updates or deletes (immutable audit trail)
-- Activity logs should never be modified or deleted

-- ============================================
-- Update is_admin() to include super_admin
-- ============================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_email TEXT;
BEGIN
  -- Fast path: check JWT claims (if present)
  user_role := COALESCE(
    auth.jwt() ->> 'role',
    auth.jwt() ->> 'user_role'
  );
  
  IF user_role IN ('admin', 'super_admin') THEN
    RETURN TRUE;
  END IF;

  -- PRIMARY: Check the public.users table (where we store roles)
  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();

  IF user_role IN ('admin', 'super_admin') THEN
    RETURN TRUE;
  END IF;

  -- Fallback: check by email in public.users table
  user_email := auth.jwt() ->> 'email';
  IF user_email IS NOT NULL THEN
    SELECT role INTO user_role
    FROM public.users
    WHERE LOWER(email) = LOWER(user_email);

    IF user_role IN ('admin', 'super_admin') THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- Legacy fallback: check auth.users.raw_user_meta_data
  SELECT COALESCE(raw_user_meta_data->>'role', raw_user_meta_data->>'user_role')
    INTO user_role
  FROM auth.users
  WHERE id = auth.uid();

  IF user_role IN ('admin', 'super_admin') THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- New function: Check if user is super_admin
-- ============================================
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_email TEXT;
BEGIN
  -- Fast path: check JWT claims
  user_role := COALESCE(
    auth.jwt() ->> 'role',
    auth.jwt() ->> 'user_role'
  );
  
  IF user_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;

  -- Check public.users table
  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();

  IF user_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;

  -- Fallback: check by email
  user_email := auth.jwt() ->> 'email';
  IF user_email IS NOT NULL THEN
    SELECT role INTO user_role
    FROM public.users
    WHERE LOWER(email) = LOWER(user_email);

    IF user_role = 'super_admin' THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- Legacy fallback: check auth.users.raw_user_meta_data
  SELECT COALESCE(raw_user_meta_data->>'role', raw_user_meta_data->>'user_role')
    INTO user_role
  FROM auth.users
  WHERE id = auth.uid();

  IF user_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
