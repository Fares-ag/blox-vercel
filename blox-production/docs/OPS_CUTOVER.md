# BLOX Ops Cutover Checklist

Live Dashboard / secret actions that cannot be completed in git alone.
Complete **before** setting `BACKEND_GATE_CONFIRMED=true` and deploying production frontend.

## 1. Environments

- [ ] Separate Supabase projects for staging vs production
- [ ] GitHub secrets `STAGING_VITE_SUPABASE_*` and `PRODUCTION_VITE_SUPABASE_*` point at the correct projects
- [ ] PITR / daily backups enabled on production Supabase
- [ ] Custom domains: `admin.blox.com`, `customer.blox.com` (+ staging hosts) on Vercel

## 2. Auth URL allow-list (Supabase → Authentication → URL Configuration)

- [ ] Site URL = `https://customer.blox.com` (or admin if primary)
- [ ] Redirect URLs include:
  - `https://customer.blox.com/customer/auth/login`
  - `https://customer.blox.com/customer/auth/reset-password`
  - `https://admin.blox.com/admin/auth/reset-password`
  - staging equivalents
- [ ] Email confirmations enabled for customer signup

## 3. Apply migrations (order)

From `supabase/migrations/` apply all, including at least:

1. `20260720120000_restore_customer_payment_permissions.sql`
2. `20260720130000_complete_skipcash_payment_atomic.sql`
3. `20260720140000_pay_with_credits_locks.sql`
4. `20260720150000_harden_role_sync_no_metadata.sql`
5. `20260720160000_secure_rls_baseline.sql`
6. `20260720170000_storage_documents_policies.sql`
7. `20260720180000_storage_signed_contracts_receipts.sql`
8. `20260720190000_payment_reconciliation_views.sql`

```bash
supabase db push --project-ref <ref>
# or run SQL files in Dashboard in timestamp order
# helper: scripts/apply-remediation-migrations.md
# functions: ./scripts/deploy-skipcash-functions.sh <ref>
#         or .\scripts\deploy-skipcash-functions.ps1 -ProjectRef <ref>
```

### Verify payment permissions

As a **customer JWT** (not admin):

```sql
select public.current_user_can_pay_for_application('<payable_app_id>');
select public.current_user_can_pay_for_any_application();
```

Expect `true` when company `can_pay` is enabled. Admin → Companies → `canPay` toggles must match dealership intent.

### Verify role hardening

```sql
select proname from pg_proc where proname in ('is_admin', 'update_user_role_from_metadata');
-- Confirm is_admin does not read raw_user_meta_data for privilege
```

## 4. Storage

- [ ] Private bucket `documents` exists
- [ ] No open policy `USING (bucket_id = 'documents')` for all authenticated
- [ ] Test customer upload to `application-documents/{appId}/…` and admin read

## 5. SkipCash Edge Function secrets

Deploy functions: `skipcash-payment`, `skipcash-verify`, `skipcash-webhook`

| Secret | Prod value |
|--------|------------|
| `SKIPCASH_USE_SANDBOX` | `false` |
| `SKIPCASH_KEY_ID` | prod key id |
| `SKIPCASH_SECRET_KEY` | prod secret |
| `SKIPCASH_CLIENT_ID` | if required |
| `SKIPCASH_WEBHOOK_KEY` | prod webhook key |
| `SKIPCASH_PRODUCTION_URL` | `https://api.skipcash.app` (or vendor URL) |
| `SUPABASE_SERVICE_ROLE_KEY` | auto in hosted EF |

- [ ] SkipCash merchant webhook URL → `https://<project>.supabase.co/functions/v1/skipcash-webhook`
- [ ] Sandbox smoke then one small live payment

Or run workflow **Release Gate (Supabase)** with `confirm_migrations_applied=true`.

## 6. Frontend deploy gate

- [ ] After migrations + functions on **production** Supabase, set GitHub secret `BACKEND_GATE_CONFIRMED=true`
- [ ] Deploy production via `deploy.yml` (push `main` or dispatch)
- [ ] Smoke: `curl -fsS https://admin.blox.com/health` and customer → body contains `ok`
- [ ] Reset `BACKEND_GATE_CONFIRMED` to `false` after successful deploy

### Optional secrets for builds

- `PRODUCTION_VITE_SENTRY_DSN`, `STAGING_VITE_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`
- `VITE_CHATBOT_ENABLED` leave unset/`false` unless `VITE_BLOX_AI_URL` is a real non-localhost URL
- `VITE_PAYMENTS_ENABLED` — set `false` for emergency UI kill switch (card checkout)
- `VERCEL_SUPER_ADMIN_PROJECT_ID` — optional; when set, deploy.yml builds/deploys super-admin

### Key hygiene

- [ ] If anon keys were ever committed historically, rotate Supabase anon key and update GitHub secrets / local env
- [ ] Confirm tracked `.env.development` files only contain placeholders (gitignored going forward)

## 7. Legal

- [ ] Replace DRAFT Terms/Privacy pages (`/customer/legal/terms`, `/customer/legal/privacy`) with counsel-approved copy

## 8. Soft launch sequence

1. Staff-only admin accounts
2. Invite test customers (web)
3. Full C-suite money tests (card, partial, top-up without return, credits, bank)
4. Open web customers
5. Flutter store release (deep links verified on Android + iOS)

## 9. Emergency payment kill switch

Re-apply non-admin `RETURN FALSE` for `current_user_can_pay_*` (see `20250215200000_disable_company_payments.sql`) to stop new initiates. Reconcile in-flight gateway payments manually via SkipCash + `ops_*` views.

## 10. Reconciliation queries (service_role / SQL editor)

```sql
select * from public.ops_payments_stuck_pending limit 50;
select * from public.ops_payments_completed_not_applied limit 50;
select * from public.ops_credit_topups_missing_ledger limit 50;
```

Repair completed-not-applied by re-invoking `complete_skipcash_payment` with the stored ids (idempotent).

## Out of scope this cutover

- Qatar self-hosted Supabase (`infra/qatar-supabase`)
- Flutter bank-transfer parity (see `blox-app/docs/FLUTTER_LAUNCH_DEFERRED.md`)
- Counsel-final legal text (DRAFT pages ship until replaced)

See also: `docs/MANUAL_TEST_CHECKLIST.md`, `docs/REMEDIATION_STATUS.md`.
