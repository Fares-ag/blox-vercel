-- Minimal helpers required before credits / payment_intents RLS and RPCs.
-- Replaced or extended by supabase/migrations/20250406* and 20250407*.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'role') = 'admin',
    FALSE
  )
  OR COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin'),
    FALSE
  );
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
