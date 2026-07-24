-- ─────────────────────────────────────────────────────────────────────────────
-- Android-first push: device_tokens + AFTER INSERT fan-out to push-notify.
-- Best-effort: failed HTTP must not roll back the notifications insert.
-- Requires pg_net. Edge URL/auth from GUCs (same pattern as payment-reminders):
--   ALTER DATABASE postgres SET app.supabase_url = 'https://<ref>.supabase.co';
--   ALTER DATABASE postgres SET app.service_role_key = '<service_role_key>';
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── device_tokens ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  user_email text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('android', 'ios')),
  fcm_token text NOT NULL,
  app_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT device_tokens_fcm_token_key UNIQUE (fcm_token)
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_email_lower
  ON public.device_tokens (lower(user_email));

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id
  ON public.device_tokens (user_id);

CREATE OR REPLACE FUNCTION public.device_tokens_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.user_email := lower(trim(NEW.user_email));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_device_tokens_updated_at ON public.device_tokens;
CREATE TRIGGER trg_device_tokens_updated_at
  BEFORE INSERT OR UPDATE ON public.device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.device_tokens_set_updated_at();

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own device tokens" ON public.device_tokens;
CREATE POLICY "Users manage own device tokens"
  ON public.device_tokens
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    OR lower(user_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR lower(user_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  );

DROP POLICY IF EXISTS "Service role full access device tokens" ON public.device_tokens;
-- service_role bypasses RLS; no policy required. Explicit grant for completeness.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_tokens TO authenticated;
GRANT ALL ON public.device_tokens TO service_role;

-- ── Optional observability column on notifications ───────────────────────────
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS push_sent_at timestamptz;

COMMENT ON COLUMN public.notifications.push_sent_at IS
  'Set by push-notify edge function after a successful FCM fan-out (best-effort).';

-- ── Trigger: fan-out on INSERT ───────────────────────────────────────────────
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
  -- Only fan out when we have a recipient email.
  IF NEW.user_email IS NULL OR length(trim(NEW.user_email)) = 0 THEN
    RETURN NEW;
  END IF;

  v_url := nullif(current_setting('app.supabase_url', true), '');
  v_key := nullif(current_setting('app.service_role_key', true), '');

  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE WARNING 'push-notify skipped: app.supabase_url / app.service_role_key GUC not set';
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
    -- Never fail the original notifications insert.
    RAISE WARNING 'push-notify http_post failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifications_push_notify ON public.notifications;
CREATE TRIGGER trg_notifications_push_notify
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_push_on_notification_insert();
