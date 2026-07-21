# BLOX Critical Path — Manual Test Checklist

Map to production-readiness audit suites A–D.  
**Code-verified** = implemented in repo; **Staging required** = must run against live staging after migrations + Edge Functions.

| ID | Step | Status |
|----|------|--------|
| A1 | Customer signup + email verify | Staging required |
| A2 | Customer JWT cannot open `/admin` | Staging required (guards + DB role) |
| A3 | Admin login with DB role only (metadata fake admin denied) | Code-verified fail-closed; staging required |
| A4 | Password reset redirect allow-listed | Staging required (Auth URL config) |
| B1 | Create application + upload PDF/JPG ≤5MB | Staging required |
| B2 | Admin resubmission request | Staging required |
| B3 | Admin contract / approve & activate | Staging required |
| B4 | Admin create offer | Staging required |
| C1 | `current_user_can_pay_for_application` as customer = true | Staging required (after `20260720120000`) |
| C2 | Full installment card pay | Staging required (after EF redeploy) |
| C3 | Partial + verify/webhook race → paid once | Staging required (`complete_skipcash_payment`) |
| C4 | Credit top-up without app return | Staging required (webhook credits path) |
| C5 | Pay with credits double-click | Staging required (`FOR UPDATE`) |
| C6 | Bank transfer → admin confirm | Staging required (web only) |
| C7 | Gateway cancel/fail → no schedule credit | Staging required |
| C8 | Duplicate webhook → idempotent | Staging required (`ledger_applied_at`) |
| D1 | `/health` body contains `ok` | Code-verified static file; staging required after deploy |
| D2 | Migrations + functions before frontend | Ops — `OPS_CUTOVER.md` + release-gate |
| D3 | Sentry test error | Staging required (DSN secrets) |
| D4 | Chatbot off / no localhost | Code-verified default off |

## Soft-launch kill switches

| Switch | How |
|--------|-----|
| Card checkout UI/API client | `VITE_PAYMENTS_ENABLED=false` |
| Hard stop initiates | Re-apply disable `current_user_can_pay_*` SQL |
| Chatbot | `VITE_CHATBOT_ENABLED` unset/false |

## Flutter (post web launch)

| Step | Status |
|------|--------|
| Android `bloxcustomer://` return from SkipCash | Code-verified manifest + app_links; device test required |
| Apply without demo KYC | Code-verified (`REQUIRE_DEMO_KYC` default false) |
| Bank transfer on mobile | **Deferred** — web only for day 1 |
| MIME allow-list PDF/PNG/JPG | Code-verified |
