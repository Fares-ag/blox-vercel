-- Staff realtime notifications: fan-out RPCs + Realtime publication
-- Portals: admin / credit / finance (dealer out of scope)

CREATE OR REPLACE FUNCTION public.is_staff_notifier()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO off
AS $$
  SELECT public.current_user_role() IN (
    'admin',
    'super_admin',
    'credit_officer',
    'finance_officer'
  );
$$;

-- Internal insert (staff recipients only). Not granted to clients.
CREATE OR REPLACE FUNCTION public.notify_users_internal(
  p_emails text[],
  p_type text,
  p_title text,
  p_message text,
  p_link text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO off
AS $$
DECLARE
  v_email text;
  v_actor text;
  v_count integer := 0;
  v_type text;
BEGIN
  IF p_emails IS NULL OR cardinality(p_emails) = 0 THEN
    RETURN 0;
  END IF;

  v_type := lower(coalesce(nullif(trim(p_type), ''), 'info'));
  IF v_type NOT IN ('success', 'info', 'warning', 'error') THEN
    v_type := 'info';
  END IF;

  v_actor := lower(coalesce(public.current_user_email(), ''));

  FOREACH v_email IN ARRAY p_emails
  LOOP
    v_email := lower(trim(v_email));
    IF v_email IS NULL OR v_email = '' OR v_email = v_actor THEN
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.users u
      WHERE lower(u.email) = v_email
        AND u.role IN ('admin', 'super_admin', 'credit_officer', 'finance_officer')
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.notifications (user_email, type, title, message, link, read)
    VALUES (
      v_email,
      v_type,
      left(coalesce(nullif(trim(p_title), ''), 'Notification'), 200),
      coalesce(nullif(trim(p_message), ''), ''),
      nullif(trim(p_link), ''),
      false
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_users(
  p_emails text[],
  p_type text,
  p_title text,
  p_message text,
  p_link text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO off
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authorized: authentication required'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_staff_notifier() THEN
    RAISE EXCEPTION 'not authorized: notify_users requires staff role'
      USING ERRCODE = '42501';
  END IF;

  RETURN public.notify_users_internal(p_emails, p_type, p_title, p_message, p_link);
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_roles(
  p_roles text[],
  p_type text,
  p_title text,
  p_message text,
  p_link text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO off
AS $$
DECLARE
  v_emails text[];
  v_allowed text[] := ARRAY['admin', 'super_admin', 'credit_officer', 'finance_officer'];
  v_roles text[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authorized: authentication required'
      USING ERRCODE = '42501';
  END IF;

  IF p_roles IS NULL OR cardinality(p_roles) = 0 THEN
    RETURN 0;
  END IF;

  -- Whitelist staff roles only (any authenticated caller may fan-out handoffs).
  SELECT array_agg(DISTINCT r)
  INTO v_roles
  FROM (
    SELECT lower(trim(x)) AS r
    FROM unnest(p_roles) AS x
  ) s
  WHERE r = ANY (v_allowed);

  IF v_roles IS NULL OR cardinality(v_roles) = 0 THEN
    RETURN 0;
  END IF;

  SELECT array_agg(DISTINCT lower(u.email))
  INTO v_emails
  FROM public.users u
  WHERE u.role = ANY (v_roles)
    AND u.email IS NOT NULL
    AND trim(u.email) <> '';

  IF v_emails IS NULL THEN
    RETURN 0;
  END IF;

  RETURN public.notify_users_internal(v_emails, p_type, p_title, p_message, p_link);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_staff_notifier() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_users(text[], text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_roles(text[], text, text, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.notify_users_internal(text[], text, text, text, text) FROM PUBLIC, anon, authenticated;

-- Realtime: staff bells subscribe to own rows
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.notifications REPLICA IDENTITY FULL;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
  END IF;
END $$;
