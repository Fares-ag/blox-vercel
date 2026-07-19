# Create admin account (placeholders only)

> **Never commit real passwords.** Use a strong password from a password manager.
> If a password was previously committed here, **force-reset it immediately** (see `OPS_SECRETS_ROTATION.md`).

## Account
- **Email**: `mafifi@q-auto.com` (example — change as needed)
- **Password**: `<REDACTED_PASSWORD>` — set only in Supabase Auth UI / secure channel

## Steps
1. Supabase Dashboard → Authentication → Users → Add user (email + password).
2. Ensure `public.users` row has `role = 'admin'` for that user id/email.
3. Sign in at `/admin/auth/login` and confirm access.
4. Discard any local notes that contain the real password.
