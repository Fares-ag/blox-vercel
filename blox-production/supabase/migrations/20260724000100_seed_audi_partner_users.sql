-- ─────────────────────────────────────────────────────────────────────────────
-- Seed Audi partner staff: one dealer_agent + one credit_officer.
-- Idempotent. Runs with migration (postgres) privileges so it may write auth.*.
-- New users get a random password; set real credentials via Supabase Auth /
-- invite / password reset after migrate (do not commit plaintext passwords).
--   dealer@audi.qa  (role: dealer_agent, company: Audi)
--   credit@audi.qa  (role: credit_officer, company: Audi)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_audi uuid;
  v_uid  uuid;
BEGIN
  SELECT id INTO v_audi FROM public.companies WHERE name = 'Audi' LIMIT 1;
  IF v_audi IS NULL THEN
    RAISE NOTICE 'Audi company not found; skipping partner user seed.';
    RETURN;
  END IF;

  -- ── Dealer agent ───────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = 'dealer@audi.qa') THEN
    v_uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
      'dealer@audi.qa', extensions.crypt(encode(gen_random_bytes(24), 'hex'), extensions.gen_salt('bf')), now(),
      now(), now(), '{"provider":"email","providers":["email"]}',
      '{"name":"Audi Dealer"}', false, '', '', '', ''
    );
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_uid, v_uid::text,
      json_build_object('sub', v_uid::text, 'email', 'dealer@audi.qa'),
      'email', now(), now(), now()
    );
  END IF;
  UPDATE public.users
    SET role = 'dealer_agent', company_id = v_audi, name = COALESCE(name, 'Audi Dealer'), updated_at = now()
    WHERE lower(email) = 'dealer@audi.qa';

  -- ── Credit officer ─────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = 'credit@audi.qa') THEN
    v_uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
      'credit@audi.qa', extensions.crypt(encode(gen_random_bytes(24), 'hex'), extensions.gen_salt('bf')), now(),
      now(), now(), '{"provider":"email","providers":["email"]}',
      '{"name":"Audi Credit Officer"}', false, '', '', '', ''
    );
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_uid, v_uid::text,
      json_build_object('sub', v_uid::text, 'email', 'credit@audi.qa'),
      'email', now(), now(), now()
    );
  END IF;
  UPDATE public.users
    SET role = 'credit_officer', company_id = v_audi, name = COALESCE(name, 'Audi Credit Officer'), updated_at = now()
    WHERE lower(email) = 'credit@audi.qa';
END $$;
