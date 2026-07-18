# SkipCash sandbox cutover

Before production traffic:

1. In Supabase → Project Settings → Edge Functions → Secrets, confirm `SKIPCASH_USE_SANDBOX` is exactly `false` (not unset, not `"true"`).
2. Confirm production `SKIPCASH_KEY_ID` / `SKIPCASH_SECRET_KEY` / `SKIPCASH_WEBHOOK_KEY` are set (rotate if they ever appeared in git).
3. Redeploy `skipcash-payment`, `skipcash-webhook` (`--no-verify-jwt`), and `skipcash-verify` after secret changes.
4. Smoke: one sandbox payment end-to-end, then one production test with a small amount if required by Ops.

Do not commit secret values to the repo.
