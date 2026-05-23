-- ============================================
-- FIX: Admin INSERT blocked on offers (RLS)
-- ============================================
-- Symptom:
--   403 + "new row violates row-level security policy for table \"offers\""
--
-- Root cause:
-- - INSERT requires a policy WITH CHECK.
--
-- Run in Supabase Dashboard -> SQL Editor.
-- Safe to re-run.
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

  -- Preferred: check the current logged-in user by auth.uid()
  SELECT COALESCE(raw_user_meta_data->>'role', raw_user_meta_data->>'user_role')
    INTO user_role
  FROM auth.users
  WHERE id = auth.uid();

  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Fallback: match by email (case-insensitive)
  user_email := auth.jwt() ->> 'email';
  IF user_email IS NOT NULL THEN
    SELECT COALESCE(raw_user_meta_data->>'role', raw_user_meta_data->>'user_role')
      INTO user_role
    FROM auth.users
    WHERE LOWER(email) = LOWER(user_email);

    IF user_role = 'admin' THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE IF EXISTS public.offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage offers" ON public.offers;
CREATE POLICY "Admins can manage offers" ON public.offers
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Verify
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'offers'
ORDER BY cmd, policyname;


