-- Restore anon EXECUTE on create_application_after_signup.
--
-- Guest apply flow: signUp with email-confirm returns no JWT, so the client
-- calls this SECURITY DEFINER RPC as anon. Migration
-- 20260718010000_p0_claim_credits_plan_guard.sql revoked anon from a batch of
-- RPCs (correct for money/admin) but incorrectly included this signup helper.

REVOKE ALL ON FUNCTION public.create_application_after_signup(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_application_after_signup(uuid, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.create_application_after_signup(uuid, jsonb) TO authenticated;

COMMENT ON FUNCTION public.create_application_after_signup(uuid, jsonb) IS
  'Insert one application for a newly registered auth user when no JWT (email confirmation). Callable by anon; validates auth.users email vs payload.';
