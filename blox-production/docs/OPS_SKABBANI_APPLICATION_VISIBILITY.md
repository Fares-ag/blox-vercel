# Ops: skabbani@q-auto.com application visibility

## Root cause (2026-07-19 live DB)

- User `skabbani@q-auto.com` exists (`public.users` + `auth.users`).
- Existing applications (not missing):
  - `application-8` — status **active**
  - `application-9` — status **active**
- Historically `has_blocking_application('skabbani@q-auto.com')` returned `application-9` (single-app gate).
- That gate was removed (2026-07-19): RPC always returns NULL; Customer create no longer blocks on existing apps.
- **No new application row** in the Jul 19 audit window meant create was **blocked**, not lost.

## How to see existing apps

1. **Admin** → Applications → search `skabbani` → tab **Active** or **All**.
2. **Customer** login as `skabbani@q-auto.com` (not `skabbani89@gmail.com`) → My Applications.

## Creating another application

- Customers may create additional applications at any time (pending/active/multiple OK).
- Admin Add Application still requires email and opens the new detail page.

## Recovery SQL (do not run unless Ops confirms)

Only if a row was wrongly saved under the **admin’s** email (none found in the Jul 19 audit):

```sql
-- Inspect first
SELECT id, customer_email, status, created_at
FROM applications
WHERE created_at > now() - interval '7 days'
ORDER BY created_at DESC;

-- Example re-own (ONLY after manual verification of id)
-- UPDATE applications
-- SET customer_email = 'skabbani@q-auto.com',
--     customer_info = jsonb_set(COALESCE(customer_info, '{}'::jsonb), '{email}', '"skabbani@q-auto.com"')
-- WHERE id = 'application-XX';
```
