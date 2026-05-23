-- Strengthen current_user_email() for applications RLS:
-- - Trim (policy uses LOWER() but spaces break equality)
-- - user_metadata.email (some auth flows)
-- - auth.users (definer can read)
-- - public.users (profile row; helps when JWT lags profile)

CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT NULLIF(
    TRIM(
      COALESCE(
        NULLIF(TRIM(auth.jwt() ->> 'email'), ''),
        NULLIF(TRIM(auth.jwt() -> 'user_metadata' ->> 'email'), ''),
        (SELECT NULLIF(TRIM(u.email), '') FROM auth.users u WHERE u.id = auth.uid()),
        (SELECT NULLIF(TRIM(u.email), '') FROM public.users u WHERE u.id = auth.uid())
      )
    ),
    ''
  );
$$;

COMMENT ON FUNCTION public.current_user_email() IS
  'Email for RLS: JWT, user_metadata, auth.users, then public.users; all trimmed.';
