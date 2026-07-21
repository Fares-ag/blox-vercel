# Production remediation status (Jul 2026)

Companion to the audit canvas and `OPS_CUTOVER.md`.

## Cleared in code (Phases 0–5 + follow-ups)

- Chatbot / payments env kill switches (web + Flutter `PAYMENTS_ENABLED`)
- JWT metadata role elevation removed (shared, admin, super-admin, customer, activity logs)
- Atomic `complete_skipcash_payment` + EF updates
- Pay RPC restore, credits locks, refunds ≠ completed
- RLS/storage/role-sync migrations versioned
- Terms/Privacy draft routes (apply links both); Payment History errors
- Deploy/staging/health/Sentry wiring; release gate; env placeholders
- `initFeatureFlags()` wired in customer/admin/super-admin
- Flutter deep links, KYC gate, MIME, CI, card kill switch
- Ops reconciliation views; manual test checklist
- Scripts: `scripts/deploy-skipcash-functions.{sh,ps1}`, `scripts/apply-remediation-migrations.md`

## Must do live (ops)

1. Apply migrations `20260720120000` … `20260720190000` (see `scripts/apply-remediation-migrations.md`)
2. Redeploy SkipCash functions via script or release-gate workflow
3. Auth redirect allow-list + SkipCash prod secrets
4. Run `docs/MANUAL_TEST_CHECKLIST.md` on staging
5. Set `BACKEND_GATE_CONFIRMED=true` only then deploy prod frontend
6. Replace DRAFT legal copy; rotate anon key if previously exposed

## Remaining product deferrals

- Flutter bank transfer
- Qatar self-host
- Remote/dynamic feature-flag service (env kill switches only today)
- Full refund clawback ledger (refund recorded; no reverse schedule automation)
- Flutter Crashlytics/Sentry (add before public store traffic)
