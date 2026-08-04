# Create admin / staff accounts (in-app)

Prefer **Admin → Users → Create user** or **Super-admin → Users → Create user**. That calls the `admin-create-user` edge function (email + password, auto-confirmed) and sets `public.users.role` / optional company.

## Roles

| Role | Portal |
|------|--------|
| `admin` | Admin |
| `super_admin` | Super-admin (only a super_admin may assign this) |
| `credit_officer` | Credit |
| `finance_officer` | Finance |
| `dealer_agent` | Dealer (set company on create or detail) |
| `customer` | Customer app / web |

## Fallback (Dashboard)

> **Never commit real passwords.** Use a strong password from a password manager.

## Account
- **Email**: `mafifi@q-auto.com` (example — change as needed)
- **Password**: `<REDACTED_PASSWORD>` — set only in Supabase Auth UI / secure channel

## Steps (Dashboard fallback)
1. Supabase Dashboard → Authentication → Users → Add user (email + password).
2. Ensure `public.users` row has `role = 'admin'` for that user id/email (or set role in Admin → Users detail).
3. Sign in at `/admin/auth/login` and confirm access.
4. Discard any local notes that contain the real password.

## Smoke

```bash
node scripts/qa-admin-create-user-smoke.mjs
```
