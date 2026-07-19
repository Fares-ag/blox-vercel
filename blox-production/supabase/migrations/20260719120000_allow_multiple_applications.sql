-- Product rule: customers may create multiple applications at any time.
-- Keep RPC for caller compatibility; always return NULL (no block).

CREATE OR REPLACE FUNCTION public.has_blocking_application(p_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Deprecated blocker: multi-apply is allowed. Parameter kept for API compat.
  PERFORM lower(trim(COALESCE(p_email, '')));
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.has_blocking_application(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_blocking_application(text) TO anon;
GRANT EXECUTE ON FUNCTION public.has_blocking_application(text) TO authenticated;

COMMENT ON FUNCTION public.has_blocking_application(text) IS
  'Deprecated: always returns NULL. Customers may create multiple applications; open/active apps do not block.';
