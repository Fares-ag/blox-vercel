-- Run once in Supabase Dashboard → SQL Editor (Fares-ag / zqwsxewuppexvjyakuqf)
-- Required for push-notify + payment-reminders DB triggers to call Edge Functions.
--
-- Requires postgres role (Supabase Dashboard → SQL Editor).
-- Replace the service role key placeholder (Settings → API → service_role).

ALTER DATABASE postgres SET app.supabase_url = 'https://zqwsxewuppexvjyakuqf.supabase.co';
ALTER DATABASE postgres SET app.service_role_key = '<PASTE_SERVICE_ROLE_KEY_HERE>';

-- Verify (should show URL; key should NOT be null after reconnect):
-- SELECT current_setting('app.supabase_url', true) AS url,
--        length(current_setting('app.service_role_key', true)) > 0 AS key_set;
