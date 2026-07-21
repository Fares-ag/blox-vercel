# Apply Jul 2026 remediation migrations

Prefer linked project:

```bash
supabase link --project-ref <ref>
supabase db push
```

Or run these files in Supabase SQL Editor **in order**:

1. `supabase/migrations/20260720120000_restore_customer_payment_permissions.sql`
2. `supabase/migrations/20260720130000_complete_skipcash_payment_atomic.sql`
3. `supabase/migrations/20260720140000_pay_with_credits_locks.sql`
4. `supabase/migrations/20260720150000_harden_role_sync_no_metadata.sql`
5. `supabase/migrations/20260720160000_secure_rls_baseline.sql`
6. `supabase/migrations/20260720170000_storage_documents_policies.sql`
7. `supabase/migrations/20260720180000_storage_signed_contracts_receipts.sql`
8. `supabase/migrations/20260720190000_payment_reconciliation_views.sql`

Then:

```bash
./scripts/deploy-skipcash-functions.sh <ref>
# or
.\scripts\deploy-skipcash-functions.ps1 -ProjectRef <ref>
```

Verify (customer JWT):

```sql
select public.current_user_can_pay_for_application('<app_id>');
select public.complete_skipcash_payment is not null; -- function exists
```

Full checklist: `docs/OPS_CUTOVER.md`.
