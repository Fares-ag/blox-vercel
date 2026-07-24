# BLOX Email System — Setup Guide

## Phase 0: Supabase Auth Templates (Dashboard, one-time)

These templates must be pasted manually into the Supabase Dashboard because Auth email templates cannot be managed via migrations.

**Dashboard path:** Authentication → Email Templates

**Copy-paste files** (one subject + one HTML per template):

[`docs/auth-email-templates/`](./auth-email-templates/)

| Dashboard template | Subject file | Body file |
|--------------------|--------------|-----------|
| Confirm signup | `01-confirm-signup.subject.txt` | `01-confirm-signup.html` |
| Reset password | `02-reset-password.subject.txt` | `02-reset-password.html` |
| Magic Link | `03-magic-link.subject.txt` | `03-magic-link.html` |
| Invite user | `04-invite-user.subject.txt` | `04-invite-user.html` |
| Change Email Address | `05-change-email.subject.txt` | `05-change-email.html` |
| Reauthentication | `06-reauthentication.subject.txt` | `06-reauthentication.html` |

> **Important:** Keep `{{ .ConfirmationURL }}` and `{{ .Token }}` as-is — those are Supabase's Go template variables.

---

## Phase 0: Resend domain verification

1. Log in to [resend.com](https://resend.com) → Domains.
2. Confirm `blox-it.com` is verified (green checkmark).  
   If not, add the required DNS records (SPF, DKIM, DMARC) from the Resend dashboard.
3. Confirm the "From" address `noreply@blox-it.com` is whitelisted / default for the API key.
4. The SMTP credentials are already wired in `infra/qatar-supabase/config/blox.env.snippet` — no changes needed if the domain is verified.

---

## Phase 1: Environment secrets

Add the following secret to your Supabase project (Dashboard → Settings → Edge Functions → Secrets):

| Key | Value |
|-----|-------|
| `RESEND_API_KEY` | Your Resend API key (re_...) |

The `send-email` function reads this at runtime.

---

## Phase 1: Apply migration

```bash
cd blox-production
npx supabase db push
```

This creates:
- `email_outbox` — audit log of every outbound email
- `notification_preferences` — per-user opt-in/out flags

---

## Phase 1: Deploy edge functions

```bash
cd blox-production
npx supabase functions deploy send-email
```

---

## Phase 2: Deploy payment-reminders

```bash
npx supabase functions deploy payment-reminders
```

### Schedule with pg_cron (run once in SQL editor)

```sql
SELECT cron.schedule(
  'blox-payment-reminders-daily',
  '0 7 * * *',  -- 7:00 AM UTC daily (10:00 AM Qatar time)
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/payment-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )
  $$
);
```

Or use a GitHub Actions cron job hitting:
```
POST $SUPABASE_URL/functions/v1/payment-reminders
Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY
```

---

## Smoke test checklist

- [ ] Sign up a test account → confirm email shows BLOX branding, From `noreply@blox-it.com`
- [ ] Trigger password reset → same
- [ ] Submit a test application → check inbox for "We received your application" email
- [ ] Approve application in admin → check inbox for "Application approved" email
- [ ] Confirm bank transfer in admin → check inbox for "Payment confirmed" receipt
- [ ] Check `email_outbox` table for audit rows (`status = 'sent'`)
- [ ] Run `payment-reminders` manually → verify reminders in inbox and `email_outbox`

---

## Monitoring

Query recent failures:
```sql
SELECT to_email, template_id, error, created_at
FROM email_outbox
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 50;
```
