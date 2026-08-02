-- Case-insensitive notification ownership (staff RPC stores lowercased emails)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'notifications'
  ) THEN
    DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

    CREATE POLICY "Users can read own notifications" ON public.notifications
      FOR SELECT USING (
        auth.role() = 'authenticated'
        AND lower(user_email) = lower(public.current_user_email())
      );

    CREATE POLICY "Users can update own notifications" ON public.notifications
      FOR UPDATE USING (
        auth.role() = 'authenticated'
        AND lower(user_email) = lower(public.current_user_email())
      );
  END IF;
END $$;
