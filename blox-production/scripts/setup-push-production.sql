-- Run once in Supabase Dashboard → SQL Editor (project zqwsxewuppexvjyakuqf)
-- Enables notifications INSERT triggers (push-notify + staff-notify-email).
--
-- Hosted Supabase blocks ALTER DATABASE SET for app.* GUCs — use Vault instead.
--
-- 1) Paste service_role JWT into service_key below (Project Settings → API → service_role).
-- 2) Run the whole script.
-- 3) Revert service_key to the placeholder before committing this file.

DO $$
DECLARE
  sid uuid;
  project_url text := 'https://zqwsxewuppexvjyakuqf.supabase.co';
BEGIN
  SELECT id INTO sid FROM vault.secrets WHERE name = 'project_url' LIMIT 1;
  IF sid IS NULL THEN
    PERFORM vault.create_secret(
      project_url,
      'project_url',
      'Project URL for pg_net → Edge Functions'
    );
  ELSE
    PERFORM vault.update_secret(sid, project_url);
  END IF;
END $$;

DO $$
DECLARE
  sid uuid;
  service_key text := 'PASTE_KEY_HERE';
BEGIN
  IF service_key = 'PASTE_KEY_HERE' THEN
    RAISE EXCEPTION 'Set service_key to your service_role JWT, then re-run';
  END IF;

  SELECT id INTO sid FROM vault.secrets WHERE name = 'service_role_key' LIMIT 1;
  IF sid IS NULL THEN
    PERFORM vault.create_secret(
      service_key,
      'service_role_key',
      'Service role key for pg_net → Edge Functions'
    );
  ELSE
    PERFORM vault.update_secret(sid, service_key);
  END IF;
END $$;

SELECT name, length(decrypted_secret) AS secret_len
FROM vault.decrypted_secrets
WHERE name IN ('project_url', 'service_role_key')
ORDER BY name;

SELECT
  (c.base_url IS NOT NULL) AS has_url,
  (length(coalesce(c.service_role_key, '')) > 10) AS key_set
FROM public.edge_invoke_credentials() c;
