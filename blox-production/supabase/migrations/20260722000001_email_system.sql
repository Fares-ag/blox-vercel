-- ─────────────────────────────────────────────────────────────────────────────
-- BLOX Email System — Phase 1 Migration
-- Creates email_outbox (audit log) and notification_preferences tables.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── email_outbox ─────────────────────────────────────────────────────────────
-- Audit log for every outbound email.  status: pending | sent | failed.
CREATE TABLE IF NOT EXISTS public.email_outbox (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email            text NOT NULL,
  user_email          text,                        -- normalised key for lookups
  template_id         text NOT NULL,
  subject             text,
  payload             jsonb DEFAULT '{}'::jsonb,
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'sent', 'failed')),
  provider_message_id text,                        -- Resend message id
  error               text,
  idempotency_key     text UNIQUE,                 -- prevents duplicate sends
  sent_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Fast lookups by idempotency key and status/user for ops views.
CREATE INDEX IF NOT EXISTS idx_email_outbox_idempotency_key
  ON public.email_outbox (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_outbox_user_email
  ON public.email_outbox (user_email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_outbox_status_created
  ON public.email_outbox (status, created_at DESC);

-- Service-role writes; no RLS needed (internal table, never exposed to customers).
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write (no anon/customer access).
CREATE POLICY "service_role_full_access" ON public.email_outbox
  USING (auth.role() = 'service_role');


-- ── notification_preferences ─────────────────────────────────────────────────
-- Per-user email opt-in/out flags.
-- Defaults: transactional on (receipts, status, reminders), marketing off.
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_email            text PRIMARY KEY,
  email_transactional   boolean NOT NULL DEFAULT true,
  email_marketing       boolean NOT NULL DEFAULT false,
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Customers can read and update their own row (but not insert a new one freely —
-- rows are upserted by the edge function on first send or by profile UI).
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_read_own_prefs" ON public.notification_preferences
  FOR SELECT USING (lower(user_email) = lower(current_setting('request.jwt.claims', true)::jsonb ->> 'email'));

CREATE POLICY "customer_update_own_prefs" ON public.notification_preferences
  FOR UPDATE USING (lower(user_email) = lower(current_setting('request.jwt.claims', true)::jsonb ->> 'email'));

CREATE POLICY "service_role_full_prefs" ON public.notification_preferences
  USING (auth.role() = 'service_role');
