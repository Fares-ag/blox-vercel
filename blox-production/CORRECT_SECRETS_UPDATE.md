# Update Supabase SkipCash Secrets (placeholders only)

> **Security:** Never commit real SkipCash credentials. Values below are placeholders.
> If real secrets were ever committed, **rotate them immediately** in the SkipCash dashboard
> and update Supabase Edge Function secrets.

## Required Edge Function secrets

| Secret name | Example placeholder | Notes |
|---|---|---|
| `SKIPCASH_CLIENT_ID` | `<from-skipcash-dashboard>` | UUID from SkipCash |
| `SKIPCASH_KEY_ID` | `<from-skipcash-dashboard>` | UUID from SkipCash |
| `SKIPCASH_SECRET_KEY` | `<from-skipcash-dashboard>` | Long base64 key (~600+ chars) |
| `SKIPCASH_WEBHOOK_KEY` | `<from-skipcash-dashboard>` | Webhook signing key |
| `SKIPCASH_USE_SANDBOX` | `true` or `false` | **Must be set explicitly** |

## Steps

1. SkipCash Dashboard → copy credentials (do not paste into git).
2. Supabase → Project Settings → Edge Functions → Secrets.
3. Set each `SKIPCASH_*` value from the dashboard.
4. Redeploy `skipcash-payment`, `skipcash-webhook`, and `skipcash-verify`.
5. Smoke-test one sandbox payment end-to-end.

## Rotation checklist (if secrets leaked)

- [ ] Rotate Key Secret / Webhook Key in SkipCash
- [ ] Update Supabase secrets
- [ ] Confirm old keys no longer work
- [ ] Purge leaked values from git history if they were ever pushed
