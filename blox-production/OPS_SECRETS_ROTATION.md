# Ops: Rotate leaked credentials (required before production)

Credentials were previously committed in markdown/scripts. Treat them as compromised.

## SkipCash
1. SkipCash dashboard → rotate **Key Secret**, **Key ID**, and **Webhook Key** (and Client ID if exposed).
2. Supabase → Edge Functions → Secrets → update:
   - `SKIPCASH_CLIENT_ID`
   - `SKIPCASH_KEY_ID`
   - `SKIPCASH_SECRET_KEY`
   - `SKIPCASH_WEBHOOK_KEY`
   - `SKIPCASH_USE_SANDBOX` = `true` or `false` (**required explicitly**)
3. Redeploy: `skipcash-payment`, `skipcash-webhook`, `skipcash-verify`.
4. Smoke one sandbox payment end-to-end.

## Admin accounts
1. Force password reset for any account documented with a plaintext password (e.g. `mafifi@q-auto.com`).
2. Confirm old password no longer works.
3. Never store real passwords in git — use placeholders only.

## Git history
If these files were pushed to a remote, scrub history or rotate and accept that old commits still contain secrets until history rewrite.
