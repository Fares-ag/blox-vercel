# BLOX Platform — Operations Runbook

> **Audience:** On-call engineers, DevOps leads, and support escalation team.
> Keep this document up to date after every incident.

---

## Table of Contents

1. [Failed Card Payment Procedure](#1-failed-card-payment-procedure)
2. [Stuck Bank Transfer Procedure](#2-stuck-bank-transfer-procedure)
3. [Document Resubmission Procedure](#3-document-resubmission-procedure)
4. [Secrets Rotation Procedure](#4-secrets-rotation-procedure)
5. [Rollback Procedure](#5-rollback-procedure)
6. [Support Escalation Contacts](#6-support-escalation-contacts)
7. [Monitoring Checklist](#7-monitoring-checklist)

---

## 1. Failed Card Payment Procedure

### Symptoms
- Customer reports payment page failed or did not redirect back
- `payment_transactions.status = 'pending'` for > 2 hours
- SkipCash webhook not received

### Diagnosis Steps

1. **Check Edge Function logs:**
   - Supabase Dashboard → Edge Functions → `skipcash-payment` → Logs
   - Look for `SkipCash API error` or `Missing SkipCash credentials`

2. **Check pending transactions:**
   ```sql
   SELECT id, application_id, amount, status, created_at, skipcash_payment_id
   FROM payment_transactions
   WHERE status = 'pending'
   ORDER BY created_at DESC
   LIMIT 20;
   ```

3. **Check webhook logs:**
   - Edge Functions → `skipcash-webhook` → Logs
   - Look for `signature mismatch` or errors

### Resolution

| Root Cause | Action |
|---|---|
| Missing SkipCash secrets | Add secrets in Dashboard → Edge Functions → Secrets (see `SKIPCASH_SETUP_CHECKLIST.md`) |
| Webhook not delivered | Check SkipCash portal → Webhook Logs; re-trigger if supported |
| Customer needs refund | Contact SkipCash support with `skipcash_payment_id`; mark transaction `failed` in DB |
| Transaction stuck pending | Run: `UPDATE payment_transactions SET status='abandoned' WHERE id='<id>';` |

### Manual Verification (after fix)
```sql
-- Confirm transaction is now resolved
SELECT id, status, skipcash_payment_id, completed_at
FROM payment_transactions
WHERE id = '<transaction_id>';
```

---

## 2. Stuck Bank Transfer Procedure

### Symptoms
- Admin uploaded bank receipt but application still shows unpaid installment
- `payment_schedules.status` still `'pending'` despite proof of payment

### Diagnosis Steps

1. Check if admin marked the installment paid:
   ```sql
   SELECT id, status, paid_date, paid_amount
   FROM payment_schedules
   WHERE application_id = '<app_id>'
   ORDER BY due_date;
   ```

2. Check audit_logs for the mark-paid action:
   ```sql
   SELECT * FROM audit_logs
   WHERE operation = 'MARK_PAID'
   ORDER BY created_at DESC LIMIT 10;
   ```

### Resolution

1. Admin navigates to Admin Portal → Application → Payments tab.
2. Click **Mark as Paid** for the relevant installment.
3. Upload bank receipt (optional but recommended).
4. Confirm the schedule status updates to `'paid'` in the DB query above.
5. If payment_transactions record is missing, it will be created by the backfill migration or admin can insert manually via the Dashboard.

---

## 3. Document Resubmission Procedure

### Symptoms
- Customer cannot upload documents (storage error)
- Application stuck at `resubmission_required`

### Diagnosis Steps

1. Check storage policies:
   ```sql
   SELECT * FROM storage.policies WHERE bucket_id = 'documents';
   ```

2. Check bucket accessibility:
   ```sql
   SELECT id, name, public FROM storage.buckets WHERE name = 'documents';
   ```
   — `public` should be `false`.

### Resolution

1. **If storage policy issue:** Check `supabase/migrations/` for `storage_documents_policies` migration and re-apply if missing.
2. **If application stuck:** Admin Portal → Application → set status to `under_review` to allow re-upload.
3. **Manual document upload:** Admin can upload on behalf of customer via Storage tab in Supabase Dashboard.

---

## 4. Secrets Rotation Procedure

### SkipCash Secrets Rotation

1. Log into SkipCash merchant portal → Settings → API Keys → Regenerate
2. Update in Supabase Dashboard → Edge Functions → Secrets:
   - `SKIPCASH_KEY_ID`
   - `SKIPCASH_SECRET_KEY`
   - `SKIPCASH_CLIENT_ID`
   - `SKIPCASH_WEBHOOK_KEY`
3. Redeploy edge functions: `supabase functions deploy skipcash-payment skipcash-webhook skipcash-verify`
4. Run a sandbox test payment to verify.
5. Update `docs/SKIPCASH_SETUP_CHECKLIST.md` with rotation date.

### Supabase Service Role Key Rotation

1. Supabase Dashboard → Settings → API → Rotate `service_role` key
2. Update the key in all Edge Function secrets (`SUPABASE_SERVICE_ROLE_KEY` is auto-injected — no manual update needed)
3. Update any CI/CD secrets: GitHub Actions → Settings → Secrets → `SUPABASE_SERVICE_ROLE_KEY`
4. Update Vercel Environment Variables if used on server-side

### Vercel Environment Variables Rotation

1. Vercel Dashboard → Project → Settings → Environment Variables
2. Update the relevant variable
3. Redeploy (automatic on next push, or trigger manual redeploy)

---

## 5. Rollback Procedure

### Vercel Rollback

1. Vercel Dashboard → Project → Deployments
2. Find the last known-good deployment
3. Click **Promote to Production** (instant, no code required)

### Edge Function Rollback

```bash
# List deployed versions
supabase functions list

# Redeploy previous version from git tag
git checkout <previous-tag>
supabase functions deploy <function-name>
```

### Database Migration Rollback

> ⚠️ **Never drop tables or columns in production without a data backup.**

1. Take a manual snapshot: Supabase Dashboard → Database → Backups → Create Backup
2. Identify the migration to undo (check `supabase/migrations/`)
3. Write a reverse migration (`YYYYMMDDHHMMSS_rollback_<name>.sql`)
4. Apply via: `supabase db push` or Dashboard → SQL Editor
5. Example: to undo `wire_ledger_writes_on_payment`:
   ```sql
   DROP TRIGGER IF EXISTS trg_ledger_on_schedule_paid ON public.payment_schedules;
   DROP FUNCTION IF EXISTS public.ledger_on_schedule_paid();
   ```

---

## 6. Support Escalation Contacts

| Role | Contact | Scope |
|---|---|---|
| Platform Lead | [TO BE FILLED] | All critical production issues |
| DevOps / Infrastructure | [TO BE FILLED] | Supabase, Vercel, CI/CD |
| SkipCash Support | support@skipcash.app | Payment gateway issues |
| Supabase Support | https://supabase.com/support | Database, Auth, Edge Functions |
| QAuto Ops Manager | [TO BE FILLED] | Business-level escalations |

**SLA targets:**
- P0 (platform down): respond within 15 min, resolve within 2 hours
- P1 (payments broken): respond within 30 min, resolve within 4 hours
- P2 (admin blocked): respond within 2 hours, resolve within 24 hours

---

## 7. Monitoring Checklist

Run daily:
```sql
-- 1. Stuck pending transactions
SELECT COUNT(*) AS stuck
FROM payment_transactions
WHERE status = 'pending'
  AND created_at < now() - interval '2 hours';

-- 2. Reconciliation gaps (last 7 days)
SELECT COUNT(*) AS gaps
FROM payment_schedules ps
WHERE ps.status = 'paid'
  AND ps.paid_date > now() - interval '7 days'
  AND NOT EXISTS (
    SELECT 1 FROM payment_transactions pt
    WHERE pt.payment_schedule_id = ps.id
      AND pt.status = 'completed'
  );

-- 3. Audit trail health (should have entries)
SELECT COUNT(*), MAX(created_at) FROM audit_logs;

-- 4. Ledger health
SELECT COUNT(*), MAX(created_at) FROM ledgers;

-- 5. Applications with NULL company_id (should be 0)
SELECT COUNT(*) FROM applications
WHERE company_id IS NULL AND status != 'draft';
```

**payment-monitor edge function** runs every 15 minutes automatically and logs to Supabase Edge Function Logs. Monitor via Dashboard → Edge Functions → payment-monitor.
