-- Fix remaining users RLS recursion: dealer policy subqueries public.users,
-- which re-enters RLS while evaluating SELECT on users (breaks credit login role fetch).

CREATE OR REPLACE FUNCTION public.current_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO off
AS $$
  SELECT u.company_id
  FROM public.users u
  WHERE u.id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_company_id() TO authenticated;

DROP POLICY IF EXISTS "Dealer agents read company users" ON public.users;
CREATE POLICY "Dealer agents read company users"
  ON public.users
  FOR SELECT
  USING (
    public.is_dealer_agent()
    AND company_id IS NOT NULL
    AND company_id = public.current_user_company_id()
  );

DROP POLICY IF EXISTS "Dealer agents manage company applications" ON public.applications;
CREATE POLICY "Dealer agents manage company applications"
  ON public.applications
  FOR ALL
  USING (
    public.is_dealer_agent()
    AND company_id IS NOT NULL
    AND company_id = public.current_user_company_id()
  )
  WITH CHECK (
    public.is_dealer_agent()
    AND company_id IS NOT NULL
    AND company_id = public.current_user_company_id()
  );
