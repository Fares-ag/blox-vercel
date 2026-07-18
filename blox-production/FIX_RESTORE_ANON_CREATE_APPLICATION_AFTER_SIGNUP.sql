-- Ops paste: restore anon grant for guest signup → apply RPC
-- Safe / idempotent.

REVOKE ALL ON FUNCTION public.create_application_after_signup(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_application_after_signup(uuid, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.create_application_after_signup(uuid, jsonb) TO authenticated;
