# Payment permissions — live state checklist

Repo contains both enabling and disabling SQL for customer payments:

| Script | Effect |
|--------|--------|
| `ADD_APPLICATION_PAYMENT_PERMISSIONS_RPC.sql` | `current_user_can_pay_for_application` / `current_user_can_pay_for_any_application` based on company `can_pay` |
| `supabase/migrations/20250215200000_disable_company_payments.sql` | Forces those RPCs to return **false** for non-admins |

## Before production cutover
1. In Supabase SQL, run:
   ```sql
   select proname from pg_proc where proname like 'current_user_can_pay%';
   ```
2. As a customer JWT, call the RPC for a known payable application — expect `true` if company `can_pay` is enabled.
3. If payments are unexpectedly blocked for all customers, the disable migration may still be live — re-apply the enable RPC definitions from `ADD_APPLICATION_PAYMENT_PERMISSIONS_RPC.sql` (or later successor).
4. Confirm Admin → Companies → `canPay` toggles match intended companies.
