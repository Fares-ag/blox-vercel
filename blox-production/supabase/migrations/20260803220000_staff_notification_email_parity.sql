-- Staff notification email parity + staff can INSERT customer notifications
-- 1) email_sent_at observability column
-- 2) AFTER INSERT trigger → staff-notify-email (best-effort, parallel to push)
-- 3) RLS: is_staff_notifier() may INSERT notifications (customer + staff targets)

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz;

COMMENT ON COLUMN public.notifications.email_sent_at IS
  'Set by staff-notify-email after a successful staff_alert send (best-effort).';

CREATE EXTENSION IF NOT EXISTS pg_net;

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

  v_url := nullif(current_setting('app.supabase_url', true), '');
  v_key := nullif(current_setting('app.service_role_key', true), '');

  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE WARNING 'staff-notify-email skipped: app.supabase_url / app.service_role_key GUC not set';
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

DROP TRIGGER IF EXISTS trg_notifications_staff_email ON public.notifications;
CREATE TRIGGER trg_notifications_staff_email
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_email_on_notification_insert();

-- Allow credit/finance (and admin) to create customer in-app notifications
DROP POLICY IF EXISTS "Staff notifiers can create notifications" ON public.notifications;
CREATE POLICY "Staff notifiers can create notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff_notifier());
