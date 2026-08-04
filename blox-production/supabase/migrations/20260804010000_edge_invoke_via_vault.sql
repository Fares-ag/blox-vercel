-- Hosted Supabase denies ALTER DATABASE SET for custom app.* GUCs
-- (postgres is not a superuser). Use Vault secrets instead for pg_net → Edge.

CREATE OR REPLACE FUNCTION public.edge_invoke_credentials(
  OUT base_url text,
  OUT service_role_key text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'vault'
AS $$
DECLARE
  v_url text;
  v_key text;
BEGIN
  SELECT ds.decrypted_secret INTO v_url
  FROM vault.decrypted_secrets ds
  WHERE ds.name = 'project_url'
  LIMIT 1;

  SELECT ds.decrypted_secret INTO v_key
  FROM vault.decrypted_secrets ds
  WHERE ds.name = 'service_role_key'
  LIMIT 1;

  -- Legacy GUC fallback (self-hosted / older setups that could set them)
  IF v_url IS NULL OR length(trim(v_url)) = 0 THEN
    v_url := nullif(current_setting('app.supabase_url', true), '');
  END IF;
  IF v_key IS NULL OR length(trim(v_key)) = 0 THEN
    v_key := nullif(current_setting('app.service_role_key', true), '');
  END IF;

  base_url := nullif(trim(both FROM coalesce(v_url, '')), '');
  service_role_key := nullif(trim(both FROM coalesce(v_key, '')), '');
END;
$$;

COMMENT ON FUNCTION public.edge_invoke_credentials() IS
  'Resolves project_url + service_role_key from Vault (preferred) or legacy app.* GUCs.';

REVOKE ALL ON FUNCTION public.edge_invoke_credentials() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.edge_invoke_credentials() TO postgres, service_role;

-- Push fan-out
CREATE OR REPLACE FUNCTION public.notify_push_on_notification_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_url text;
  v_key text;
BEGIN
  IF NEW.user_email IS NULL OR length(trim(NEW.user_email)) = 0 THEN
    RETURN NEW;
  END IF;

  SELECT c.base_url, c.service_role_key INTO v_url, v_key
  FROM public.edge_invoke_credentials() c;

  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE WARNING 'push-notify skipped: Vault project_url / service_role_key not set (see scripts/setup-push-production.sql)';
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := v_url || '/functions/v1/push-notify',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || v_key,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('notification_id', NEW.id),
      timeout_milliseconds := 5000
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'push-notify http_post failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Staff email bridge
CREATE OR REPLACE FUNCTION public.notify_email_on_notification_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_url text;
  v_key text;
BEGIN
  IF NEW.user_email IS NULL OR length(trim(NEW.user_email)) = 0 THEN
    RETURN NEW;
  END IF;

  SELECT c.base_url, c.service_role_key INTO v_url, v_key
  FROM public.edge_invoke_credentials() c;

  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE WARNING 'staff-notify-email skipped: Vault project_url / service_role_key not set (see scripts/setup-push-production.sql)';
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := v_url || '/functions/v1/staff-notify-email',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || v_key,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('notification_id', NEW.id),
      timeout_milliseconds := 5000
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'staff-notify-email http_post failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Reschedule payment reminders to use Vault credentials
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'blox-payment-reminders-daily') THEN
    PERFORM cron.unschedule('blox-payment-reminders-daily');
  END IF;
EXCEPTION WHEN undefined_table THEN
  NULL; -- pg_cron not present
WHEN OTHERS THEN
  RAISE WARNING 'payment-reminders cron reschedule skipped: %', SQLERRM;
END $$;

DO $$
BEGIN
  PERFORM cron.schedule(
    'blox-payment-reminders-daily',
    '0 7 * * *',
    $cron$
    SELECT net.http_post(
      url := (SELECT c.base_url FROM public.edge_invoke_credentials() c) || '/functions/v1/payment-reminders',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (SELECT c.service_role_key FROM public.edge_invoke_credentials() c),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    )
    $cron$
  );
EXCEPTION WHEN undefined_table THEN
  NULL;
WHEN OTHERS THEN
  RAISE WARNING 'payment-reminders cron schedule skipped: %', SQLERRM;
END $$;
